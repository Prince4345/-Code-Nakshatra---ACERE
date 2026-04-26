import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveMonitoringEventFromMobile } from './data';
import { MonitoringSeverity } from '../types';

const MONITORING_QUEUE_KEY = 'carbontrace-mobile:v1:monitoring-queue';

type PendingMonitoringEvent = {
  severity: MonitoringSeverity;
  source: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  createdAt: string;
};

let initialized = false;

const readQueue = async (): Promise<PendingMonitoringEvent[]> => {
  try {
    const raw = await AsyncStorage.getItem(MONITORING_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = async (items: PendingMonitoringEvent[]) => {
  await AsyncStorage.setItem(MONITORING_QUEUE_KEY, JSON.stringify(items));
};

const queueMonitoringEvent = async (event: PendingMonitoringEvent) => {
  const current = await readQueue();
  await writeQueue([...current.slice(-24), event]);
};

export const flushMobileMonitoringQueue = async () => {
  const current = await readQueue();
  if (!current.length) return;

  const remaining: PendingMonitoringEvent[] = [];

  for (const event of current) {
    try {
      await saveMonitoringEventFromMobile(event);
    } catch {
      remaining.push(event);
    }
  }

  await writeQueue(remaining);
};

export const reportMobileError = async ({
  source,
  error,
  context,
  severity = 'error',
}: {
  source: string;
  error: unknown;
  context?: Record<string, unknown>;
  severity?: MonitoringSeverity;
}) => {
  const payload: PendingMonitoringEvent = {
    source,
    severity,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    createdAt: new Date().toISOString(),
  };

  try {
    await saveMonitoringEventFromMobile(payload);
  } catch {
    await queueMonitoringEvent(payload);
  }
};

export const initializeMobileMonitoring = () => {
  if (initialized) return;
  initialized = true;

  void flushMobileMonitoringQueue();

  const maybeErrorUtils = (globalThis as unknown as {
    ErrorUtils?: {
      getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
      setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
    };
  }).ErrorUtils;

  const previousHandler = maybeErrorUtils?.getGlobalHandler?.();

  maybeErrorUtils?.setGlobalHandler?.((error, isFatal) => {
    void reportMobileError({
      source: 'global-error-handler',
      error,
      severity: isFatal ? 'fatal' : 'error',
    });
    previousHandler?.(error, isFatal);
  });
};
