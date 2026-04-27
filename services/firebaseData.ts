import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import {
  AuditLogEntry,
  CompanyProfile,
  DocumentRecord,
  EmissionFactorRecord,
  ExtractionRecord,
  FacilityRecord,
  InstallationRecord,
  NotificationRecord,
  MonitoringEvent,
  PlotRecord,
  ProductionBatchRecord,
  SessionUser,
  ShipmentRecord,
  ShipmentSnapshot,
  Supplier,
  UserRole,
  VerificationCase,
} from '../types';
import { buildWorkspaceId } from './identity';

const DEFAULT_EMISSION_FACTORS: EmissionFactorRecord[] = [
  {
    id: 'diesel_litre',
    code: 'DIESEL_L',
    name: 'Diesel',
    category: 'fuel',
    unit: 'litre',
    factorKgCO2e: 2.68,
    source: 'Default operational factor',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'natural_gas_nm3',
    code: 'GAS_NM3',
    name: 'Natural Gas',
    category: 'fuel',
    unit: 'nm3',
    factorKgCO2e: 2.0,
    source: 'Default operational factor',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'coal_kg',
    code: 'COAL_KG',
    name: 'Coal',
    category: 'fuel',
    unit: 'kg',
    factorKgCO2e: 2.42,
    source: 'Default operational factor',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'india_grid_kwh',
    code: 'INDIA_GRID_KWH',
    name: 'India Grid Electricity',
    category: 'electricity',
    unit: 'kWh',
    factorKgCO2e: 0.708,
    source: 'India grid factor reference',
    updatedAt: new Date().toISOString(),
  },
];

const toIsoDateString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const timestampish = value as { toDate?: () => Date; seconds?: number; nanoseconds?: number };
    if (typeof timestampish.toDate === 'function') return timestampish.toDate().toISOString();
    if (typeof timestampish.seconds === 'number') {
      return new Date(
        timestampish.seconds * 1000 + Math.floor((timestampish.nanoseconds ?? 0) / 1_000_000),
      ).toISOString();
    }
  }
  return undefined;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
};

const normalizeRecordDates = <T extends Record<string, unknown>>(record: T): T => {
  const normalized = { ...record };

  (['createdAt', 'updatedAt', 'approvedAt', 'readAt'] as const).forEach((key) => {
    if (key in normalized) {
      const isoString = toIsoDateString(normalized[key]);
      if (isoString) normalized[key] = isoString as T[typeof key];
    }
  });

  if ('analysis' in normalized && normalized.analysis && typeof normalized.analysis === 'object') {
    const analysis = { ...(normalized.analysis as Record<string, unknown>) };
    const isoString = toIsoDateString(analysis.analysis_timestamp);
    if (isoString) {
      analysis.analysis_timestamp = isoString;
      normalized.analysis = analysis as T['analysis'];
    }
  }

  ([
    'supplierIds',
    'plotIds',
    'documentIds',
    'facilityIds',
    'installationIds',
    'batchIds',
  ] as const).forEach((key) => {
    if (key in normalized) {
      normalized[key] = normalizeStringArray(normalized[key]) as T[typeof key];
    }
  });

  if ('status' in normalized && typeof normalized.status !== 'string') {
    normalized.status = 'DRAFT' as T['status'];
  }

  return normalized;
};

const stripUndefinedValues = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(stripUndefinedValues) as T;
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, stripUndefinedValues(item)]),
  ) as T;
};

const sortByMostRecent = <T extends { updatedAt?: string; createdAt?: string }>(items: T[]) =>
  [...items].sort((left, right) => {
    const leftDate = toIsoDateString(left.updatedAt) ?? toIsoDateString(left.createdAt) ?? '';
    const rightDate = toIsoDateString(right.updatedAt) ?? toIsoDateString(right.createdAt) ?? '';
    return rightDate.localeCompare(leftDate);
  });

const hydrateUser = async (user: User): Promise<SessionUser> => {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const data = snap.data() as { name?: string; role?: UserRole; workspaceId?: string } | undefined;
  const role = data?.role ?? 'exporter';

  return {
    id: user.uid,
    email: user.email ?? '',
    name: data?.name ?? user.displayName ?? 'CarbonTrace User',
    role,
    workspaceId: data?.workspaceId ?? buildWorkspaceId(role, user.uid),
  };
};

const getCurrentSessionUser = async (): Promise<SessionUser | null> => {
  const current = auth.currentUser;
  if (!current) return null;
  return hydrateUser(current);
};

const fetchOwnedCollection = async <T>(collectionName: string, ownerId: string): Promise<T[]> => {
  const snap = await getDocs(query(collection(db, collectionName), where('ownerId', '==', ownerId)));
  return sortByMostRecent(
    snap.docs.map((item) => normalizeRecordDates({ id: item.id, ...item.data() } as T & { id: string })),
  ) as T[];
};

const fetchAllCollection = async <T>(collectionName: string): Promise<T[]> => {
  const snap = await getDocs(collection(db, collectionName));
  return sortByMostRecent(
    snap.docs.map((item) => normalizeRecordDates({ id: item.id, ...item.data() } as T & { id: string })),
  ) as T[];
};

const fetchMaybeFilteredCollection = async <T>(collectionName: string, field?: string, value?: string): Promise<T[]> => {
  if (!field || !value) return fetchAllCollection<T>(collectionName);
  const snap = await getDocs(query(collection(db, collectionName), where(field, '==', value)));
  return sortByMostRecent(
    snap.docs.map((item) => normalizeRecordDates({ id: item.id, ...item.data() } as T & { id: string })),
  ) as T[];
};

export const subscribeToSession = (onChange: (user: SessionUser | null) => void) =>
  onAuthStateChanged(auth, async (user) => {
    if (!user) return onChange(null);
    onChange(await hydrateUser(user));
  });

export const loginWithEmail = async (email: string, password: string) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return hydrateUser(credential.user);
};

export const loginWithMobileSessionToken = async (token: string) => {
  const credential = await signInWithCustomToken(auth, token);
  return hydrateUser(credential.user);
};

export const resetPasswordWithEmail = async (email: string) => {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) throw new Error('Work email is required.');

  const actionSettings =
    typeof window !== 'undefined'
      ? {
          url: `${window.location.origin}/login`,
          handleCodeInApp: false,
        }
      : undefined;

  await sendPasswordResetEmail(auth, trimmedEmail, actionSettings);
};

export const signupWithEmail = async (email: string, password: string, role: UserRole, name: string) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', credential.user.uid), {
    name,
    role,
    email,
    workspaceId: buildWorkspaceId(role, credential.user.uid),
    createdAt: new Date().toISOString(),
  });
  return hydrateUser(credential.user);
};

export const logoutUser = () => firebaseSignOut(auth);

export const fetchAllUsers = async () => fetchAllCollection<SessionUser>('users');

export const fetchCompanyProfile = async (ownerId: string) => {
  const snap = await getDoc(doc(db, 'companyProfiles', ownerId));
  return snap.exists() ? (normalizeRecordDates({ id: snap.id, ...snap.data() } as CompanyProfile) as CompanyProfile) : null;
};

export const fetchAllCompanyProfiles = async () => fetchAllCollection<CompanyProfile>('companyProfiles');

export const saveCompanyProfileToFirebase = async (ownerId: string, profile: Omit<CompanyProfile, 'id' | 'updatedAt'>) => {
  await setDoc(doc(db, 'companyProfiles', ownerId), { ...profile, ownerId, updatedAt: new Date().toISOString() });
  return fetchCompanyProfile(ownerId);
};

export const fetchSuppliers = async (ownerId: string) => fetchOwnedCollection<Supplier>('suppliers', ownerId);
export const fetchAllSuppliers = async () => fetchAllCollection<Supplier>('suppliers');

export const saveSupplierToFirebase = async (ownerId: string, supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => {
  const supplierRef = await addDoc(collection(db, 'suppliers'), { ...supplier, ownerId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  return supplierRef.id;
};

export const updateSupplierInFirebase = async (supplierId: string, supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => {
  await updateDoc(doc(db, 'suppliers', supplierId), {
    ...supplier,
    updatedAt: new Date().toISOString(),
  });
};

export const fetchPlots = async (ownerId: string) => fetchOwnedCollection<PlotRecord>('plots', ownerId);
export const fetchAllPlots = async () => fetchAllCollection<PlotRecord>('plots');

export const savePlotToFirebase = async (ownerId: string, plot: Omit<PlotRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  const plotRef = await addDoc(collection(db, 'plots'), { ...plot, ownerId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  return plotRef.id;
};

export const updatePlotInFirebase = async (plotId: string, plot: Omit<PlotRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  await updateDoc(doc(db, 'plots', plotId), {
    ...plot,
    updatedAt: new Date().toISOString(),
  });
};

export const updatePlotAnalysisInFirebase = async (plotId: string, analysis: PlotRecord['analysis']) => {
  await updateDoc(doc(db, 'plots', plotId), { analysis, updatedAt: new Date().toISOString() });
};

export const fetchDocuments = async (ownerId: string) => fetchOwnedCollection<DocumentRecord>('documents', ownerId);
export const fetchAllDocuments = async () => fetchAllCollection<DocumentRecord>('documents');

export const uploadDocumentToFirebase = async (ownerId: string, file: File | null, documentType: string, notes: string) => {
  let fileName = 'manual-note.txt';
  let previewUrl = '';

  if (file) {
    const storageRef = ref(storage, `documents/${ownerId}/${Date.now()}-${file.name}`);
    await uploadBytes(storageRef, file);
    previewUrl = await getDownloadURL(storageRef);
    fileName = file.name;
  }

  const documentRef = await addDoc(collection(db, 'documents'), {
    ownerId,
    fileName,
    documentType,
    notes,
    linkedShipmentId: '',
    linkedFacilityId: '',
    linkedBatchId: '',
    previewUrl,
    ocrStatus: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return documentRef.id;
};

export const saveDocumentRecordToFirebase = async (
  ownerId: string,
  document: Omit<DocumentRecord, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  const documentRef = await addDoc(collection(db, 'documents'), {
    ...document,
    ownerId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return documentRef.id;
};

export const updateDocumentInFirebase = async (documentId: string, payload: Partial<DocumentRecord>) => {
  await updateDoc(doc(db, 'documents', documentId), { ...payload, updatedAt: new Date().toISOString() });
};

export const fetchShipments = async (ownerId?: string, status?: ShipmentRecord['status']) => {
  let shipments = ownerId
    ? await fetchOwnedCollection<ShipmentRecord>('shipments', ownerId)
    : await fetchAllCollection<ShipmentRecord>('shipments');
  if (status) shipments = shipments.filter((item) => item.status === status);
  return sortByMostRecent(shipments);
};

export const fetchAllShipments = async () => fetchShipments();

export const fetchShipmentSnapshots = async (ownerId?: string) =>
  ownerId
    ? fetchOwnedCollection<ShipmentSnapshot>('shipmentSnapshots', ownerId)
    : fetchAllCollection<ShipmentSnapshot>('shipmentSnapshots');

export const saveShipmentToFirebase = async (ownerId: string, shipment: Omit<ShipmentRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  const shipmentRef = await addDoc(collection(db, 'shipments'), {
    ...shipment,
    ownerId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return shipmentRef.id;
};

export const updateShipmentInFirebase = async (shipmentId: string, shipment: Omit<ShipmentRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  await updateDoc(doc(db, 'shipments', shipmentId), {
    ...shipment,
    updatedAt: new Date().toISOString(),
  });
};

export const updateShipmentStatusInFirebase = async (shipmentId: string, status: ShipmentRecord['status']) => {
  await updateDoc(doc(db, 'shipments', shipmentId), { status, updatedAt: new Date().toISOString() });
};

export const attachReportToShipment = async (shipmentId: string, report: ShipmentRecord['report']) => {
  await updateDoc(doc(db, 'shipments', shipmentId), { report, updatedAt: new Date().toISOString() });
};

export const createShipmentSnapshotInFirebase = async (
  payload: Omit<ShipmentSnapshot, 'id' | 'createdAt' | 'version'>,
) => {
  const existing = await getDocs(query(collection(db, 'shipmentSnapshots'), where('shipmentId', '==', payload.shipmentId)));
  const nextVersion =
    existing.docs.reduce((max, item) => {
      const currentVersion = Number(item.data().version ?? 0);
      return currentVersion > max ? currentVersion : max;
    }, 0) + 1;

  const snapshotRef = await addDoc(collection(db, 'shipmentSnapshots'), {
    ...payload,
    version: nextVersion,
    createdAt: new Date().toISOString(),
  });

  return { id: snapshotRef.id, ...payload, version: nextVersion } as ShipmentSnapshot;
};

export const fetchVerificationCases = async () => fetchAllCollection<VerificationCase>('verificationCases');

export const upsertVerificationCase = async (
  shipmentId: string,
  reviewerNotes = '',
  decision: VerificationCase['decision'] = '',
  routing: Pick<VerificationCase, 'verifierId' | 'verifierName' | 'importerId' | 'importerName'> = {},
) => {
  const existing = await getDocs(query(collection(db, 'verificationCases'), where('shipmentId', '==', shipmentId)));
  if (existing.empty) {
    await addDoc(collection(db, 'verificationCases'), stripUndefinedValues({
      shipmentId,
      ...routing,
      reviewerNotes,
      decision,
      updatedAt: new Date().toISOString(),
    }));
    return;
  }

  await updateDoc(doc(db, 'verificationCases', existing.docs[0].id), stripUndefinedValues({
    ...routing,
    reviewerNotes,
    decision,
    updatedAt: new Date().toISOString(),
  }));
};

export const fetchFacilities = async (ownerId: string) => fetchOwnedCollection<FacilityRecord>('facilities', ownerId);
export const fetchAllFacilities = async () => fetchAllCollection<FacilityRecord>('facilities');

export const saveFacilityToFirebase = async (ownerId: string, facility: Omit<FacilityRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  const facilityRef = await addDoc(collection(db, 'facilities'), {
    ...facility,
    ownerId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return facilityRef.id;
};

export const updateFacilityInFirebase = async (facilityId: string, facility: Omit<FacilityRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  await updateDoc(doc(db, 'facilities', facilityId), {
    ...facility,
    updatedAt: new Date().toISOString(),
  });
};

export const fetchInstallations = async (ownerId: string) => fetchOwnedCollection<InstallationRecord>('installations', ownerId);
export const fetchAllInstallations = async () => fetchAllCollection<InstallationRecord>('installations');

export const saveInstallationToFirebase = async (ownerId: string, installation: Omit<InstallationRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  const installationRef = await addDoc(collection(db, 'installations'), {
    ...installation,
    ownerId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return installationRef.id;
};

export const updateInstallationInFirebase = async (installationId: string, installation: Omit<InstallationRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  await updateDoc(doc(db, 'installations', installationId), {
    ...installation,
    updatedAt: new Date().toISOString(),
  });
};

export const fetchProductionBatches = async (ownerId: string) => fetchOwnedCollection<ProductionBatchRecord>('productionBatches', ownerId);
export const fetchAllProductionBatches = async () => fetchAllCollection<ProductionBatchRecord>('productionBatches');

export const saveProductionBatchToFirebase = async (ownerId: string, batch: Omit<ProductionBatchRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  const batchRef = await addDoc(collection(db, 'productionBatches'), {
    ...batch,
    ownerId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return batchRef.id;
};

export const updateProductionBatchInFirebase = async (batchId: string, batch: Omit<ProductionBatchRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  await updateDoc(doc(db, 'productionBatches', batchId), {
    ...batch,
    updatedAt: new Date().toISOString(),
  });
};

export const fetchExtractionRecords = async (ownerId: string) => fetchOwnedCollection<ExtractionRecord>('extractions', ownerId);
export const fetchAllExtractionRecords = async () => fetchAllCollection<ExtractionRecord>('extractions');

export const upsertExtractionRecord = async (
  ownerId: string,
  documentId: string,
  payload: Omit<ExtractionRecord, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>,
) => {
  const existing = await getDocs(
    query(
      collection(db, 'extractions'),
      where('ownerId', '==', ownerId),
      where('documentId', '==', documentId),
    ),
  );
  const safePayload = stripUndefinedValues(payload);
  if (existing.empty) {
    await addDoc(collection(db, 'extractions'), {
      ownerId,
      documentId,
      ...safePayload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  await updateDoc(doc(db, 'extractions', existing.docs[0].id), {
    ...safePayload,
    updatedAt: new Date().toISOString(),
  });
};

export const fetchAuditLogs = async (ownerId?: string) =>
  ownerId ? fetchMaybeFilteredCollection<AuditLogEntry>('auditLogs', 'ownerId', ownerId) : fetchAllCollection<AuditLogEntry>('auditLogs');

export const saveAuditLog = async (ownerId: string, entry: Omit<AuditLogEntry, 'id' | 'createdAt'>) => {
  await addDoc(collection(db, 'auditLogs'), {
    ...entry,
    ownerId,
    createdAt: new Date().toISOString(),
  });
};

export const fetchNotificationsForSession = async (userId: string, role: UserRole) => {
  const [userNotifications, roleNotifications] = await Promise.all([
    getDocs(query(collection(db, 'notifications'), where('recipientUserId', '==', userId))),
    getDocs(query(collection(db, 'notifications'), where('recipientRole', '==', role))),
  ]);

  const merged = new Map<string, NotificationRecord>();
  [...userNotifications.docs, ...roleNotifications.docs].forEach((item) => {
    merged.set(item.id, normalizeRecordDates({ id: item.id, ...item.data() } as NotificationRecord));
  });

  return sortByMostRecent(Array.from(merged.values()));
};

export const saveNotificationToFirebase = async (
  notification: Omit<NotificationRecord, 'id' | 'createdAt' | 'read'> & {
    createdAt?: string;
    read?: boolean;
  },
) => {
  const actor = await getCurrentSessionUser();
  await addDoc(collection(db, 'notifications'), stripUndefinedValues({
    ...notification,
    actorId: actor?.id ?? notification.actorId ?? '',
    actorRole: actor?.role ?? notification.actorRole ?? 'exporter',
    actorName: notification.actorName ?? actor?.name ?? 'CarbonTrace AI',
    createdAt: notification.createdAt ?? new Date().toISOString(),
    read: notification.read ?? false,
  }));
};

export const markNotificationReadInFirebase = async (notificationId: string, read = true) => {
  await updateDoc(doc(db, 'notifications', notificationId), {
    read,
    readAt: read ? new Date().toISOString() : null,
  });
};

export const saveMonitoringEventToFirebase = async (
  event: Omit<MonitoringEvent, 'id' | 'createdAt'> & { createdAt?: string },
) => {
  const actor = await getCurrentSessionUser();
  await addDoc(collection(db, 'monitoringEvents'), {
    ...event,
    actorId: actor?.id ?? event.actorId ?? '',
    actorRole: actor?.role ?? event.actorRole ?? 'exporter',
    actorName: actor?.name ?? event.actorName ?? 'CarbonTrace Web',
    createdAt: event.createdAt ?? new Date().toISOString(),
  });
};

export const fetchEmissionFactors = async () => {
  const current = await fetchAllCollection<EmissionFactorRecord>('emissionFactors');
  if (current.length) return current;

  await Promise.all(
    DEFAULT_EMISSION_FACTORS.map((factor) =>
      setDoc(doc(db, 'emissionFactors', factor.id), factor),
    ),
  );

  return fetchAllCollection<EmissionFactorRecord>('emissionFactors');
};

export const updateEmissionFactorInFirebase = async (factorId: string, payload: Omit<EmissionFactorRecord, 'id'>) => {
  await setDoc(doc(db, 'emissionFactors', factorId), payload);
};
