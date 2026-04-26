import {
  AuditLogEntry,
  CBAMReport,
  CompanyProfile,
  ComplianceReport,
  ComplianceStatus,
  DocumentRecord,
  EmissionFactorRecord,
  EudrDdsPayload,
  ExtractionRecord,
  FacilityRecord,
  InstallationRecord,
  NotificationRecord,
  PlotRecord,
  ProductionBatchRecord,
  RiskLevel,
  ShipmentRecord,
  ShipmentValidationResult,
  Supplier,
  VerificationCase,
} from '../types';

const CBAM_PRODUCTS = ['steel', 'aluminum', 'cement', 'fertilizer', 'electricity', 'hydrogen'];
const EUDR_PRODUCTS = ['coffee', 'cocoa', 'soy', 'timber', 'rubber', 'palm', 'cattle', 'wood'];

const round = (value: number) => Number(value.toFixed(3));

const containsAny = (value: string, keywords: string[]) => {
  const lower = value.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
};

const toNumber = (value: string) => {
  const normalized = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(normalized) ? normalized : 0;
};

const findFactor = (factors: EmissionFactorRecord[], predicate: (factor: EmissionFactorRecord) => boolean) =>
  factors.find(predicate);

const formatCsvCell = (value: string | number | boolean | null | undefined) => {
  const raw = value === null || value === undefined ? '' : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
};

const hasText = (value: string | null | undefined) => Boolean(String(value ?? '').trim());

const dedupeMessages = (messages: string[]) => Array.from(new Set(messages));

export const requiresCbamCoverage = (shipment: ShipmentRecord) =>
  containsAny(`${shipment.product} ${shipment.productCategory} ${shipment.hsCode}`, CBAM_PRODUCTS);

export const requiresEudrCoverage = (shipment: ShipmentRecord) =>
  containsAny(`${shipment.product} ${shipment.productCategory} ${shipment.hsCode}`, EUDR_PRODUCTS);

export const calculateCbamMetrics = (
  shipment: ShipmentRecord,
  batches: ProductionBatchRecord[],
  installations: InstallationRecord[],
  factors: EmissionFactorRecord[],
  documents: DocumentRecord[],
): CBAMReport => {
  if (!requiresCbamCoverage(shipment)) {
    return {
      status: ComplianceStatus.NOT_APPLICABLE,
      reported_emissions_tCO2: null,
      default_value_triggered: false,
      non_compliance_reasons: [],
      scope1_tCO2: 0,
      scope2_tCO2: 0,
      installation_count: 0,
      evidence_document_count: 0,
    };
  }

  const linkedBatches = batches.filter((batch) => shipment.batchIds.includes(batch.id) || batch.shipmentId === shipment.id);
  const linkedInstallations = installations.filter((installation) => shipment.installationIds.includes(installation.id));
  const evidenceDocumentIds = new Set(linkedBatches.flatMap((batch) => batch.documentIds));
  const evidenceDocumentCount = documents.filter((document) => evidenceDocumentIds.has(document.id)).length;
  const reasons: string[] = [];

  let scope1Kg = 0;
  let scope2Kg = 0;
  let defaultTriggered = false;

  linkedBatches.forEach((batch) => {
    const fuelAmount = toNumber(batch.fuelAmount);
    const electricityKwh = toNumber(batch.electricityKwh);

    const fuelFactor = findFactor(
      factors,
      (factor) =>
        factor.category === 'fuel' &&
        factor.unit.toLowerCase() === batch.fuelUnit.toLowerCase() &&
        factor.name.toLowerCase().includes(batch.fuelType.toLowerCase()),
    );
    const gridFactor = findFactor(factors, (factor) => factor.category === 'electricity');

    if (fuelAmount > 0 && fuelFactor) scope1Kg += fuelAmount * fuelFactor.factorKgCO2e;
    if (fuelAmount > 0 && !fuelFactor) {
      defaultTriggered = true;
      reasons.push(`No factor found for ${batch.fuelType || 'fuel'} in ${batch.fuelUnit || 'declared unit'}.`);
    }

    if (electricityKwh > 0 && gridFactor) scope2Kg += electricityKwh * gridFactor.factorKgCO2e;
    if (electricityKwh > 0 && !gridFactor) {
      defaultTriggered = true;
      reasons.push('Grid emission factor missing for electricity-based calculations.');
    }
  });

  if (!linkedInstallations.length) reasons.push('No installation linked to shipment for installation-level CBAM reporting.');
  if (!linkedBatches.length) reasons.push('No production batch linked to shipment for emissions allocation.');
  if (!evidenceDocumentCount) reasons.push('No source document linked to CBAM activity data.');

  if (!linkedBatches.some((batch) => toNumber(batch.electricityKwh) > 0 || toNumber(batch.fuelAmount) > 0)) {
    defaultTriggered = true;
    reasons.push('No measured fuel or electricity values were provided for the linked production batches.');
  }

  const scope1 = round(scope1Kg / 1000);
  const scope2 = round(scope2Kg / 1000);
  const total = round(scope1 + scope2);
  const status = reasons.length
    ? reasons.length > 2
      ? ComplianceStatus.NON_COMPLIANT
      : ComplianceStatus.RISK
    : ComplianceStatus.COMPLIANT;

  return {
    status,
    reported_emissions_tCO2: total,
    default_value_triggered: defaultTriggered,
    non_compliance_reasons: reasons,
    scope1_tCO2: scope1,
    scope2_tCO2: scope2,
    installation_count: linkedInstallations.length,
    evidence_document_count: evidenceDocumentCount,
  };
};

export const buildComplianceReport = (
  shipment: ShipmentRecord,
  plots: PlotRecord[],
  batches: ProductionBatchRecord[],
  installations: InstallationRecord[],
  factors: EmissionFactorRecord[],
  documents: DocumentRecord[],
): ComplianceReport => {
  const linkedPlots = plots.filter((plot) => shipment.plotIds.includes(plot.id));
  const riskyPlot = linkedPlots.some((plot) => plot.analysis?.status === 'NON_COMPLIANT');
  const verifiedPlot = linkedPlots.some((plot) => plot.analysis?.status === 'COMPLIANT');

  const eudrApplicable = requiresEudrCoverage(shipment);
  const eudrReasons: string[] = [];
  if (eudrApplicable && !linkedPlots.length) eudrReasons.push('No plot linked to shipment for EUDR due diligence.');
  if (eudrApplicable && linkedPlots.some((plot) => !plot.geojsonText && plot.geometryType !== 'point')) eudrReasons.push('GeoJSON geometry bundle is incomplete for one or more plots.');
  if (eudrApplicable && linkedPlots.length > 0 && !verifiedPlot && !riskyPlot) eudrReasons.push('Plot analysis exists but no compliant verification result is available yet.');
  if (eudrApplicable && riskyPlot) eudrReasons.push('Post-cutoff deforestation signal detected in linked plot evidence.');

  const cbam = calculateCbamMetrics(shipment, batches, installations, factors, documents);
  const eudrStatus = !eudrApplicable
    ? ComplianceStatus.NOT_APPLICABLE
    : riskyPlot
      ? ComplianceStatus.NON_COMPLIANT
      : eudrReasons.length
        ? ComplianceStatus.RISK
        : ComplianceStatus.COMPLIANT;

  const overallRisk =
    cbam.status === ComplianceStatus.NON_COMPLIANT || eudrStatus === ComplianceStatus.NON_COMPLIANT
      ? RiskLevel.HIGH
      : cbam.status === ComplianceStatus.RISK || eudrStatus === ComplianceStatus.RISK
        ? RiskLevel.MEDIUM
        : RiskLevel.LOW;

  return {
    invoice_id: shipment.invoiceId,
    product_category: shipment.productCategory || shipment.product,
    destination_eu_country: shipment.destinationCountry,
    cbam,
    eudr: {
      status: eudrStatus,
      geolocation_provided: linkedPlots.length > 0,
      deforestation_cutoff_verified: verifiedPlot && !riskyPlot,
      non_compliance_reasons: eudrReasons,
      dds_ready: linkedPlots.length > 0 && linkedPlots.every((plot) => plot.geometryType === 'point' || Boolean(plot.geojsonText)),
      plot_count: linkedPlots.length,
    },
    overall_shipment_risk: overallRisk,
  };
};

export const buildEudrDdsPayload = (
  shipment: ShipmentRecord,
  companyProfile: CompanyProfile | null,
  suppliers: Supplier[],
  plots: PlotRecord[],
): EudrDdsPayload => {
  const linkedSuppliers = suppliers.filter((supplier) => shipment.supplierIds.includes(supplier.id));
  const linkedPlots = plots.filter((plot) => shipment.plotIds.includes(plot.id));

  return {
    operator: {
      legalEntityName: companyProfile?.legalEntityName ?? '',
      address: companyProfile?.registeredAddress ?? '',
      eori: companyProfile?.eori ?? '',
      contactName: companyProfile?.contactName ?? '',
      contactEmail: companyProfile?.contactEmail ?? '',
    },
    shipment: {
      invoiceId: shipment.invoiceId,
      hsCode: shipment.hsCode,
      product: shipment.product,
      quantity: shipment.quantity,
      unit: shipment.unit,
      destinationCountry: shipment.destinationCountry,
    },
    suppliers: linkedSuppliers.map((supplier) => ({
      name: supplier.name,
      type: supplier.type,
      country: supplier.country,
      region: supplier.region,
      commodity: supplier.commodity,
    })),
    plots: linkedPlots.map((plot) => ({
      id: plot.id,
      name: plot.name,
      commodity: plot.commodity,
      countryOfProduction: plot.countryOfProduction,
      areaHectares: plot.areaHectares,
      geojson: plot.geometryType === 'point' ? null : plot.geojsonText,
      coordinates: plot.coordinates.map((coordinate) => ({ lat: coordinate.lat, lng: coordinate.lng })),
      analysis: plot.analysis ?? null,
    })),
  };
};

export const serializeEudrDdsPayload = (payload: EudrDdsPayload) => ({
  ...payload,
  plots: payload.plots.map((plot) => ({
    ...plot,
    coordinates: plot.coordinates.map((coordinate) => [coordinate.lat, coordinate.lng]),
  })),
});

export const validateShipmentExports = (
  shipment: ShipmentRecord,
  companyProfile: CompanyProfile | null,
  suppliers: Supplier[],
  plots: PlotRecord[],
  documents: DocumentRecord[],
  facilities: FacilityRecord[],
  installations: InstallationRecord[],
  batches: ProductionBatchRecord[],
  report: ComplianceReport | null,
): ShipmentValidationResult => {
  const linkedSuppliers = suppliers.filter((supplier) => shipment.supplierIds.includes(supplier.id));
  const linkedPlots = plots.filter((plot) => shipment.plotIds.includes(plot.id));
  const linkedDocuments = documents.filter((document) => shipment.documentIds.includes(document.id));
  const linkedFacilities = facilities.filter((facility) => shipment.facilityIds.includes(facility.id));
  const linkedInstallations = installations.filter((installation) => shipment.installationIds.includes(installation.id));
  const linkedBatches = batches.filter((batch) => shipment.batchIds.includes(batch.id) || batch.shipmentId === shipment.id);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!hasText(shipment.invoiceId)) errors.push('Shipment invoice ID is required.');
  if (!hasText(shipment.exporterReferenceId)) errors.push('Exporter reference ID or GSTIN is required.');
  if (!hasText(shipment.verifierId)) errors.push('Assigned verifier ID is required.');
  if (!hasText(shipment.importerId)) errors.push('Importer ID is required before approval.');
  if (!hasText(shipment.product)) errors.push('Shipment product description is required.');
  if (!hasText(shipment.hsCode)) errors.push('Shipment HS code is required.');
  if (!hasText(shipment.destinationCountry)) errors.push('Shipment destination country is required.');
  if (!hasText(shipment.quantity) || !hasText(shipment.unit)) errors.push('Shipment quantity and unit are required.');

  if (!companyProfile) errors.push('Company profile must exist before approval.');
  if (!hasText(companyProfile?.legalEntityName)) errors.push('Company legal entity name is required for DDS output.');
  if (!hasText(companyProfile?.registeredAddress)) errors.push('Company registered address is required for DDS output.');
  if (!hasText(companyProfile?.eori)) errors.push('Company EORI is required for DDS output.');
  if (!hasText(companyProfile?.contactName) || !hasText(companyProfile?.contactEmail)) {
    errors.push('Company contact name and contact email are required for DDS output.');
  }

  if (!linkedSuppliers.length) errors.push('At least one supplier must be linked before approval.');
  if (!linkedDocuments.length) errors.push('At least one supporting document must be linked before approval.');
  if (!report) errors.push('A compliance report must exist before approval.');

  if (requiresEudrCoverage(shipment)) {
    if (!linkedPlots.length) errors.push('EUDR-covered shipments require at least one linked plot.');
    if (linkedPlots.some((plot) => !plot.coordinates.length)) errors.push('Each linked plot must contain saved coordinates.');
    if (linkedPlots.some((plot) => plot.geometryType !== 'point' && !hasText(plot.geojsonText))) {
      errors.push('Each polygon plot must include a GeoJSON geometry bundle.');
    }
    if (linkedPlots.some((plot) => !plot.analysis || plot.analysis.status === 'PENDING' || plot.analysis.status === 'ERROR')) {
      errors.push('Each linked plot must have a completed EUDR analysis result.');
    }
    if (linkedPlots.some((plot) => plot.analysis?.status === 'NON_COMPLIANT')) {
      errors.push('Non-compliant plot analysis results must be resolved before approval.');
    }
    if (report && report.eudr.status !== ComplianceStatus.COMPLIANT) {
      errors.push('EUDR section must be compliant before exporter handoff is approved.');
    }
    if (report && !report.eudr.dds_ready) {
      errors.push('DDS payload is not marked ready for this shipment.');
    }
  }

  if (requiresCbamCoverage(shipment)) {
    if (!linkedFacilities.length) errors.push('CBAM-covered shipments require at least one linked facility.');
    if (!linkedInstallations.length) errors.push('CBAM-covered shipments require at least one linked installation.');
    if (!linkedBatches.length) errors.push('CBAM-covered shipments require at least one linked production batch.');
    if (report && report.cbam.status === ComplianceStatus.NON_COMPLIANT) {
      errors.push('CBAM section cannot be non-compliant at approval time.');
    }
    if (report && report.cbam.reported_emissions_tCO2 === null) {
      errors.push('CBAM-relevant shipments need an emissions total before approval.');
    }
    if (report?.cbam.default_value_triggered) {
      warnings.push('CBAM output uses default emission values and should be disclosed to importers.');
    }
  }

  if (report && report.invoice_id !== shipment.invoiceId) warnings.push('Report invoice reference differs from shipment invoice ID.');
  if (report && report.destination_eu_country !== shipment.destinationCountry) warnings.push('Report destination differs from shipment destination country.');

  return {
    isValid: errors.length === 0,
    errors: dedupeMessages(errors),
    warnings: dedupeMessages(warnings),
  };
};

export const buildTracesXml = (
  shipment: ShipmentRecord,
  companyProfile: CompanyProfile | null,
  suppliers: Supplier[],
  plots: PlotRecord[],
) => {
  const dds = buildEudrDdsPayload(shipment, companyProfile, suppliers, plots);
  const plotNodes = dds.plots
    .map(
      (plot) => `
    <Plot>
      <Name>${plot.name}</Name>
      <Country>${plot.countryOfProduction}</Country>
      <Commodity>${plot.commodity}</Commodity>
      <AreaHectares>${plot.areaHectares}</AreaHectares>
      <GeoJSON>${(plot.geojson ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</GeoJSON>
    </Plot>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<TRACESDueDiligenceStatement>
  <Operator>
    <LegalEntityName>${dds.operator.legalEntityName}</LegalEntityName>
    <Address>${dds.operator.address}</Address>
    <EORI>${dds.operator.eori}</EORI>
    <ContactName>${dds.operator.contactName}</ContactName>
    <ContactEmail>${dds.operator.contactEmail}</ContactEmail>
  </Operator>
  <Shipment>
    <InvoiceID>${shipment.invoiceId}</InvoiceID>
    <Product>${shipment.product}</Product>
    <HSCode>${shipment.hsCode}</HSCode>
    <Quantity unit="${shipment.unit}">${shipment.quantity}</Quantity>
    <Destination>${shipment.destinationCountry}</Destination>
  </Shipment>
  <Plots>${plotNodes}
  </Plots>
</TRACESDueDiligenceStatement>`;
};

export const buildCbamRegistryCsv = (
  shipment: ShipmentRecord,
  report: ComplianceReport,
  batches: ProductionBatchRecord[],
  installations: InstallationRecord[],
  facilities: FacilityRecord[],
) => {
  const linkedBatches = batches.filter((batch) => shipment.batchIds.includes(batch.id) || batch.shipmentId === shipment.id);
  const linkedInstallations = installations.filter((installation) => shipment.installationIds.includes(installation.id));
  const linkedFacilities = facilities.filter((facility) => shipment.facilityIds.includes(facility.id));

  const rows = [
    ['Invoice ID', shipment.invoiceId],
    ['Product', shipment.product],
    ['HS Code', shipment.hsCode],
    ['Destination', shipment.destinationCountry],
    ['Scope 1 tCO2', report.cbam.scope1_tCO2 ?? 0],
    ['Scope 2 tCO2', report.cbam.scope2_tCO2 ?? 0],
    ['Total Embedded Emissions tCO2', report.cbam.reported_emissions_tCO2 ?? 0],
    ['Default Value Triggered', report.cbam.default_value_triggered],
    ['Installations Linked', linkedInstallations.map((installation) => installation.name).join('; ')],
    ['Facilities Linked', linkedFacilities.map((facility) => facility.name).join('; ')],
    ['Production Batches', linkedBatches.map((batch) => batch.batchCode).join('; ')],
  ];

  return rows.map((row) => row.map(formatCsvCell).join(',')).join('\n');
};

export const buildShipmentPackage = (
  shipment: ShipmentRecord,
  report: ComplianceReport | null,
  companyProfile: CompanyProfile | null,
  suppliers: Supplier[],
  plots: PlotRecord[],
  documents: DocumentRecord[],
  facilities: FacilityRecord[],
  installations: InstallationRecord[],
  batches: ProductionBatchRecord[],
  extractions: ExtractionRecord[],
) =>
  JSON.stringify(
    {
      shipment,
      report,
      dds: buildEudrDdsPayload(shipment, companyProfile, suppliers, plots),
      facilities: facilities.filter((facility) => shipment.facilityIds.includes(facility.id)),
      installations: installations.filter((installation) => shipment.installationIds.includes(installation.id)),
      productionBatches: batches.filter((batch) => shipment.batchIds.includes(batch.id) || batch.shipmentId === shipment.id),
      plots: plots.filter((plot) => shipment.plotIds.includes(plot.id)),
      documents: documents.filter((document) => shipment.documentIds.includes(document.id)),
      extractions: extractions.filter((extraction) =>
        documents.some((document) => shipment.documentIds.includes(document.id) && document.id === extraction.documentId),
      ),
    },
    null,
    2,
  );

export const buildShipmentApprovalBundle = (
  shipment: ShipmentRecord,
  companyProfile: CompanyProfile | null,
  suppliers: Supplier[],
  plots: PlotRecord[],
  documents: DocumentRecord[],
  facilities: FacilityRecord[],
  installations: InstallationRecord[],
  batches: ProductionBatchRecord[],
  factors: EmissionFactorRecord[],
  extractions: ExtractionRecord[],
  existingReport?: ComplianceReport | null,
) => {
  const report =
    existingReport ??
    buildComplianceReport(shipment, plots, batches, installations, factors, documents);
  const ddsPayload = buildEudrDdsPayload(shipment, companyProfile, suppliers, plots);
  const tracesXml = buildTracesXml(shipment, companyProfile, suppliers, plots);
  const cbamCsv = buildCbamRegistryCsv(shipment, report, batches, installations, facilities);
  const packageJson = buildShipmentPackage(
    shipment,
    report,
    companyProfile,
    suppliers,
    plots,
    documents,
    facilities,
    installations,
    batches,
    extractions,
  );
  const validation = validateShipmentExports(
    shipment,
    companyProfile,
    suppliers,
    plots,
    documents,
    facilities,
    installations,
    batches,
    report,
  );

  return {
    report,
    ddsPayload,
    tracesXml,
    cbamCsv,
    packageJson,
    validation,
  };
};

const inferDocumentFamilyFromSource = (source: string) => {
  if (/(electricity|utility|power|kwh|meter)/i.test(source)) return 'electricity-bill';
  if (/(fuel|diesel|petrol|gas|coal|invoice)/i.test(source) && /(litre|liter|kg|invoice|qty|quantity)/i.test(source)) {
    return 'fuel-invoice';
  }
  if (/(purchase order|po number|ordered by|buyer order)/i.test(source)) return 'purchase-order';
  if (/(shipment|bill of lading|consignee|hs code|export|commercial invoice|packing list)/i.test(source)) {
    return 'shipment-document';
  }
  if (/(supplier declaration|declaration|origin statement)/i.test(source)) return 'supplier-declaration';
  if (/(land record|survey|7\/12|plot|geojson|village|owner|khasra)/i.test(source)) return 'land-record';
  if (/(production|batch|shift|line output|production log)/i.test(source)) return 'production-log';
  return 'generic';
};

const documentTypeFromFamily = (family: string, fallback = 'Shipment Document') => {
  const familyMap: Record<string, string> = {
    'electricity-bill': 'Electricity Bill',
    'fuel-invoice': 'Fuel Invoice',
    'shipment-document': 'Shipment Document',
    'supplier-declaration': 'Supplier Declaration',
    'land-record': 'Land Record',
    'purchase-order': 'Purchase Order',
    'production-log': 'Production Log',
    generic: fallback,
  };

  return familyMap[family] ?? fallback;
};

export const inferDocumentTypeFromSource = (input: {
  fileName?: string;
  documentType?: string;
  notes?: string;
  rawText?: string;
}) => {
  const source = `${input.documentType ?? ''} ${input.fileName ?? ''} ${input.notes ?? ''} ${input.rawText ?? ''}`.trim().toLowerCase();
  const fallback = hasText(input.documentType) ? String(input.documentType).trim() : 'Shipment Document';
  return documentTypeFromFamily(inferDocumentFamilyFromSource(source), fallback);
};

export const deriveExtractionFromDocument = (
  document: DocumentRecord,
  rawTextOverride?: string,
  metadata?: {
    baseConfidence?: number;
    provider?: ExtractionRecord['provider'];
    providerModel?: string;
    warnings?: string[];
    detectedDocumentType?: string;
    pageCount?: number;
    sourceMimeType?: string;
  },
): Omit<ExtractionRecord, 'id' | 'documentId' | 'createdAt' | 'updatedAt'> => {
  const rawText = (rawTextOverride?.trim() || `${document.fileName}\n${document.documentType}\n${document.notes}`).trim();
  const normalizedType = `${metadata?.detectedDocumentType ?? document.documentType} ${document.fileName}`.toLowerCase();

  const firstMatch = (...patterns: RegExp[]) =>
    patterns.map((pattern) => rawText.match(pattern)?.[1]?.trim()).find(Boolean) ?? '';

  const quantityCapture = rawText.match(/(\d+(?:[.,]\d+)?)\s*(kWh|kg|kgs|litre|litres|liter|liters|l|tonnes|tonne|t|mt|mwh)/i);
  const amountCapture = rawText.match(/(?:amount|total|grand total|invoice value)[^\d]*([\d,]+(?:\.\d+)?)/i);
  const invoiceCapture = firstMatch(/invoice(?:\s*(?:number|no|#|id))?[\s:.-]*([A-Za-z0-9\/-]+)/i, /\bINV[-\w/]+\b/i);
  const poCapture = firstMatch(/(?:purchase order|po)(?:\s*(?:number|no|#))?[\s:.-]*([A-Za-z0-9\/-]+)/i);
  const supplierCapture = firstMatch(/supplier(?: name)?[\s:.-]*([A-Za-z0-9 &.,()-]+)/i, /vendor(?: name)?[\s:.-]*([A-Za-z0-9 &.,()-]+)/i, /sold by[\s:.-]*([A-Za-z0-9 &.,()-]+)/i);
  const ownerCapture = firstMatch(/owner(?: name)?[\s:.-]*([A-Za-z0-9 &.,()-]+)/i, /occupant[\s:.-]*([A-Za-z0-9 &.,()-]+)/i);
  const surveyCapture = firstMatch(/(?:survey|plot|khasra)(?:\s*(?:number|no|#))?[\s:.-]*([A-Za-z0-9\/-]+)/i);
  const batchCapture = firstMatch(/(?:batch|lot)(?:\s*(?:code|number|no|#))?[\s:.-]*([A-Za-z0-9\/-]+)/i);
  const hsCodeCapture = firstMatch(/(?:hs\s*code|tariff)(?:\s*(?:number|no|#))?[\s:.-]*([A-Za-z0-9.-]+)/i);
  const countryCapture = firstMatch(/(?:destination|country of origin|origin country|dispatch country)[\s:.-]*([A-Za-z ]+)/i);
  const utilityProviderCapture = firstMatch(/(?:utility|electricity board|provider|discom)[\s:.-]*([A-Za-z0-9 &.,()-]+)/i);
  const consumerCapture = firstMatch(/(?:consumer|service|account)(?:\s*(?:number|no|#))?[\s:.-]*([A-Za-z0-9\/-]+)/i);
  const meterCapture = firstMatch(/meter(?:\s*(?:number|no|#))?[\s:.-]*([A-Za-z0-9\/-]+)/i);
  const dateCapture = firstMatch(/(?:invoice date|bill date|order date|production date|dispatch date|date)[\s:.-]*([A-Za-z0-9,\/ -]+)/i);
  const locationCapture = firstMatch(/(?:village|location|site|district|taluka|tehsil)[\s:.-]*([A-Za-z0-9, -]+)/i);
  const installationCapture = firstMatch(/(?:installation|plant|line)(?:\s*(?:name|id))?[\s:.-]*([A-Za-z0-9 &.,()-]+)/i);
  const fuelType =
    /diesel/i.test(rawText) ? 'Diesel' :
    /natural gas|lng|cng|gas/i.test(rawText) ? 'Natural Gas' :
    /coal/i.test(rawText) ? 'Coal' :
    /furnace oil/i.test(rawText) ? 'Furnace Oil' : '';
  const electricityKwh = firstMatch(/([\d,]+(?:\.\d+)?)\s*kwh/i);
  const quantity = quantityCapture?.[1]?.replace(/,/g, '') ?? '';
  const unit = quantityCapture?.[2] ?? '';
  const amount = amountCapture?.[1]?.replace(/,/g, '') ?? '';
  const family = inferDocumentFamilyFromSource(normalizedType + rawText);

  const extractedFieldsByFamily: Record<string, Record<string, string>> = {
    'electricity-bill': {
      documentType: 'Electricity Bill',
      fileName: document.fileName,
      invoiceReference: invoiceCapture,
      utilityProvider: utilityProviderCapture,
      consumerNumber: consumerCapture,
      meterNumber: meterCapture,
      billingDate: dateCapture,
      electricityKwh,
      quantity: electricityKwh || quantity,
      unit: electricityKwh ? 'kWh' : unit,
      amount,
    },
    'fuel-invoice': {
      documentType: 'Fuel Invoice',
      fileName: document.fileName,
      invoiceReference: invoiceCapture,
      supplierName: supplierCapture,
      invoiceDate: dateCapture,
      fuelType,
      quantity,
      unit,
      amount,
    },
    'shipment-document': {
      documentType: 'Shipment Document',
      fileName: document.fileName,
      invoiceReference: invoiceCapture,
      hsCode: hsCodeCapture,
      supplierName: supplierCapture,
      destinationCountry: countryCapture,
      shipmentDate: dateCapture,
      quantity,
      unit,
      amount,
    },
    'supplier-declaration': {
      documentType: 'Supplier Declaration',
      fileName: document.fileName,
      supplierName: supplierCapture,
      declarationDate: dateCapture,
      commodity: firstMatch(/commodity[\s:.-]*([A-Za-z0-9 &.,()-]+)/i),
      originCountry: countryCapture,
      plotOrSurveyReference: surveyCapture,
    },
    'land-record': {
      documentType: 'Land Record',
      fileName: document.fileName,
      ownerName: ownerCapture,
      surveyNumber: surveyCapture,
      location: locationCapture,
      latitudeReference: firstMatch(/latitude[\s:.-]*([0-9.+-]+)/i),
      longitudeReference: firstMatch(/longitude[\s:.-]*([0-9.+-]+)/i),
      polygonReference: /geojson|polygon|boundary/i.test(rawText) ? 'Present' : '',
    },
    'purchase-order': {
      documentType: 'Purchase Order',
      fileName: document.fileName,
      purchaseOrderNumber: poCapture,
      supplierName: supplierCapture,
      orderDate: dateCapture,
      quantity,
      unit,
      amount,
    },
    'production-log': {
      documentType: 'Production Log',
      fileName: document.fileName,
      batchCode: batchCapture,
      installationName: installationCapture,
      product: firstMatch(/product[\s:.-]*([A-Za-z0-9 &.,()-]+)/i),
      productionDate: dateCapture,
      quantity,
      unit,
      fuelType,
      electricityKwh,
    },
    generic: {
      documentType: document.documentType,
      fileName: document.fileName,
      invoiceReference: invoiceCapture,
      supplierName: supplierCapture,
      quantity,
      unit,
      likelyFuelType: fuelType,
      likelyElectricityEntry: /kwh/i.test(rawText) ? 'Yes' : 'No',
    },
  };

  const extractedFields = extractedFieldsByFamily[family];
  const baseConfidence = Math.max(metadata?.baseConfidence ?? 0.55, metadata?.provider === 'document-ai' ? 0.82 : 0.58);
  const fieldConfidences = Object.fromEntries(
    Object.entries(extractedFields).map(([key, value]) => {
      const hasValue = hasText(value);
      const boost = key === 'documentType' || key === 'fileName' ? 0.08 : hasValue ? 0.12 : -0.1;
      return [key, Number(Math.min(0.99, Math.max(0, baseConfidence + boost)).toFixed(2))];
    }),
  );
  const warnings = dedupeMessages([
    ...(metadata?.warnings ?? []),
    ...Object.entries(extractedFields)
      .filter(([key, value]) => !hasText(value) && !['fileName', 'documentType'].includes(key))
      .slice(0, 4)
      .map(([key]) => `Missing extracted value for ${key}.`),
  ]);
  const populated = Object.values(extractedFields).filter((value) => hasText(value)).length;
  const confidence = Number(
    Math.min(
      0.99,
      Math.max(baseConfidence, populated >= 6 ? baseConfidence + 0.08 : populated >= 4 ? baseConfidence + 0.03 : baseConfidence - 0.06),
    ).toFixed(2),
  );

  return {
    status: 'EXTRACTED',
    rawText,
    extractedFields,
    fieldConfidences,
    reviewerNotes: '',
    confidence,
    provider: metadata?.provider ?? 'heuristic',
    providerModel: metadata?.providerModel ?? '',
    detectedDocumentType: metadata?.detectedDocumentType ?? extractedFields.documentType ?? document.documentType,
    warnings,
    reviewRequired: confidence < 0.9 || warnings.length > 0,
    pageCount: metadata?.pageCount,
    sourceMimeType: metadata?.sourceMimeType ?? '',
  };
};

export const buildNotifications = (
  profile: CompanyProfile | null,
  shipments: ShipmentRecord[],
  plots: PlotRecord[],
  documents: DocumentRecord[],
  reviews: VerificationCase[],
): NotificationRecord[] => {
  const items: NotificationRecord[] = [];

  if (!profile) {
    items.push({
      id: 'profile-missing',
      title: 'Complete company profile',
      message: 'Operator identity and EORI details are required for compliant DDS and CBAM outputs.',
      level: 'warning',
      route: '/app/exporter/profile',
      createdAt: new Date().toISOString(),
      read: false,
    });
  }

  const pendingPlotChecks = plots.filter((plot) => !plot.analysis || plot.analysis.status === 'PENDING').length;
  if (pendingPlotChecks) {
    items.push({
      id: 'plot-checks',
      title: 'Run EUDR analysis',
      message: `${pendingPlotChecks} plot records still need a deforestation screening result.`,
      level: 'warning',
      route: '/app/exporter/plots',
      createdAt: new Date().toISOString(),
      read: false,
    });
  }

  const pendingUploads = documents.filter((document) => document.ocrStatus !== 'REVIEWED').length;
  if (pendingUploads) {
    items.push({
      id: 'ocr-review',
      title: 'Review extracted document fields',
      message: `${pendingUploads} uploaded documents still need extraction review or confirmation.`,
      level: 'info',
      route: '/app/exporter/extractions',
      createdAt: new Date().toISOString(),
      read: false,
    });
  }

  const clarificationCases = reviews.filter((review) => review.decision === 'CLARIFICATION_REQUESTED').length;
  if (clarificationCases) {
    items.push({
      id: 'clarifications',
      title: 'Clarifications requested',
      message: `${clarificationCases} verification case(s) require exporter response.`,
      level: 'warning',
      route: '/app/exporter/shipments',
      createdAt: new Date().toISOString(),
      read: false,
    });
  }

  const approved = shipments.filter((shipment) => shipment.status === 'APPROVED').length;
  if (approved) {
    items.push({
      id: 'approved-packages',
      title: 'Approved packages available',
      message: `${approved} shipment package(s) are ready for importer download.`,
      level: 'success',
      route: '/app/importer/shipments',
      createdAt: new Date().toISOString(),
      read: false,
    });
  }

  return items;
};

export const filterAuditEntriesForShipment = (
  shipment: ShipmentRecord,
  auditLogs: AuditLogEntry[],
  documents: DocumentRecord[],
  plots: PlotRecord[],
  batches: ProductionBatchRecord[],
) => {
  const relatedIds = new Set<string>([
    shipment.id,
    ...shipment.documentIds,
    ...shipment.plotIds,
    ...shipment.batchIds,
    ...documents.filter((document) => shipment.documentIds.includes(document.id)).map((document) => document.id),
    ...plots.filter((plot) => shipment.plotIds.includes(plot.id)).map((plot) => plot.id),
    ...batches.filter((batch) => shipment.batchIds.includes(batch.id) || batch.shipmentId === shipment.id).map((batch) => batch.id),
  ]);

  return auditLogs.filter((entry) => relatedIds.has(entry.entityId));
};
