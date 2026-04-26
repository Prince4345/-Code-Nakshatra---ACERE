import {
  CompanyProfile,
  DocumentRecord,
  PlotRecord,
  SessionUser,
  ShipmentRecord,
  Supplier,
  UserRole,
  VerificationCase,
} from '../types';

const isBrowser = typeof window !== 'undefined';

const SESSION_KEY = 'carbontrace_session';
const PROFILE_KEY = 'carbontrace_company_profile';
const SUPPLIERS_KEY = 'carbontrace_suppliers';
const PLOTS_KEY = 'carbontrace_plots';
const DOCUMENTS_KEY = 'carbontrace_documents';
const SHIPMENTS_KEY = 'carbontrace_shipments_v2';
const VERIFICATIONS_KEY = 'carbontrace_verifications';

const readValue = <T,>(key: string, fallback: T): T => {
  if (!isBrowser) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeValue = <T,>(key: string, value: T) => {
  if (!isBrowser) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const getSessionUser = () => readValue<SessionUser | null>(SESSION_KEY, null);

export const signInAsRole = (role: UserRole): SessionUser => {
  const user: SessionUser = {
    id: `user-${role}`,
    email: `${role}@carbontrace.ai`,
    name: role === 'exporter' ? 'Exporter User' : role === 'verifier' ? 'Verifier User' : 'Importer User',
    role,
  };

  writeValue(SESSION_KEY, user);
  return user;
};

export const signOut = () => {
  if (!isBrowser) return;
  window.localStorage.removeItem(SESSION_KEY);
};

export const getCompanyProfile = () => readValue<CompanyProfile | null>(PROFILE_KEY, null);

export const saveCompanyProfile = (profile: Omit<CompanyProfile, 'id' | 'updatedAt'>) => {
  const next: CompanyProfile = {
    id: 'company-profile',
    updatedAt: new Date().toISOString(),
    ...profile,
  };

  writeValue(PROFILE_KEY, next);
  return next;
};

export const getSuppliers = () => readValue<Supplier[]>(SUPPLIERS_KEY, []);

export const saveSupplier = (supplier: Omit<Supplier, 'id' | 'createdAt'> & { id?: string }) => {
  const current = getSuppliers();
  const next: Supplier = {
    id: supplier.id ?? crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name: supplier.name,
    type: supplier.type,
    commodity: supplier.commodity,
    country: supplier.country,
    region: supplier.region,
  };

  const updated = supplier.id
    ? current.map((item) => (item.id === supplier.id ? { ...item, ...next, createdAt: item.createdAt } : item))
    : [next, ...current];

  writeValue(SUPPLIERS_KEY, updated);
  return next;
};

export const getPlots = () => readValue<PlotRecord[]>(PLOTS_KEY, []);

export const savePlot = (plot: Omit<PlotRecord, 'id' | 'createdAt'> & { id?: string }) => {
  const current = getPlots();
  const next: PlotRecord = {
    id: plot.id ?? crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...plot,
  };

  const updated = plot.id
    ? current.map((item) => (item.id === plot.id ? { ...item, ...next, createdAt: item.createdAt } : item))
    : [next, ...current];

  writeValue(PLOTS_KEY, updated);
  return next;
};

export const updatePlotAnalysis = (plotId: string, analysis: PlotRecord['analysis']) => {
  const current = getPlots();
  const updated = current.map((item) => (item.id === plotId ? { ...item, analysis } : item));
  writeValue(PLOTS_KEY, updated);
};

export const getDocuments = () => readValue<DocumentRecord[]>(DOCUMENTS_KEY, []);

export const saveDocument = (document: Omit<DocumentRecord, 'id' | 'createdAt'>) => {
  const current = getDocuments();
  const next: DocumentRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...document,
  };

  writeValue(DOCUMENTS_KEY, [next, ...current]);
  return next;
};

export const getShipments = () => readValue<ShipmentRecord[]>(SHIPMENTS_KEY, []);

export const saveShipmentRecord = (shipment: Omit<ShipmentRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
  const current = getShipments();
  const now = new Date().toISOString();
  const next: ShipmentRecord = {
    id: shipment.id ?? crypto.randomUUID(),
    createdAt: shipment.id ? current.find((item) => item.id === shipment.id)?.createdAt ?? now : now,
    updatedAt: now,
    ...shipment,
  };

  const updated = shipment.id
    ? current.map((item) => (item.id === shipment.id ? next : item))
    : [next, ...current];

  writeValue(SHIPMENTS_KEY, updated);
  return next;
};

export const updateShipmentStatus = (shipmentId: string, status: ShipmentRecord['status']) => {
  const current = getShipments();
  const updated = current.map((item) =>
    item.id === shipmentId ? { ...item, status, updatedAt: new Date().toISOString() } : item,
  );
  writeValue(SHIPMENTS_KEY, updated);
};

export const getVerificationCases = () => readValue<VerificationCase[]>(VERIFICATIONS_KEY, []);

export const createOrUpdateVerificationCase = (shipmentId: string, reviewerNotes = '', decision: VerificationCase['decision'] = '') => {
  const current = getVerificationCases();
  const existing = current.find((item) => item.shipmentId === shipmentId);
  const next: VerificationCase = {
    id: existing?.id ?? crypto.randomUUID(),
    shipmentId,
    reviewerNotes,
    decision,
    updatedAt: new Date().toISOString(),
  };

  const updated = existing
    ? current.map((item) => (item.shipmentId === shipmentId ? next : item))
    : [next, ...current];

  writeValue(VERIFICATIONS_KEY, updated);
  return next;
};
