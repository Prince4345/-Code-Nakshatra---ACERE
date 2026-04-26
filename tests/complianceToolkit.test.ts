import { describe, expect, it } from 'vitest';
import {
  buildCbamRegistryCsv,
  buildComplianceReport,
  buildEudrDdsPayload,
  buildNotifications,
  buildTracesXml,
  calculateCbamMetrics,
  deriveExtractionFromDocument,
  filterAuditEntriesForShipment,
  inferDocumentTypeFromSource,
  requiresCbamCoverage,
  requiresEudrCoverage,
} from '../services/complianceToolkit';
import {
  AuditLogEntry,
  CompanyProfile,
  ComplianceStatus,
  DocumentRecord,
  EmissionFactorRecord,
  ExtractionRecord,
  FacilityRecord,
  InstallationRecord,
  PlotRecord,
  ProductionBatchRecord,
  RiskLevel,
  ShipmentRecord,
  Supplier,
  VerificationCase,
} from '../types';

const timestamps = {
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-01T10:00:00.000Z',
};

const companyProfile: CompanyProfile = {
  id: 'company-1',
  legalEntityName: 'Acere Exports Pvt Ltd',
  tradeName: 'CarbonTrace Demo',
  gst: '27ABCDE1234F1Z5',
  udyam: 'UDYAM-MH-12-0000001',
  eori: 'INEORI1234567',
  registeredAddress: 'Mumbai, India',
  contactName: 'Asha Singh',
  contactEmail: 'asha@example.com',
  contactPhone: '+91-9999999999',
  exportCommodities: 'Coffee, Steel',
  destinationCountries: 'Germany, Netherlands',
  updatedAt: timestamps.updatedAt,
};

const supplier: Supplier = {
  id: 'supplier-1',
  ownerId: 'owner-1',
  name: 'Nilgiri Growers',
  type: 'Farmer Group',
  commodity: 'Coffee',
  country: 'India',
  region: 'Tamil Nadu',
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
};

const documentRecord: DocumentRecord = {
  id: 'document-1',
  ownerId: 'owner-1',
  fileName: 'diesel-invoice.pdf',
  documentType: 'Fuel Invoice',
  notes: 'Diesel batch support',
  linkedShipmentId: '',
  linkedFacilityId: 'facility-1',
  linkedBatchId: 'batch-1',
  previewUrl: 'https://example.com/file.pdf',
  ocrStatus: 'REVIEWED',
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
};

const facility: FacilityRecord = {
  id: 'facility-1',
  ownerId: 'owner-1',
  name: 'Plant 1',
  address: 'Pune, India',
  country: 'India',
  region: 'Maharashtra',
  productLines: ['Steel'],
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
};

const installation: InstallationRecord = {
  id: 'installation-1',
  ownerId: 'owner-1',
  facilityId: facility.id,
  name: 'Blast Furnace',
  processType: 'Steelmaking',
  fuelTypes: ['Diesel'],
  electricitySource: 'India Grid',
  coveredProducts: ['Steel'],
  annualCapacity: '50000',
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
};

const cbamBatch: ProductionBatchRecord = {
  id: 'batch-1',
  ownerId: 'owner-1',
  shipmentId: 'shipment-cbam',
  facilityId: facility.id,
  installationId: installation.id,
  batchCode: 'BATCH-001',
  product: 'Steel billet',
  quantity: '25',
  unit: 't',
  fuelType: 'Diesel',
  fuelAmount: '100',
  fuelUnit: 'litre',
  electricityKwh: '250',
  documentIds: [documentRecord.id],
  notes: '',
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
};

const cbamFactors: EmissionFactorRecord[] = [
  {
    id: 'diesel',
    code: 'DIESEL_L',
    name: 'Diesel',
    category: 'fuel',
    unit: 'litre',
    factorKgCO2e: 2.68,
    source: 'Default factor',
    updatedAt: timestamps.updatedAt,
  },
  {
    id: 'grid',
    code: 'INDIA_GRID_KWH',
    name: 'India Grid Electricity',
    category: 'electricity',
    unit: 'kWh',
    factorKgCO2e: 0.708,
    source: 'Default factor',
    updatedAt: timestamps.updatedAt,
  },
];

const compliantPlot: PlotRecord = {
  id: 'plot-1',
  ownerId: 'owner-1',
  name: 'Coffee Plot Alpha',
  supplierId: supplier.id,
  commodity: 'Coffee',
  countryOfProduction: 'India',
  geometryType: 'polygon',
  coordinates: [[11.1, 76.1], [11.2, 76.2], [11.3, 76.1], [11.1, 76.1]],
  geojsonText: '{"type":"Feature"}',
  areaHectares: '2.5',
  analysis: {
    status: 'COMPLIANT',
    deforested_area_m2: 0,
    satellite_source: 'GEE',
    analysis_timestamp: timestamps.updatedAt,
  },
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
};

const riskyPlot: PlotRecord = {
  ...compliantPlot,
  id: 'plot-2',
  name: 'Coffee Plot Risky',
  analysis: {
    status: 'NON_COMPLIANT',
    deforested_area_m2: 180,
    satellite_source: 'GEE',
    analysis_timestamp: timestamps.updatedAt,
    note: 'Post-cutoff loss signal detected.',
  },
};

const cbamShipment: ShipmentRecord = {
  id: 'shipment-cbam',
  ownerId: 'owner-1',
  invoiceId: 'INV-CBAM-001',
  product: 'Steel billet',
  productCategory: 'steel',
  hsCode: '7207',
  destinationCountry: 'Germany',
  quantity: '25',
  unit: 't',
  supplierIds: [supplier.id],
  plotIds: [],
  documentIds: [documentRecord.id],
  facilityIds: [facility.id],
  installationIds: [installation.id],
  batchIds: [cbamBatch.id],
  energyNotes: 'Measured on site',
  additionalNotes: 'Ready for review',
  status: 'DRAFT',
  report: null,
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
};

const eudrShipment: ShipmentRecord = {
  ...cbamShipment,
  id: 'shipment-eudr',
  invoiceId: 'INV-EUDR-001',
  product: 'Coffee beans',
  productCategory: 'coffee',
  hsCode: '0901',
  plotIds: [compliantPlot.id],
  installationIds: [],
  batchIds: [],
  facilityIds: [],
};

describe('complianceToolkit', () => {
  it('detects CBAM and EUDR applicability from shipment data', () => {
    expect(requiresCbamCoverage(cbamShipment)).toBe(true);
    expect(requiresEudrCoverage(eudrShipment)).toBe(true);
    expect(requiresCbamCoverage(eudrShipment)).toBe(false);
  });

  it('calculates compliant CBAM metrics from linked production data', () => {
    const report = calculateCbamMetrics(
      cbamShipment,
      [cbamBatch],
      [installation],
      cbamFactors,
      [documentRecord],
    );

    expect(report.status).toBe(ComplianceStatus.COMPLIANT);
    expect(report.default_value_triggered).toBe(false);
    expect(report.scope1_tCO2).toBeCloseTo(0.268, 3);
    expect(report.scope2_tCO2).toBeCloseTo(0.177, 3);
    expect(report.reported_emissions_tCO2).toBeCloseTo(0.445, 3);
  });

  it('builds high-risk EUDR reports and export payloads', () => {
    const riskyShipment = {
      ...eudrShipment,
      plotIds: [riskyPlot.id],
    };

    const report = buildComplianceReport(
      riskyShipment,
      [riskyPlot],
      [],
      [],
      cbamFactors,
      [documentRecord],
    );
    const dds = buildEudrDdsPayload(riskyShipment, companyProfile, [supplier], [riskyPlot]);
    const xml = buildTracesXml(riskyShipment, companyProfile, [supplier], [riskyPlot]);

    expect(report.eudr.status).toBe(ComplianceStatus.NON_COMPLIANT);
    expect(report.overall_shipment_risk).toBe(RiskLevel.HIGH);
    expect(dds.operator.legalEntityName).toBe(companyProfile.legalEntityName);
    expect(dds.plots).toHaveLength(1);
    expect(xml).toContain('<InvoiceID>INV-EUDR-001</InvoiceID>');
    expect(xml).toContain('<LegalEntityName>Acere Exports Pvt Ltd</LegalEntityName>');
  });

  it('builds notifications, csv outputs, and shipment-linked audit filtering', () => {
    const reviewedExtraction: ExtractionRecord = {
      id: 'extract-1',
      ownerId: 'owner-1',
      documentId: documentRecord.id,
      status: 'REVIEWED',
      rawText: '',
      extractedFields: {},
      reviewerNotes: '',
      confidence: 0.92,
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt,
    };
    const review: VerificationCase = {
      id: 'review-1',
      shipmentId: eudrShipment.id,
      reviewerNotes: 'Need updated evidence.',
      decision: 'CLARIFICATION_REQUESTED',
      updatedAt: timestamps.updatedAt,
    };
    const auditLogs: AuditLogEntry[] = [
      {
        id: 'audit-1',
        ownerId: 'owner-1',
        actorId: 'user-1',
        actorName: 'Asha',
        action: 'PLOT_ANALYZED',
        entityType: 'plot',
        entityId: compliantPlot.id,
        summary: 'Plot analyzed',
        details: '',
        createdAt: timestamps.createdAt,
      },
      {
        id: 'audit-2',
        ownerId: 'owner-1',
        actorId: 'user-1',
        actorName: 'Asha',
        action: 'UNRELATED',
        entityType: 'shipment',
        entityId: 'other-shipment',
        summary: 'Other',
        details: '',
        createdAt: timestamps.createdAt,
      },
    ];
    const approvedShipment = {
      ...eudrShipment,
      status: 'APPROVED' as const,
      documentIds: [documentRecord.id],
      plotIds: [compliantPlot.id],
    };
    const report = buildComplianceReport(approvedShipment, [compliantPlot], [cbamBatch], [installation], cbamFactors, [documentRecord]);
    const csv = buildCbamRegistryCsv(cbamShipment, buildComplianceReport(cbamShipment, [], [cbamBatch], [installation], cbamFactors, [documentRecord]), [cbamBatch], [installation], [facility]);
    const notifications = buildNotifications(null, [approvedShipment], [compliantPlot], [documentRecord], [review]);
    const filteredLogs = filterAuditEntriesForShipment(approvedShipment, auditLogs, [documentRecord], [compliantPlot], [cbamBatch]);

    expect(csv).toContain('"Invoice ID","INV-CBAM-001"');
    expect(csv).toContain('"Scope 1 tCO2","0.268"');
    expect(notifications.map((item) => item.id)).toEqual(
      expect.arrayContaining(['profile-missing', 'approved-packages', 'clarifications'])
    );
    expect(filteredLogs).toHaveLength(1);
    expect(report.eudr.status).toBe(ComplianceStatus.COMPLIANT);
    expect(reviewedExtraction.status).toBe('REVIEWED');
  });

  it('derives richer extraction fields for electricity bills', () => {
    const extraction = deriveExtractionFromDocument(
      {
        ...documentRecord,
        documentType: 'Electricity Bill',
        fileName: 'power-bill-april.pdf',
      },
      `
      Electricity Bill
      Invoice Number: EB-2026-041
      Provider: MSEDCL
      Consumer Number: 998877
      Meter Number: MTR-42
      Billing Date: 02/04/2026
      4500 kWh
      Grand Total: 124500
      `,
      {
        provider: 'document-ai',
        baseConfidence: 0.94,
      },
    );

    expect(extraction.provider).toBe('document-ai');
    expect(extraction.detectedDocumentType).toBe('Electricity Bill');
    expect(extraction.extractedFields.utilityProvider).toContain('MSEDCL');
    expect(extraction.extractedFields.consumerNumber).toContain('998877');
    expect(extraction.extractedFields.electricityKwh).toBe('4500');
    expect(extraction.fieldConfidences?.electricityKwh).toBeGreaterThan(0.9);
  });

  it('auto-detects document categories from upload source context', () => {
    expect(
      inferDocumentTypeFromSource({
        fileName: 'ebill-pune-april-2026.pdf',
        notes: 'Monthly meter statement from MSEDCL for plant line 2',
      }),
    ).toBe('Electricity Bill');

    expect(
      inferDocumentTypeFromSource({
        fileName: 'village-survey-record-plot-12.pdf',
        notes: 'survey extract and cadastral ownership proof',
      }),
    ).toBe('Land Record');

    expect(
      inferDocumentTypeFromSource({
        fileName: 'rotterdam-po-2026-04.pdf',
        notes: 'buyer purchase order for steel billet shipment',
      }),
    ).toBe('Purchase Order');
  });
});
