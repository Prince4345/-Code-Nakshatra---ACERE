import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Network from 'expo-network';
import {
  MobileSyncHistoryEntry,
  MobileSyncQueueItem,
  MobileSyncQueueItemStatus,
  MobileSyncState,
  QueuedDocumentUploadPayload,
  QueuedPlotSavePayload,
} from '../types';
import {
  saveMonitoringEventFromMobile,
  savePlotWorkflowFromMobile,
  uploadDocumentFromDevice,
} from './data';
import { sendLocalNotification } from './notifications';

const QUEUE_STORAGE_KEY = 'carbontrace-mobile:v1:sync-queue';
const QUEUE_HISTORY_STORAGE_KEY = 'carbontrace-mobile:v1:sync-history';
const UPLOAD_DIR = `${FileSystem.documentDirectory ?? ''}carbontrace-sync/`;

let initialized = false;
let networkSubscription: { remove: () => void } | null = null;

const listeners = new Set<(state: MobileSyncState) => void>();

let state: MobileSyncState = {
  online: true,
  processing: false,
  items: [],
  history: [],
};

const cloneState = (): MobileSyncState => ({
  ...state,
  items: state.items.map((item) => ({ ...item, payload: { ...item.payload } })),
  history: state.history.map((entry) => ({ ...entry })),
});

const emit = () => {
  const snapshot = cloneState();
  listeners.forEach((listener) => listener(snapshot));
};

const persist = async () => {
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(state.items));
  await AsyncStorage.setItem(QUEUE_HISTORY_STORAGE_KEY, JSON.stringify(state.history));
};

const setItemState = async (id: string, patch: Partial<MobileSyncQueueItem>) => {
  state.items = state.items.map((item) =>
    item.id === id
      ? {
          ...item,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
      : item,
  );
  await persist();
  emit();
};

const removeItem = async (id: string) => {
  state.items = state.items.filter((item) => item.id !== id);
  await persist();
  emit();
};

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, '-');

const queueItemTitle = (item: MobileSyncQueueItem) =>
  item.type === 'document-upload'
    ? (item.payload as QueuedDocumentUploadPayload).fileName
    : (item.payload as QueuedPlotSavePayload).name;

const appendHistoryEntry = async (entry: MobileSyncHistoryEntry) => {
  state.history = [entry, ...state.history].slice(0, 18);
  await persist();
  emit();
};

const ensureUploadDirectory = async () => {
  if (!FileSystem.documentDirectory) throw new Error('Device document directory is unavailable.');
  const info = await FileSystem.getInfoAsync(UPLOAD_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(UPLOAD_DIR, { intermediates: true });
  }
};

const persistUploadFile = async (fileUri: string, fileName: string) => {
  await ensureUploadDirectory();
  const nextUri = `${UPLOAD_DIR}${Date.now()}-${sanitizeFileName(fileName)}`;
  await FileSystem.copyAsync({ from: fileUri, to: nextUri });
  return nextUri;
};

const cleanupUploadFile = async (fileUri: string) => {
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch {
    // Best-effort cleanup.
  }
};

const readPersistedQueue = async () => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as MobileSyncQueueItem[];
    state.items = Array.isArray(parsed) ? parsed : [];
  } catch {
    state.items = [];
  }

  try {
    const raw = await AsyncStorage.getItem(QUEUE_HISTORY_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as MobileSyncHistoryEntry[];
    state.history = Array.isArray(parsed) ? parsed : [];
  } catch {
    state.history = [];
  }
};

const updateOnlineState = async (nextOnline: boolean) => {
  state.online = nextOnline;
  emit();
  if (nextOnline) {
    void processSyncQueue();
  }
};

const reportQueueError = async (source: string, error: unknown, context: Record<string, unknown>) => {
  try {
    await saveMonitoringEventFromMobile({
      severity: 'error',
      source,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
    });
  } catch {
    // Monitoring should never break product flows.
  }
};

const processDocumentUpload = async (item: MobileSyncQueueItem) => {
  const payload = item.payload as QueuedDocumentUploadPayload;
  await uploadDocumentFromDevice({
    ...payload,
    onProgress: (progress) => {
      void setItemState(item.id, { progress, status: 'processing' });
    },
  });
  await cleanupUploadFile(payload.fileUri);
};

const processPlotSave = async (item: MobileSyncQueueItem) => {
  const payload = item.payload as QueuedPlotSavePayload;
  await savePlotWorkflowFromMobile({
    ...payload,
    onProgress: (progress) => {
      void setItemState(item.id, { progress, status: 'processing' });
    },
  });
};

const processOne = async (item: MobileSyncQueueItem) => {
  if (item.type === 'document-upload') {
    await processDocumentUpload(item);
    return;
  }
  await processPlotSave(item);
};

export const initializeSyncQueue = async () => {
  if (initialized) return;
  initialized = true;

  await readPersistedQueue();

  const network = await Network.getNetworkStateAsync();
  state.online = Boolean(network.isConnected && network.isInternetReachable !== false);
  emit();

  networkSubscription = Network.addNetworkStateListener((event) => {
    void updateOnlineState(Boolean(event.isConnected && event.isInternetReachable !== false));
  });

  if (state.online && state.items.some((item) => item.status === 'queued')) {
    void processSyncQueue();
  }
};

export const subscribeToSyncState = (listener: (state: MobileSyncState) => void) => {
  listeners.add(listener);
  listener(cloneState());
  void initializeSyncQueue();

  return () => {
    listeners.delete(listener);
    if (!listeners.size && networkSubscription) {
      networkSubscription.remove();
      networkSubscription = null;
      initialized = false;
    }
  };
};

const appendItem = async (item: MobileSyncQueueItem) => {
  state.items = [...state.items, item];
  await persist();
  emit();
};

const createQueueItem = (
  type: MobileSyncQueueItem['type'],
  payload: MobileSyncQueueItem['payload'],
): MobileSyncQueueItem => ({
  id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  payload,
  status: 'queued',
  progress: 0,
  attempts: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const enqueueDocumentUpload = async (payload: QueuedDocumentUploadPayload) => {
  await initializeSyncQueue();
  const persistedFileUri = await persistUploadFile(payload.fileUri, payload.fileName);
  const item = createQueueItem('document-upload', {
    ...payload,
    fileUri: persistedFileUri,
  });
  await appendItem(item);
  if (state.online) void processSyncQueue();
  return item;
};

export const enqueuePlotSave = async (payload: QueuedPlotSavePayload) => {
  await initializeSyncQueue();
  const item = createQueueItem('plot-save', payload);
  await appendItem(item);
  if (state.online) void processSyncQueue();
  return item;
};

export const processSyncQueue = async () => {
  await initializeSyncQueue();
  if (state.processing || !state.online) return;

  const pendingItems = state.items.filter((item) => item.status === 'queued');
  if (!pendingItems.length) return;

  state.processing = true;
  emit();

  for (const item of pendingItems) {
    await setItemState(item.id, {
      status: 'processing',
      progress: 8,
      attempts: item.attempts + 1,
      lastError: undefined,
    });

    try {
      await processOne({ ...item, status: 'processing', attempts: item.attempts + 1 });
      state.lastCompletedAt = new Date().toISOString();
      await appendHistoryEntry({
        id: `${item.id}-done`,
        type: item.type,
        status: 'completed',
        title: queueItemTitle(item),
        description:
          item.type === 'document-upload'
            ? 'Evidence uploaded and added to the exporter library.'
            : 'Plot saved with mobile screening complete.',
        createdAt: state.lastCompletedAt,
      });
      await sendLocalNotification({
        title: item.type === 'document-upload' ? 'Upload complete' : 'Plot screening complete',
        body:
          item.type === 'document-upload'
            ? `${queueItemTitle(item)} is now available in evidence.`
            : `${queueItemTitle(item)} is saved and screened.`,
      });
      await removeItem(item.id);
    } catch (error) {
      await setItemState(item.id, {
        status: 'failed',
        progress: 0,
        lastError: error instanceof Error ? error.message : 'Sync action failed.',
      });
      await appendHistoryEntry({
        id: `${item.id}-failed-${Date.now()}`,
        type: item.type,
        status: 'failed',
        title: queueItemTitle(item),
        description: error instanceof Error ? error.message : 'Sync action failed.',
        createdAt: new Date().toISOString(),
      });
      await sendLocalNotification({
        title: 'Sync needs attention',
        body: `${queueItemTitle(item)} could not sync. Open the app to retry.`,
      });
      await reportQueueError('mobile-sync-queue', error, { queueItemId: item.id, type: item.type });
    }
  }

  state.processing = false;
  emit();
};

export const retrySyncItem = async (id: string) => {
  await initializeSyncQueue();
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;
  await setItemState(id, {
    status: 'queued' as MobileSyncQueueItemStatus,
    lastError: undefined,
    progress: 0,
  });
  if (state.online) void processSyncQueue();
};

export const discardSyncItem = async (id: string) => {
  await initializeSyncQueue();
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;
  if (item.type === 'document-upload') {
    await cleanupUploadFile((item.payload as QueuedDocumentUploadPayload).fileUri);
  }
  await appendHistoryEntry({
    id: `${item.id}-discarded-${Date.now()}`,
    type: item.type,
    status: 'discarded',
    title: queueItemTitle(item),
    description: 'Draft removed from the sync queue.',
    createdAt: new Date().toISOString(),
  });
  await removeItem(id);
};

export const getSyncStateSnapshot = () => cloneState();
