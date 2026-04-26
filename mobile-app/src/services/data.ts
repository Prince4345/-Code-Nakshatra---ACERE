import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import {
  CompanyProfile,
  CoordinatePoint,
  DocumentRecord,
  ExtractionRecord,
  ExporterBundle,
  ImporterBundle,
  NotificationRecord,
  PlotRecord,
  SessionUser,
  ShipmentRecord,
  Supplier,
  UserRole,
  VerificationCase,
  VerifierBundle,
  MonitoringEvent,
} from '../types';

const CACHE_VERSION = 'v1';
const API_BASE = 'https://carbontrace-gee-backend-450480666281.asia-south1.run.app';
const EUDR_REQUEST_TIMEOUT_MS = 18_000;

type CachedBundle<T> = {
  cachedAt: string;
  data: T;
};

const toIsoDateString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const timestampish = value as { toDate?: () => Date; seconds?: number; nanoseconds?: number };
    if (typeof timestampish.toDate === 'function') return timestampish.toDate().toISOString();
    if (typeof timestampish.seconds === 'number') {
      return new Date(timestampish.seconds * 1000 + Math.floor((timestampish.nanoseconds ?? 0) / 1_000_000)).toISOString();
    }
  }
  return undefined;
};

const normalizeRecordDates = <T>(record: T): T => {
  const normalized = { ...(record as Record<string, unknown>) };

  (['createdAt', 'updatedAt', 'approvedAt', 'readAt'] as const).forEach((key) => {
    if (key in normalized) {
      const isoString = toIsoDateString(normalized[key]);
      if (isoString) normalized[key] = isoString;
    }
  });

  if ('analysis' in normalized && normalized.analysis && typeof normalized.analysis === 'object') {
    const analysis = { ...(normalized.analysis as Record<string, unknown>) };
    const isoString = toIsoDateString(analysis.analysis_timestamp);
    if (isoString) {
      analysis.analysis_timestamp = isoString;
      normalized.analysis = analysis;
    }
  }

  return normalized as T;
};

const sortByMostRecent = <T extends { updatedAt?: unknown; createdAt?: unknown }>(items: T[]) =>
  [...items].sort((left, right) => {
    const leftDate = toIsoDateString(left.updatedAt) ?? toIsoDateString(left.createdAt) ?? '';
    const rightDate = toIsoDateString(right.updatedAt) ?? toIsoDateString(right.createdAt) ?? '';
    return rightDate.localeCompare(leftDate);
  });

const cacheKey = (scope: string, id: string) => `carbontrace-mobile:${CACHE_VERSION}:${scope}:${id}`;

const readCache = async <T>(scope: string, id: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(scope, id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedBundle<T>;
    return parsed.data ?? null;
  } catch {
    return null;
  }
};

const writeCache = async <T>(scope: string, id: string, data: T) => {
  try {
    const payload: CachedBundle<T> = {
      cachedAt: new Date().toISOString(),
      data,
    };
    await AsyncStorage.setItem(cacheKey(scope, id), JSON.stringify(payload));
  } catch {
    // noop: cache is best-effort
  }
};

const fetchOwnedCollection = async <T extends { updatedAt?: unknown; createdAt?: unknown }>(collectionName: string, ownerId: string): Promise<T[]> => {
  const snap = await getDocs(query(collection(db, collectionName), where('ownerId', '==', ownerId)));
  return sortByMostRecent(
    snap.docs.map((item) => normalizeRecordDates({ id: item.id, ...item.data() } as unknown as T)),
  ) as T[];
};

const fetchAllCollection = async <T extends { updatedAt?: unknown; createdAt?: unknown }>(collectionName: string): Promise<T[]> => {
  const snap = await getDocs(collection(db, collectionName));
  return sortByMostRecent(
    snap.docs.map((item) => normalizeRecordDates({ id: item.id, ...item.data() } as unknown as T)),
  ) as T[];
};

const fetchNotificationsForSession = async (userId: string, role: UserRole) => {
  const [userNotifications, roleNotifications] = await Promise.all([
    getDocs(query(collection(db, 'notifications'), where('recipientUserId', '==', userId))),
    getDocs(query(collection(db, 'notifications'), where('recipientRole', '==', role))),
  ]);

  const merged = new Map<string, NotificationRecord>();
  [...userNotifications.docs, ...roleNotifications.docs].forEach((item) => {
    merged.set(item.id, normalizeRecordDates({ id: item.id, ...item.data() } as unknown as NotificationRecord));
  });

  return sortByMostRecent(Array.from(merged.values()));
};

const hydrateUser = async (user: User): Promise<SessionUser> => {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const data = snap.data() as { name?: string; role?: UserRole } | undefined;

  return {
    id: user.uid,
    email: user.email ?? '',
    name: data?.name ?? user.displayName ?? 'CarbonTrace User',
    role: data?.role ?? 'exporter',
  };
};

const getCurrentSessionUser = async (): Promise<SessionUser | null> => {
  const current = auth.currentUser;
  if (!current) return null;
  return hydrateUser(current);
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

export const signupWithEmail = async (email: string, password: string, role: UserRole, name: string) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', credential.user.uid), {
    name,
    role,
    email,
    createdAt: new Date().toISOString(),
  });
  return hydrateUser(credential.user);
};

export const logoutUser = () => firebaseSignOut(auth);

export const updateMobileDeviceProfile = async (
  userId: string,
  payload: Record<string, unknown>,
) => {
  const userRef = doc(db, 'users', userId);
  const nextPayload = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  const existing = await getDoc(userRef);
  if (existing.exists()) {
    await updateDoc(userRef, nextPayload);
    return;
  }

  const authUser = auth.currentUser;
  await setDoc(userRef, {
    name: authUser?.displayName ?? 'CarbonTrace User',
    role: 'exporter',
    email: authUser?.email ?? '',
    createdAt: new Date().toISOString(),
    ...nextPayload,
  });
};

export const fetchCompanyProfile = async (ownerId: string) => {
  const snap = await getDoc(doc(db, 'companyProfiles', ownerId));
  return snap.exists() ? (normalizeRecordDates({ id: snap.id, ...snap.data() } as unknown as CompanyProfile) as CompanyProfile) : null;
};

export const fetchExporterBundle = async (ownerId: string, role: UserRole): Promise<ExporterBundle> => {
  const [profile, suppliers, plots, shipments, documents, extractions, notifications] = await Promise.all([
    fetchCompanyProfile(ownerId),
    fetchOwnedCollection<Supplier>('suppliers', ownerId),
    fetchOwnedCollection<PlotRecord>('plots', ownerId),
    fetchOwnedCollection<ShipmentRecord>('shipments', ownerId),
    fetchOwnedCollection<DocumentRecord>('documents', ownerId),
    fetchOwnedCollection<ExtractionRecord>('extractions', ownerId),
    fetchNotificationsForSession(ownerId, role),
  ]);

  const bundle = { profile, suppliers, plots, shipments, documents, extractions, notifications };
  await writeCache('exporter', ownerId, bundle);
  return bundle;
};

export const fetchVerifierBundle = async (userId: string, role: UserRole): Promise<VerifierBundle> => {
  const [shipments, cases, companyProfiles, plots, documents, extractions, notifications] = await Promise.all([
    fetchAllCollection<ShipmentRecord>('shipments'),
    fetchAllCollection<VerificationCase>('verificationCases'),
    fetchAllCollection<CompanyProfile>('companyProfiles'),
    fetchAllCollection<PlotRecord>('plots'),
    fetchAllCollection<DocumentRecord>('documents'),
    fetchAllCollection<ExtractionRecord>('extractions'),
    fetchNotificationsForSession(userId, role),
  ]);

  const bundle = {
    shipments: shipments.filter((item) => item.status !== 'DRAFT'),
    cases,
    companyProfiles,
    plots,
    documents,
    extractions,
    notifications,
  };
  await writeCache('verifier', userId, bundle);
  return bundle;
};

export const fetchImporterBundle = async (userId: string, role: UserRole): Promise<ImporterBundle> => {
  const [shipments, companyProfiles, plots, documents, extractions, notifications] = await Promise.all([
    fetchAllCollection<ShipmentRecord>('shipments'),
    fetchAllCollection<CompanyProfile>('companyProfiles'),
    fetchAllCollection<PlotRecord>('plots'),
    fetchAllCollection<DocumentRecord>('documents'),
    fetchAllCollection<ExtractionRecord>('extractions'),
    fetchNotificationsForSession(userId, role),
  ]);

  const bundle = {
    shipments: shipments.filter((item) => item.status === 'APPROVED'),
    companyProfiles,
    plots,
    documents,
    extractions,
    notifications,
  };
  await writeCache('importer', userId, bundle);
  return bundle;
};

export const getCachedExporterBundle = (ownerId: string) => readCache<ExporterBundle>('exporter', ownerId);
export const getCachedVerifierBundle = (userId: string) => readCache<VerifierBundle>('verifier', userId);
export const getCachedImporterBundle = (userId: string) => readCache<ImporterBundle>('importer', userId);

const blobFromUri = async (uri: string): Promise<Blob> => {
  const response = await fetch(uri);
  return response.blob();
};

export const uploadDocumentFromDevice = async ({
  ownerId,
  fileUri,
  fileName,
  mimeType,
  documentType,
  notes,
  onProgress,
}: {
  ownerId: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
  documentType: string;
  notes: string;
  onProgress?: (progress: number) => void;
}) => {
  const fileBlob = await blobFromUri(fileUri);
  const storageRef = ref(storage, `documents/${ownerId}/${Date.now()}-${fileName}`);
  const uploadTask = uploadBytesResumable(storageRef, fileBlob, { contentType: mimeType });
  await new Promise<void>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (!onProgress) return;
        const progress = snapshot.totalBytes
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
        onProgress(progress);
      },
      reject,
      () => resolve(),
    );
  });
  const previewUrl = await getDownloadURL(storageRef);

  await addDoc(collection(db, 'documents'), {
    ownerId,
    fileName,
    documentType,
    notes,
    linkedShipmentId: '',
    previewUrl,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
};

const centroid = (geometry: number[][]) => {
  if (!geometry.length) return { lat: 0, lng: 0 };
  const totals = geometry.reduce(
    (acc, [lng, lat]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
    { lat: 0, lng: 0 },
  );
  return {
    lat: totals.lat / geometry.length,
    lng: totals.lng / geometry.length,
  };
};

const offlineAssessment = (geometry: number[][], areaHectares: string) => {
  const area = Number(areaHectares) || 0;
  const center = centroid(geometry);
  const complexityScore = Math.abs(center.lat + center.lng) % 1;
  const forestLoss = complexityScore > 0.55 || area > 4 ? Math.round(area * 280 + complexityScore * 520) : 0;
  return {
    status: forestLoss > 0 ? 'NON_COMPLIANT' : 'COMPLIANT',
    deforested_area_m2: forestLoss,
    satellite_source: 'Offline heuristic screening',
    analysis_timestamp: new Date().toISOString(),
    note: forestLoss > 0 ? 'Mobile heuristic detected a potential risk signal.' : 'No mobile fallback risk detected.',
  } as PlotRecord['analysis'];
};

export const runMobileEudrAnalysis = async (coordinates: CoordinatePoint[], areaHectares: string) => {
  const geometry = coordinates.map((point) => [point.lng, point.lat]);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EUDR_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}/api/analyze-geometry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        coordinates: geometry,
        areaHectares,
      }),
    });
    if (!response.ok) throw new Error(`Backend error: ${response.status}`);
    const data = await response.json();
    return {
      status: data.status,
      deforested_area_m2: Number(data.deforested_area_m2 ?? 0),
      satellite_source: data.satellite_source ?? 'Sentinel-2 / GEE backend',
      analysis_timestamp: new Date().toISOString(),
      note: data.status === 'NON_COMPLIANT' ? 'Post-cutoff loss signal detected.' : 'No post-cutoff loss detected.',
    } as PlotRecord['analysis'];
  } catch {
    return offlineAssessment(geometry, areaHectares);
  } finally {
    clearTimeout(timeout);
  }
};

const closeRing = (coordinates: CoordinatePoint[]) => {
  if (!coordinates.length) return coordinates;
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  return first.lat === last.lat && first.lng === last.lng ? coordinates : [...coordinates, first];
};

export const savePlotFromMobile = async ({
  ownerId,
  name,
  supplierId,
  commodity,
  countryOfProduction,
  geometryType,
  coordinates,
  areaHectares,
}: {
  ownerId: string;
  name: string;
  supplierId: string;
  commodity: string;
  countryOfProduction: string;
  geometryType: 'point' | 'polygon';
  coordinates: CoordinatePoint[];
  areaHectares: string;
}) => {
  const normalizedCoordinates = geometryType === 'point' ? [coordinates[0]] : closeRing(coordinates);
  const geojson =
    geometryType === 'point'
      ? JSON.stringify(
          {
            type: 'Feature',
            properties: { name, commodity, areaHectares },
            geometry: {
              type: 'Point',
              coordinates: [normalizedCoordinates[0].lng, normalizedCoordinates[0].lat],
            },
          },
          null,
          2,
        )
      : JSON.stringify(
          {
            type: 'Feature',
            properties: { name, commodity, areaHectares },
            geometry: {
              type: 'Polygon',
              coordinates: [normalizedCoordinates.map((point) => [point.lng, point.lat])],
            },
          },
          null,
          2,
        );

  const plotRef = await addDoc(collection(db, 'plots'), {
    ownerId,
    name,
    supplierId,
    commodity,
    countryOfProduction,
    geometryType,
    coordinates: normalizedCoordinates,
    geojsonText: geojson,
    areaHectares,
    analysis: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return plotRef.id;
};

export const updatePlotAnalysisFromMobile = async (plotId: string, analysis: PlotRecord['analysis']) => {
  await updateDoc(doc(db, 'plots', plotId), {
    analysis,
    updatedAt: new Date().toISOString(),
  });
};

export const savePlotWorkflowFromMobile = async ({
  ownerId,
  name,
  supplierId,
  commodity,
  countryOfProduction,
  geometryType,
  coordinates,
  areaHectares,
  notifyUserId,
  onProgress,
}: {
  ownerId: string;
  name: string;
  supplierId: string;
  commodity: string;
  countryOfProduction: string;
  geometryType: 'point' | 'polygon';
  coordinates: CoordinatePoint[];
  areaHectares: string;
  notifyUserId: string;
  onProgress?: (progress: number) => void;
}) => {
  onProgress?.(12);
  const plotId = await savePlotFromMobile({
    ownerId,
    name,
    supplierId,
    commodity,
    countryOfProduction,
    geometryType,
    coordinates,
    areaHectares,
  });

  const savedCoordinates =
    geometryType === 'point' ? [coordinates[0]] : [...coordinates, coordinates[0]];

  onProgress?.(58);
  const analysis = await runMobileEudrAnalysis(savedCoordinates, areaHectares);
  await updatePlotAnalysisFromMobile(plotId, analysis);

  onProgress?.(86);
  await saveNotificationFromMobile({
    recipientUserId: notifyUserId,
    title: analysis?.status === 'NON_COMPLIANT' ? 'Plot flagged for review' : 'Plot saved and screened',
    message:
      analysis?.status === 'NON_COMPLIANT'
        ? `${name} shows a risk signal and should be reviewed before shipment use.`
        : `${name} is saved with a compliant mobile screening result.`,
    route: '/mobile/exporter/plots',
    level: analysis?.status === 'NON_COMPLIANT' ? 'warning' : 'success',
  });

  onProgress?.(100);
  return { plotId, analysis };
};

type BackendExtractionPayload = {
  rawText: string;
  confidence?: number;
  provider?: ExtractionRecord['provider'];
  providerModel?: string;
  detectedDocumentType?: string;
  warnings?: string[];
  pageCount?: number;
  sourceMimeType?: string;
};

const inferDocumentFamily = (source: string) => {
  if (/(electricity|utility|power|kwh|meter)/i.test(source)) return 'electricity bill';
  if (/(fuel|diesel|petrol|gas|coal)/i.test(source)) return 'fuel invoice';
  if (/(purchase order|po number|ordered by|buyer order)/i.test(source)) return 'purchase order';
  if (/(shipment|bill of lading|packing list|container|awb)/i.test(source)) return 'shipment document';
  if (/(supplier declaration|producer declaration|declaration of origin)/i.test(source)) return 'supplier declaration';
  if (/(survey|khasra|land record|geojson|plot record|title deed)/i.test(source)) return 'land record';
  return 'uploaded document';
};

const firstMatch = (rawText: string, ...patterns: RegExp[]) =>
  patterns.map((pattern) => rawText.match(pattern)?.[1]?.trim()).find(Boolean) ?? '';

const deriveExtractionPayload = (
  document: DocumentRecord,
  rawText: string,
  metadata?: {
    confidence?: number;
    provider?: ExtractionRecord['provider'];
    providerModel?: string;
    detectedDocumentType?: string;
    warnings?: string[];
    pageCount?: number;
    sourceMimeType?: string;
  },
): Omit<ExtractionRecord, 'id' | 'documentId' | 'createdAt' | 'updatedAt'> => {
  const detectedType = metadata?.detectedDocumentType || inferDocumentFamily(`${document.documentType} ${document.fileName} ${rawText}`);
  const quantityCapture = rawText.match(/(\d+(?:[.,]\d+)?)\s*(kWh|kg|kgs|litre|litres|liter|liters|l|tonnes|tonne|t|mt|mwh)/i);
  const extractedFields: Record<string, string> = {
    documentType: detectedType,
    invoiceId: firstMatch(rawText, /invoice(?:\s*(?:number|no|#|id))?[\s:.-]*([A-Za-z0-9\/-]+)/i, /\bINV[-\w/]+\b/i),
    supplierName: firstMatch(rawText, /supplier(?: name)?[\s:.-]*([A-Za-z0-9 &.,()-]+)/i, /vendor(?: name)?[\s:.-]*([A-Za-z0-9 &.,()-]+)/i),
    quantity: quantityCapture?.[1]?.replace(/,/g, '') ?? '',
    unit: quantityCapture?.[2] ?? '',
    batchCode: firstMatch(rawText, /(?:batch|lot)(?:\s*(?:code|number|no|#))?[\s:.-]*([A-Za-z0-9\/-]+)/i),
    hsCode: firstMatch(rawText, /(?:hs\s*code|tariff)(?:\s*(?:number|no|#))?[\s:.-]*([A-Za-z0-9.-]+)/i),
    destinationCountry: firstMatch(rawText, /(?:destination|country of origin|origin country|dispatch country)[\s:.-]*([A-Za-z ]+)/i),
    surveyNumber: firstMatch(rawText, /(?:survey|plot|khasra)(?:\s*(?:number|no|#))?[\s:.-]*([A-Za-z0-9\/-]+)/i),
    meterNumber: firstMatch(rawText, /(?:meter|consumer)(?:\s*(?:number|no|#))?[\s:.-]*([A-Za-z0-9\/-]+)/i),
    utilityProvider: firstMatch(rawText, /(?:utility|electricity board|provider|discom)[\s:.-]*([A-Za-z0-9 &.,()-]+)/i),
  };

  const filledFieldCount = Object.values(extractedFields).filter(Boolean).length;
  const confidence = Math.max(metadata?.confidence ?? 0.76, Math.min(0.96, 0.54 + filledFieldCount * 0.05));

  return {
    status: 'EXTRACTED',
    rawText,
    extractedFields,
    fieldConfidences: Object.fromEntries(
      Object.entries(extractedFields).map(([key, value]) => [
        key,
        value ? Math.min(0.99, Math.max(0.61, confidence - (key === 'documentType' ? 0.02 : 0.06))) : 0.52,
      ]),
    ),
    reviewerNotes: '',
    confidence,
    provider: metadata?.provider ?? 'heuristic',
    providerModel: metadata?.providerModel ?? '',
    detectedDocumentType: detectedType,
    warnings: metadata?.warnings ?? [],
    reviewRequired: confidence < 0.9 || Boolean(metadata?.warnings?.length),
    pageCount: metadata?.pageCount,
    sourceMimeType: metadata?.sourceMimeType ?? '',
  };
};

export const runDocumentExtractionFromMobile = async (document: DocumentRecord) => {
  let payload: BackendExtractionPayload | null = null;
  try {
    const response = await fetch(`${API_BASE}/api/extract-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        previewUrl: document.previewUrl,
        fileName: document.fileName,
        documentType: document.documentType,
        notes: document.notes,
      }),
    });
    if (!response.ok) throw new Error(`Document extraction failed with ${response.status}`);
    payload = (await response.json()) as BackendExtractionPayload;
  } catch {
    payload = {
      rawText: `${document.fileName}\n${document.documentType}\n${document.notes}`.trim(),
      confidence: 0.72,
      provider: 'heuristic',
      providerModel: 'mobile-fallback',
      detectedDocumentType: document.documentType,
      warnings: ['Backend extraction unavailable; mobile fallback used.'],
      pageCount: undefined,
      sourceMimeType: '',
    };
  }

  const extraction = deriveExtractionPayload(document, payload.rawText || `${document.fileName}\n${document.notes}`, payload);
  const existing = await getDocs(query(collection(db, 'extractions'), where('documentId', '==', document.id)));

  if (existing.empty) {
    await addDoc(collection(db, 'extractions'), {
      ownerId: document.ownerId ?? '',
      documentId: document.id,
      ...extraction,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    await updateDoc(doc(db, 'extractions', existing.docs[0].id), {
      ...extraction,
      updatedAt: new Date().toISOString(),
    });
  }

  await updateDoc(doc(db, 'documents', document.id), {
    ocrStatus: 'EXTRACTED',
    documentType: extraction.detectedDocumentType || document.documentType,
    updatedAt: new Date().toISOString(),
  });

  return extraction;
};

export const saveReviewedExtractionFromMobile = async (
  document: DocumentRecord,
  fields: Record<string, string>,
  reviewerNotes: string,
) => {
  const existing = await getDocs(query(collection(db, 'extractions'), where('documentId', '==', document.id)));
  const base = existing.empty
    ? deriveExtractionPayload(document, `${document.fileName}\n${document.notes}`)
    : (normalizeRecordDates({ id: existing.docs[0].id, ...existing.docs[0].data() }) as ExtractionRecord);

  const payload = {
    ...base,
    status: 'REVIEWED' as const,
    extractedFields: fields,
    reviewerNotes,
    confidence: Math.max(base.confidence, 0.94),
    reviewRequired: false,
  };

  if (existing.empty) {
    await addDoc(collection(db, 'extractions'), {
      ownerId: document.ownerId ?? '',
      documentId: document.id,
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    await updateDoc(doc(db, 'extractions', existing.docs[0].id), {
      ...payload,
      updatedAt: new Date().toISOString(),
    });
  }

  await updateDoc(doc(db, 'documents', document.id), {
    ocrStatus: 'REVIEWED',
    documentType: fields.documentType || payload.detectedDocumentType || document.documentType,
    updatedAt: new Date().toISOString(),
  });
};

export const updateShipmentStatusFromMobile = async (shipmentId: string, status: ShipmentRecord['status']) => {
  await updateDoc(doc(db, 'shipments', shipmentId), {
    status,
    updatedAt: new Date().toISOString(),
  });
};

export const saveNotificationFromMobile = async ({
  recipientUserId,
  recipientRole,
  title,
  message,
  route,
  level,
}: {
  recipientUserId?: string;
  recipientRole?: UserRole;
  title: string;
  message: string;
  route: string;
  level: NotificationRecord['level'];
}) => {
  const actor = await getCurrentSessionUser();

  await addDoc(collection(db, 'notifications'), {
    recipientUserId: recipientUserId ?? '',
    recipientRole: recipientRole ?? '',
    title,
    message,
    route,
    level,
    actorId: actor?.id ?? auth.currentUser?.uid ?? '',
    actorRole: actor?.role ?? 'exporter',
    actorName: actor?.name ?? 'CarbonTrace Mobile',
    createdAt: new Date().toISOString(),
    read: false,
  });
};

export const saveMonitoringEventFromMobile = async (
  event: Omit<MonitoringEvent, 'id' | 'createdAt' | 'platform'> & { createdAt?: string },
) => {
  const actor = await getCurrentSessionUser();
  await addDoc(collection(db, 'monitoringEvents'), {
    ...event,
    actorId: actor?.id ?? auth.currentUser?.uid ?? event.actorId ?? '',
    actorRole: actor?.role ?? event.actorRole ?? 'exporter',
    actorName: actor?.name ?? event.actorName ?? 'CarbonTrace Mobile',
    platform: 'mobile',
    createdAt: event.createdAt ?? new Date().toISOString(),
  });
};

export const upsertVerificationCaseFromMobile = async (
  shipmentId: string,
  reviewerNotes = '',
  decision: VerificationCase['decision'] = '',
) => {
  const existing = await getDocs(query(collection(db, 'verificationCases'), where('shipmentId', '==', shipmentId)));
  if (existing.empty) {
    await addDoc(collection(db, 'verificationCases'), {
      shipmentId,
      reviewerNotes,
      decision,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  await setDoc(
    doc(db, 'verificationCases', existing.docs[0].id),
    {
      shipmentId,
      reviewerNotes,
      decision,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
};
