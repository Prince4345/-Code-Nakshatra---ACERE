import { saveMonitoringEventToFirebase } from './firebaseData';
import { MonitoringSeverity } from '../types';

const MONITORING_QUEUE_KEY = 'carbontrace-web:monitoring-queue';

type PendingMonitoringEvent = {
  severity: MonitoringSeverity;
  source: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  createdAt: string;
};

const readQueue = (): PendingMonitoringEvent[] => {
  try {
    const raw = window.localStorage.getItem(MONITORING_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = (items: PendingMonitoringEvent[]) => {
  window.localStorage.setItem(MONITORING_QUEUE_KEY, JSON.stringify(items));
};

export const flushWebMonitoringQueue = async () => {
  const current = readQueue();
  if (!current.length) return;

  const remaining: PendingMonitoringEvent[] = [];
  for (const event of current) {
    try {
      await saveMonitoringEventToFirebase(event);
    } catch {
      remaining.push(event);
    }
  }
  writeQueue(remaining);
};

export const reportWebError = async ({
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
    await saveMonitoringEventToFirebase(payload);
  } catch {
    const current = readQueue();
    writeQueue([...current.slice(-24), payload]);
  }
};
