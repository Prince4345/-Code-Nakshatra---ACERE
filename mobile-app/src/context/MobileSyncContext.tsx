import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  MobileSyncQueueItem,
  MobileSyncState,
  QueuedDocumentUploadPayload,
  QueuedPlotSavePayload,
} from '../types';
import {
  discardSyncItem,
  enqueueDocumentUpload,
  enqueuePlotSave,
  getSyncStateSnapshot,
  initializeSyncQueue,
  processSyncQueue,
  retrySyncItem,
  subscribeToSyncState,
} from '../services/syncQueue';

type MobileSyncContextValue = MobileSyncState & {
  enqueueUpload: (payload: QueuedDocumentUploadPayload) => Promise<MobileSyncQueueItem>;
  enqueuePlot: (payload: QueuedPlotSavePayload) => Promise<MobileSyncQueueItem>;
  processNow: () => Promise<void>;
  retryItem: (id: string) => Promise<void>;
  discardItem: (id: string) => Promise<void>;
};

const MobileSyncContext = createContext<MobileSyncContextValue | null>(null);

export const MobileSyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<MobileSyncState>(getSyncStateSnapshot());

  useEffect(() => {
    void initializeSyncQueue();
    return subscribeToSyncState(setState);
  }, []);

  const value = useMemo<MobileSyncContextValue>(
    () => ({
      ...state,
      enqueueUpload: enqueueDocumentUpload,
      enqueuePlot: enqueuePlotSave,
      processNow: processSyncQueue,
      retryItem: retrySyncItem,
      discardItem: discardSyncItem,
    }),
    [state],
  );

  return <MobileSyncContext.Provider value={value}>{children}</MobileSyncContext.Provider>;
};

export const useMobileSync = () => {
  const value = useContext(MobileSyncContext);
  if (!value) throw new Error('useMobileSync must be used within MobileSyncProvider.');
  return value;
};
