export type UserRole = 'exporter' | 'verifier' | 'importer';

export interface CoordinatePoint {
  lat: number;
  lng: number;
}

export type ShipmentWorkflowStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CLARIFICATION_REQUESTED'
  | 'APPROVED'
  | 'REJECTED';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface CompanyProfile {
  id: string;
  legalEntityName: string;
  tradeName: string;
  registeredAddress: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  ownerId?: string;
  name: string;
  type: string;
  commodity: string;
  country: string;
  region: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PlotAnalysis {
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING' | 'ERROR';
  deforested_area_m2: number;
  satellite_source: string;
  analysis_timestamp: string;
  note?: string;
}

export interface PlotRecord {
  id: string;
  ownerId?: string;
  name: string;
  supplierId: string;
  commodity: string;
  countryOfProduction: string;
  geometryType: 'point' | 'polygon' | 'geojson';
  coordinates: CoordinatePoint[];
  geojsonText: string;
  areaHectares: string;
  analysis?: PlotAnalysis | null;
  createdAt: string;
  updatedAt?: string;
}

export interface DocumentRecord {
  id: string;
  ownerId?: string;
  fileName: string;
  documentType: string;
  notes: string;
  linkedShipmentId: string;
  linkedFacilityId?: string;
  linkedBatchId?: string;
  previewUrl: string;
  ocrStatus?: 'PENDING' | 'EXTRACTED' | 'REVIEWED';
  createdAt: string;
  updatedAt?: string;
}

export interface ExtractionRecord {
  id: string;
  ownerId?: string;
  documentId: string;
  status: 'PENDING' | 'EXTRACTED' | 'REVIEWED';
  rawText: string;
  extractedFields: Record<string, string>;
  fieldConfidences?: Record<string, number>;
  reviewerNotes: string;
  confidence: number;
  provider?: 'document-ai' | 'tesseract' | 'heuristic';
  providerModel?: string;
  detectedDocumentType?: string;
  warnings?: string[];
  reviewRequired?: boolean;
  pageCount?: number;
  sourceMimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  level: 'info' | 'warning' | 'success';
  route: string;
  createdAt: string;
  read: boolean;
}

export interface MobileDeviceRegistration {
  expoPushToken?: string;
  pushStatus?: 'granted' | 'denied' | 'unavailable';
  deviceName?: string;
  biometricProtected?: boolean;
  lastAuthAt?: string;
  updatedAt?: string;
}

export type MonitoringSeverity = 'info' | 'warning' | 'error' | 'fatal';

export interface MonitoringEvent {
  id: string;
  actorId?: string;
  actorRole?: UserRole;
  actorName?: string;
  platform: 'mobile' | 'web' | 'backend';
  severity: MonitoringSeverity;
  source: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  createdAt: string;
}

export type MobileSyncQueueItemType = 'document-upload' | 'plot-save';
export type MobileSyncQueueItemStatus = 'queued' | 'processing' | 'failed';

export interface QueuedDocumentUploadPayload {
  ownerId: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
  documentType: string;
  notes: string;
}

export interface QueuedPlotSavePayload {
  ownerId: string;
  name: string;
  supplierId: string;
  commodity: string;
  countryOfProduction: string;
  geometryType: 'point' | 'polygon';
  coordinates: CoordinatePoint[];
  areaHectares: string;
  notifyUserId: string;
}

export interface MobileSyncQueueItem {
  id: string;
  type: MobileSyncQueueItemType;
  status: MobileSyncQueueItemStatus;
  progress: number;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
  payload: QueuedDocumentUploadPayload | QueuedPlotSavePayload;
}

export interface MobileSyncHistoryEntry {
  id: string;
  type: MobileSyncQueueItemType;
  status: 'completed' | 'failed' | 'discarded';
  title: string;
  description: string;
  createdAt: string;
}

export interface MobileSyncState {
  online: boolean;
  processing: boolean;
  items: MobileSyncQueueItem[];
  history: MobileSyncHistoryEntry[];
  lastCompletedAt?: string;
}

export interface ComplianceReport {
  overall_shipment_risk?: 'LOW' | 'MEDIUM' | 'HIGH';
  invoice_id?: string;
  product_category?: string;
  destination_eu_country?: string;
  cbam?: {
    status?: 'COMPLIANT' | 'NON_COMPLIANT' | 'RISK' | 'NOT_APPLICABLE';
    reported_emissions_tCO2?: number | null;
    default_value_triggered?: boolean;
    non_compliance_reasons?: string[];
    scope1_tCO2?: number;
    scope2_tCO2?: number;
    installation_count?: number;
    evidence_document_count?: number;
  };
  eudr?: {
    status?: 'COMPLIANT' | 'NON_COMPLIANT' | 'RISK' | 'NOT_APPLICABLE';
    geolocation_provided?: boolean;
    deforestation_cutoff_verified?: boolean;
    non_compliance_reasons?: string[];
    dds_ready?: boolean;
    plot_count?: number;
  };
}

export interface ShipmentRecord {
  id: string;
  ownerId?: string;
  invoiceId: string;
  product: string;
  productCategory: string;
  hsCode: string;
  destinationCountry: string;
  quantity: string;
  unit: string;
  supplierIds: string[];
  plotIds: string[];
  documentIds: string[];
  status: ShipmentWorkflowStatus;
  report?: ComplianceReport | null;
  approvalVersion?: number;
  approvedSnapshotId?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationCase {
  id: string;
  shipmentId: string;
  reviewerNotes: string;
  decision: ShipmentWorkflowStatus | '';
  updatedAt: string;
}

export interface ExporterBundle {
  profile: CompanyProfile | null;
  suppliers: Supplier[];
  plots: PlotRecord[];
  shipments: ShipmentRecord[];
  documents: DocumentRecord[];
  extractions: ExtractionRecord[];
  notifications: NotificationRecord[];
}

export interface VerifierBundle {
  shipments: ShipmentRecord[];
  cases: VerificationCase[];
  companyProfiles: CompanyProfile[];
  plots: PlotRecord[];
  documents: DocumentRecord[];
  extractions: ExtractionRecord[];
  notifications: NotificationRecord[];
}

export interface ImporterBundle {
  shipments: ShipmentRecord[];
  companyProfiles: CompanyProfile[];
  plots: PlotRecord[];
  documents: DocumentRecord[];
  extractions: ExtractionRecord[];
  notifications: NotificationRecord[];
}
