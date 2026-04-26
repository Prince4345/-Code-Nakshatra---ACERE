import { ComplianceReport } from '../types';

const SHIPMENTS_KEY = 'aerce_shipments';
const AUDIT_LOGS_KEY = 'aerce_audit_logs';

type StoredShipment = {
  id: string;
  timestamp: string;
  complianceReport: ComplianceReport;
} & Record<string, unknown>;

const isBrowser = typeof window !== 'undefined';

const readCollection = <T,>(key: string): T[] => {
  if (!isBrowser) return [];

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch (error) {
    console.error(`Failed to read local collection: ${key}`, error);
    return [];
  }
};

const writeCollection = <T,>(key: string, value: T[]) => {
  if (!isBrowser) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to write local collection: ${key}`, error);
  }
};

export const saveShipment = async (data: Record<string, unknown>, report: ComplianceReport) => {
  const shipments = readCollection<StoredShipment>(SHIPMENTS_KEY);
  const id = crypto.randomUUID();

  shipments.unshift({
    id,
    ...data,
    complianceReport: report,
    timestamp: new Date().toISOString(),
  });

  writeCollection(SHIPMENTS_KEY, shipments);
  return id;
};

export const saveAuditLog = async (entry: any) => {
  const logs = readCollection<Record<string, unknown>>(AUDIT_LOGS_KEY);
  const normalized = {
    ...entry,
    id: String(entry.id ?? crypto.randomUUID()),
    timestamp: new Date().toISOString(),
  };

  logs.unshift(normalized);
  writeCollection(AUDIT_LOGS_KEY, logs);
  return normalized.id;
};

export const fetchAuditLogs = async () => {
  return readCollection<Record<string, unknown>>(AUDIT_LOGS_KEY);
};
