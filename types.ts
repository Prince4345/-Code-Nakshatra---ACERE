export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  RISK = 'RISK',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export type UserRole = 'exporter' | 'verifier' | 'importer';

export type PlotGeometryType = 'point' | 'polygon' | 'geojson';

export type ShipmentWorkflowStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CLARIFICATION_REQUESTED'
  | 'APPROVED'
  | 'REJECTED';

export type ExtractionStatus = 'PENDING' | 'EXTRACTED' | 'REVIEWED';
export type ExtractionProvider = 'document-ai' | 'tesseract' | 'heuristic';

export type NotificationLevel = 'info' | 'warning' | 'success';
export type MonitoringSeverity = 'info' | 'warning' | 'error' | 'fatal';

export interface CoordinatePoint {
  lat: number;
  lng: number;
}

export interface CBAMReport {
  status: ComplianceStatus;
  reported_emissions_tCO2: number | null;
  default_value_triggered: boolean;
  non_compliance_reasons: string[];
  scope1_tCO2?: number;
  scope2_tCO2?: number;
  installation_count?: number;
  evidence_document_count?: number;
}

export interface EUDRReport {
  status: ComplianceStatus;
  geolocation_provided: boolean;
  deforestation_cutoff_verified: boolean;
  non_compliance_reasons: string[];
  dds_ready?: boolean;
  plot_count?: number;
}

export interface ComplianceReport {
  invoice_id: string;
  product_category: string;
  destination_eu_country: string;
  cbam: CBAMReport;
  eudr: EUDRReport;
  overall_shipment_risk: RiskLevel;
}

export interface ShipmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AppState {
  input: string;
  report: ComplianceReport | null;
  loading: boolean;
  error: string | null;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  workspaceId?: string;
}

export interface CompanyProfile {
  id: string;
  legalEntityName: string;
  tradeName: string;
  gst: string;
  udyam: string;
  eori: string;
  registeredAddress: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  exportCommodities: string;
  destinationCountries: string;
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
  geometryType: PlotGeometryType;
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
  ocrStatus?: ExtractionStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface FacilityRecord {
  id: string;
  ownerId?: string;
  name: string;
  address: string;
  country: string;
  region: string;
  productLines: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface InstallationRecord {
  id: string;
  ownerId?: string;
  facilityId: string;
  name: string;
  processType: string;
  fuelTypes: string[];
  electricitySource: string;
  coveredProducts: string[];
  annualCapacity: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductionBatchRecord {
  id: string;
  ownerId?: string;
  shipmentId: string;
  facilityId: string;
  installationId: string;
  batchCode: string;
  product: string;
  quantity: string;
  unit: string;
  fuelType: string;
  fuelAmount: string;
  fuelUnit: string;
  electricityKwh: string;
  documentIds: string[];
  notes: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EmissionFactorRecord {
  id: string;
  code: string;
  name: string;
  category: 'fuel' | 'electricity';
  unit: string;
  factorKgCO2e: number;
  source: string;
  updatedAt: string;
}

export interface ExtractionRecord {
  id: string;
  ownerId?: string;
  documentId: string;
  status: ExtractionStatus;
  rawText: string;
  extractedFields: Record<string, string>;
  fieldConfidences?: Record<string, number>;
  reviewerNotes: string;
  confidence: number;
  provider?: ExtractionProvider;
  providerModel?: string;
  detectedDocumentType?: string;
  warnings?: string[];
  reviewRequired?: boolean;
  pageCount?: number;
  sourceMimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  ownerId?: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  details: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  recipientUserId?: string;
  recipientRole?: UserRole;
  actorId?: string;
  actorRole?: UserRole;
  type?: string;
  title: string;
  message: string;
  level: NotificationLevel;
  route: string;
  entityType?: string;
  entityId?: string;
  actorName?: string;
  createdAt: string;
  read: boolean;
  readAt?: string;
}

export interface MonitoringEvent {
  id: string;
  actorId?: string;
  actorRole?: UserRole;
  actorName?: string;
  platform: 'web' | 'mobile' | 'backend';
  severity: MonitoringSeverity;
  source: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  createdAt: string;
}

export interface ShipmentRecord {
  id: string;
  ownerId?: string;
  exporterReferenceId?: string;
  verifierId?: string;
  verifierName?: string;
  importerId?: string;
  importerName?: string;
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
  facilityIds?: string[];
  installationIds?: string[];
  batchIds?: string[];
  energyNotes: string;
  additionalNotes: string;
  status: ShipmentWorkflowStatus;
  report?: ComplianceReport | null;
  approvalVersion?: number;
  approvedSnapshotId?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EudrDdsPayload {
  operator: {
    legalEntityName: string;
    address: string;
    eori: string;
    contactName: string;
    contactEmail: string;
  };
  shipment: {
    invoiceId: string;
    hsCode: string;
    product: string;
    quantity: string;
    unit: string;
    destinationCountry: string;
  };
  suppliers: Array<{
    name: string;
    type: string;
    country: string;
    region: string;
    commodity: string;
  }>;
  plots: Array<{
    id: string;
    name: string;
    commodity: string;
    countryOfProduction: string;
    areaHectares: string;
    geojson: string | null;
    coordinates: CoordinatePoint[];
    analysis: PlotAnalysis | null;
  }>;
}

export interface ShipmentSnapshot {
  id: string;
  shipmentId: string;
  ownerId: string;
  version: number;
  approvedAt: string;
  approvedById: string;
  approvedByName: string;
  report: ComplianceReport;
  ddsPayload: EudrDdsPayload;
  tracesXml: string;
  cbamCsv: string;
  packageJson: string;
  validationErrors: string[];
  validationWarnings: string[];
  createdAt: string;
}

export interface VerificationCase {
  id: string;
  shipmentId: string;
  verifierId?: string;
  verifierName?: string;
  importerId?: string;
  importerName?: string;
  reviewerNotes: string;
  decision: ShipmentWorkflowStatus | '';
  updatedAt: string;
}
