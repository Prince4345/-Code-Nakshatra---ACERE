import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CompanyProfile,
  ComplianceReport,
  DocumentRecord,
  ExtractionRecord,
  FacilityRecord,
  InstallationRecord,
  PlotRecord,
  ProductionBatchRecord,
  ShipmentRecord,
  Supplier,
} from '../types';
import { arrayBufferToBase64, postMobileDownload } from './mobileBridge';

const addHeader = (doc: jsPDF, title: string, subtitle: string, statusLine?: string) => {
  doc.setFillColor(20, 35, 56);
  doc.rect(0, 0, 595, 88, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(title, 40, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(doc.splitTextToSize(subtitle, statusLine ? 390 : 515), 40, 62);
  if (statusLine) {
    doc.setFontSize(10);
    doc.text(statusLine, 555, 62, { align: 'right' });
  }
  doc.setTextColor(20, 35, 56);
};

const addSectionTitle = (doc: jsPDF, title: string, y: number) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 76, 92);
  doc.text(title.toUpperCase(), 40, y);
  doc.setTextColor(20, 35, 56);
};

const safeText = (value: unknown, fallback = 'N/A') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const compactText = (value: unknown, maxLength = 120, fallback = 'N/A') => {
  const text = safeText(value, fallback);
  if (text === fallback || text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
};

const evidenceRow = (label: string, value: unknown, maxLength = 120) => [
  label,
  compactText(value, maxLength),
];

const buildReferenceId = (prefix: string, id: string) =>
  `${prefix}-${id.replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase() || Date.now().toString(36).toUpperCase()}`;

const addSignatureBlock = (doc: jsPDF, y: number, verifier = 'Authorized verifier') => {
  doc.setDrawColor(210, 222, 235);
  doc.setFillColor(249, 251, 253);
  doc.roundedRect(40, y, 515, 92, 10, 10, 'FD');
  doc.setTextColor(20, 35, 56);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('VERIFICATION SIGN-OFF', 56, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(`Verifier: ${verifier}`, 56, y + 46);
  doc.text(`Signed date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 56, y + 64);
  doc.line(345, y + 62, 520, y + 62);
  doc.setFontSize(8);
  doc.setTextColor(90, 110, 130);
  doc.text('Digital signature / verifier stamp', 345, y + 78);
};

type ShipmentPdfContext = {
  shipment: ShipmentRecord;
  report: ComplianceReport | null;
  companyProfile: CompanyProfile | null;
  suppliers: Supplier[];
  plots: PlotRecord[];
  documents: DocumentRecord[];
  facilities: FacilityRecord[];
  installations: InstallationRecord[];
  batches: ProductionBatchRecord[];
  extractions: ExtractionRecord[];
};

const createShipmentReportPdfDocument = ({
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
}: ShipmentPdfContext) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const linkedSuppliers = suppliers.filter((supplier) => shipment.supplierIds.includes(supplier.id));
  const linkedPlots = plots.filter((plot) => shipment.plotIds.includes(plot.id));
  const linkedDocuments = documents.filter((item) => shipment.documentIds.includes(item.id));
  const linkedFacilities = facilities.filter((facility) => (shipment.facilityIds ?? []).includes(facility.id));
  const linkedInstallations = installations.filter((installation) => (shipment.installationIds ?? []).includes(installation.id));
  const linkedBatches = batches.filter((batch) => (shipment.batchIds ?? []).includes(batch.id) || batch.shipmentId === shipment.id);
  const linkedExtractions = extractions.filter((extraction) => linkedDocuments.some((documentItem) => documentItem.id === extraction.documentId));
  const generatedAt = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const exporterName = safeText(companyProfile?.tradeName || companyProfile?.legalEntityName, safeText(shipment.ownerId, 'Exporter account'));
  const importerName = `${safeText(shipment.destinationCountry)} importer`;
  const referenceId = buildReferenceId('CT-PACK', shipment.invoiceId || shipment.id);

  addHeader(
    doc,
    'Compliance Package Summary',
    'CarbonTrace AI official shipment evidence pack',
    generatedAt,
  );

  addSectionTitle(doc, 'Summary Cover', 120);
  autoTable(doc, {
    startY: 132,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 11, textColor: [20, 35, 56], cellPadding: 10, lineColor: [210, 222, 235] },
    headStyles: { fillColor: [238, 243, 248], textColor: [20, 35, 56] },
    body: [
      ['Shipment ID', safeText(shipment.invoiceId), 'Reference ID', referenceId],
      ['Generated Date', generatedAt, 'Package Version', 'v1.0'],
      ['Exporter', exporterName, 'Importer', importerName],
      ['EUDR Status', safeText(report?.eudr.status), 'CBAM Status', safeText(report?.cbam.status)],
      ['Verifier Decision', safeText(shipment.status), 'Overall Risk', safeText(report?.overall_shipment_risk)],
    ],
  });

  doc.setDrawColor(210, 222, 235);
  doc.setFillColor(247, 250, 252);
  doc.roundedRect(390, 216, 165, 72, 10, 10, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 76, 92);
  doc.text('SCAN / VERIFY', 410, 238);
  doc.setFontSize(8);
  doc.setTextColor(90, 110, 130);
  doc.text(doc.splitTextToSize(referenceId, 125), 410, 258);

  addSectionTitle(doc, 'Release Snapshot', (doc as any).lastAutoTable.finalY + 34);
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 46,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 11, textColor: [20, 35, 56], cellPadding: 8 },
    body: [
      ['Product', safeText(shipment.product)],
      ['Destination', safeText(shipment.destinationCountry)],
      ['EUDR DDS', report?.eudr.dds_ready ? 'Ready' : 'Pending'],
      ['CBAM Output', safeText(report?.cbam.status)],
      ['Linked Evidence', `${linkedSuppliers.length} supplier(s), ${linkedPlots.length} plot(s), ${linkedDocuments.length} document(s)`],
    ],
  });

  doc.setFillColor(255, 243, 232);
  doc.roundedRect(40, (doc as any).lastAutoTable.finalY + 28, 515, 56, 10, 10, 'F');
  doc.setTextColor(20, 35, 56);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Operational conclusion', 56, (doc as any).lastAutoTable.finalY + 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    report && report.eudr.status === 'COMPLIANT' && report.cbam.status !== 'NON_COMPLIANT'
      ? 'Ready for downstream review and importer reliance.'
      : 'Keep this package in review until open compliance gaps are closed.',
    56,
    (doc as any).lastAutoTable.finalY + 68,
    { maxWidth: 470 },
  );

  addSignatureBlock(doc, Math.min((doc as any).lastAutoTable.finalY + 108, 650), safeText(shipment.verifierId, 'Authorized verifier'));

  doc.addPage();
  addHeader(
    doc,
    'CarbonTrace Compliance Detail',
    `${shipment.invoiceId} | ${shipment.product}`,
    `Status: ${shipment.status}`,
  );

  addSectionTitle(doc, 'Shipment Summary', 120);
  autoTable(doc, {
    startY: 132,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 10, textColor: [20, 35, 56], cellPadding: 8 },
    headStyles: { fillColor: [238, 243, 248], textColor: [20, 35, 56] },
    body: [
      ['Invoice ID', safeText(shipment.invoiceId), 'Destination', safeText(shipment.destinationCountry)],
      ['Product', safeText(shipment.product), 'HS Code', safeText(shipment.hsCode)],
      ['Quantity', `${safeText(shipment.quantity)} ${safeText(shipment.unit, '')}`.trim(), 'Risk', safeText(report?.overall_shipment_risk)],
      ['Operator', safeText(companyProfile?.legalEntityName), 'Contact', safeText(companyProfile?.contactEmail)],
    ],
  });

  addSectionTitle(doc, 'Compliance Overview', (doc as any).lastAutoTable.finalY + 28);
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 40,
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 10, textColor: [20, 35, 56], cellPadding: 8 },
    head: [['Module', 'Status', 'Key Output', 'Notes']],
    body: [
      [
        'EUDR',
        safeText(report?.eudr.status),
        `${report?.eudr.plot_count ?? 0} plot(s)`,
        safeText(report?.eudr.non_compliance_reasons?.[0], report?.eudr.dds_ready ? 'DDS-ready evidence package' : 'Awaiting checks'),
      ],
      [
        'CBAM',
        safeText(report?.cbam.status),
        `${report?.cbam.reported_emissions_tCO2 ?? 0} tCO2`,
        report?.cbam.default_value_triggered ? 'Contains default or fallback values' : 'Measured inputs linked',
      ],
    ],
  });

  addSectionTitle(doc, 'Linked Evidence', (doc as any).lastAutoTable.finalY + 28);
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 40,
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 9, textColor: [20, 35, 56], cellPadding: 7 },
    head: [['Type', 'Name', 'Reference', 'Status']],
    body: [
      ...linkedSuppliers.map((supplier) => ['Supplier', supplier.name, supplier.region, supplier.commodity]),
      ...linkedPlots.map((plot) => ['Plot', plot.name, plot.areaHectares || 'N/A', plot.analysis?.status ?? 'PENDING']),
      ...linkedDocuments.map((documentItem) => [
        'Document',
        documentItem.fileName,
        documentItem.documentType,
        linkedExtractions.find((extraction) => extraction.documentId === documentItem.id)?.status ?? documentItem.ocrStatus ?? 'PENDING',
      ]),
      ...linkedInstallations.map((installation) => ['Installation', installation.name, installation.processType, installation.electricitySource]),
      ...linkedFacilities.map((facility) => ['Facility', facility.name, facility.region, facility.country]),
      ...linkedBatches.map((batch) => ['Batch', batch.batchCode, `${batch.quantity} ${batch.unit}`, `${batch.electricityKwh || 0} kWh`]),
    ],
  });

  const footerY = Math.min((doc as any).lastAutoTable.finalY + 34, 770);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 110, 130);
  doc.text(
    `Generated by CarbonTrace AI on ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`,
    40,
    footerY,
  );

  return {
    doc,
    fileName: `${safeText(shipment.invoiceId, shipment.id)}-compliance-report.pdf`,
  };
};

export const buildShipmentReportPdfAttachment = (context: ShipmentPdfContext) => {
  const { doc, fileName } = createShipmentReportPdfDocument(context);
  return {
    fileName,
    contentBase64: arrayBufferToBase64(doc.output('arraybuffer')),
    contentType: 'application/pdf',
  };
};

export const downloadShipmentReportPdf = (context: ShipmentPdfContext) => {
  const { doc, fileName } = createShipmentReportPdfDocument(context);
  if (
    postMobileDownload({
      fileName,
      contentType: 'application/pdf',
      contentBase64: arrayBufferToBase64(doc.output('arraybuffer')),
    })
  ) {
    return;
  }
  doc.save(fileName);
};

export const downloadDocumentEvidencePdf = (documentRecord: DocumentRecord, extraction?: ExtractionRecord | null) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const referenceId = buildReferenceId('CT-EVD', documentRecord.id || documentRecord.fileName);

  addHeader(
    doc,
    'CarbonTrace Evidence Record',
    `${documentRecord.fileName} | ${referenceId}`,
    safeText(extraction?.status ?? documentRecord.ocrStatus ?? 'PENDING'),
  );

  addSectionTitle(doc, 'Document Metadata', 120);
  autoTable(doc, {
    startY: 132,
    theme: 'grid',
    margin: { left: 40, right: 40 },
    tableWidth: 515,
    styles: {
      font: 'helvetica',
      fontSize: 10,
      textColor: [20, 35, 56],
      cellPadding: { top: 8, right: 10, bottom: 8, left: 10 },
      overflow: 'linebreak',
      minCellHeight: 24,
      valign: 'top',
    },
    headStyles: { fillColor: [238, 243, 248], textColor: [20, 35, 56] },
    columnStyles: {
      0: { cellWidth: 155, fontStyle: 'bold', textColor: [15, 76, 92], fillColor: [246, 249, 252] },
      1: { cellWidth: 360, fillColor: [255, 255, 255] },
    },
    alternateRowStyles: { fillColor: [250, 252, 255] },
    head: [['Field', 'Value']],
    body: [
      evidenceRow('Reference ID', referenceId, 90),
      evidenceRow('File name', documentRecord.fileName, 90),
      evidenceRow('Document category', documentRecord.documentType, 80),
      evidenceRow('Review status', extraction?.status ?? documentRecord.ocrStatus ?? 'PENDING', 80),
      evidenceRow('Linked shipment', documentRecord.linkedShipmentId, 80),
      evidenceRow('Linked batch', documentRecord.linkedBatchId, 80),
      evidenceRow('Linked facility', documentRecord.linkedFacilityId, 80),
      evidenceRow('Reviewer notes', documentRecord.notes, 180),
      evidenceRow('Source file', documentRecord.previewUrl ? 'Attached in workspace' : 'No preview URL', 90),
    ],
    didDrawCell: (data) => {
      doc.setDrawColor(226, 234, 242);
      doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
    },
  });

  if (extraction) {
    addSectionTitle(doc, 'Extracted Fields', (doc as any).lastAutoTable.finalY + 28);
    const extractedRows = Object.entries(extraction.extractedFields).map(([key, value]) => [
      key,
      compactText(value, 180),
      `${Math.round((extraction.fieldConfidences?.[key] ?? extraction.confidence ?? 0) * 100)}%`,
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 40,
      theme: 'striped',
      margin: { left: 40, right: 40 },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [20, 35, 56],
        cellPadding: 7,
        overflow: 'linebreak',
        valign: 'top',
      },
      headStyles: { fillColor: [34, 129, 178], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 150, fontStyle: 'bold' },
        1: { cellWidth: 275 },
        2: { cellWidth: 90, halign: 'right' },
      },
      head: [['Field', 'Value', 'Confidence']],
      body: extractedRows.length ? extractedRows : [['No extracted fields', 'Run extraction or review manually.', '0%']],
    });

    addSectionTitle(doc, 'Reviewer Notes', (doc as any).lastAutoTable.finalY + 28);
    const notesY = (doc as any).lastAutoTable.finalY + 42;
    doc.setFillColor(249, 251, 253);
    doc.setDrawColor(226, 234, 242);
    doc.roundedRect(40, notesY, 515, 86, 8, 8, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(20, 35, 56);
    doc.text(safeText(extraction.reviewerNotes, 'No reviewer notes recorded.'), 56, notesY + 26, {
      maxWidth: 480,
    });

    addSignatureBlock(doc, Math.min(notesY + 110, 650), 'Document reviewer');
  }

  const fileName = `${documentRecord.fileName.replace(/\.[^.]+$/, '')}-evidence.pdf`;
  if (
    postMobileDownload({
      fileName,
      contentType: 'application/pdf',
      contentBase64: arrayBufferToBase64(doc.output('arraybuffer')),
    })
  ) {
    return;
  }
  doc.save(fileName);
};

type HelpGuideId = 'cbam-installation' | 'eudr-dds' | 'erp-bridge';

const helpGuides: Record<HelpGuideId, {
  title: string;
  subtitle: string;
  fileName: string;
  purpose: string;
  sections: Array<{ heading: string; rows: Array<[string, string]> }>;
  checklist: string[];
}> = {
  'cbam-installation': {
    title: 'CBAM Installation Input Guide',
    subtitle: 'Facility, batch, fuel, electricity, and source evidence checklist',
    fileName: 'carbontrace-cbam-installation-input-guide.pdf',
    purpose:
      'Use this guide before creating CBAM-ready shipment summaries. It explains which production and energy records an exporter should collect so emissions inputs can be linked to a facility, batch, shipment, and supporting documents.',
    sections: [
      {
        heading: 'Core data to collect',
        rows: [
          ['Installation / facility', 'Legal facility name, address, process type, product stream, and operating period.'],
          ['Production batch', 'Batch code, product, HS code, production dates, output quantity, and unit.'],
          ['Fuel inputs', 'Fuel type, quantity, unit, invoice reference, and period covered.'],
          ['Electricity inputs', 'kWh consumed, billing period, grid/source type, and utility bill reference.'],
          ['Source evidence', 'Electricity bill, diesel/gas invoice, production log, purchase order, meter reading, and batch sheet.'],
        ],
      },
      {
        heading: 'How CarbonTrace uses it',
        rows: [
          ['Direct emissions', 'Fuel quantities are multiplied by fuel emission factors.'],
          ['Indirect emissions', 'Electricity kWh is multiplied by grid/source emission factors.'],
          ['Emission intensity', 'Total emissions are divided by production output.'],
          ['Shipment allocation', 'Shipment quantity is multiplied by product emission intensity.'],
        ],
      },
    ],
    checklist: [
      'Create facility and installation record.',
      'Create production batch and link it to facility.',
      'Upload fuel, electricity, and production evidence.',
      'Review extracted values before using them in reports.',
      'Link the batch to a shipment before generating the package.',
    ],
  },
  'eudr-dds': {
    title: 'EUDR DDS Preparation Guide',
    subtitle: 'Operator, product, shipment, supplier, and plot-coordinate checklist',
    fileName: 'carbontrace-eudr-dds-preparation-guide.pdf',
    purpose:
      'Use this guide before preparing EUDR-style due diligence evidence. It helps exporters collect the identity, product, supplier, and geolocation details needed for plot-level screening and verifier review.',
    sections: [
      {
        heading: 'Core data to collect',
        rows: [
          ['Operator / exporter', 'Legal name, registration numbers, address, contact person, and country of operation.'],
          ['Product and shipment', 'Commodity, HS code, quantity, origin country, destination country, invoice, and shipment ID.'],
          ['Supplier', 'Supplier name, type, region, country, commodity, and declaration document.'],
          ['Plot geometry', 'Farm/plot boundary as map polygon or GeoJSON with coordinates.'],
          ['Supporting evidence', 'Supplier declaration, land/farm document, invoice, packing list, and certificate of origin if available.'],
        ],
      },
      {
        heading: 'How CarbonTrace uses it',
        rows: [
          ['Plot analysis', 'Geometry is screened using geospatial datasets for EUDR-style risk indicators.'],
          ['Cutoff logic', 'Verifier checks whether post-cutoff deforestation risk signals are present.'],
          ['Evidence review', 'Supplier, plot, shipment, and document details are compared before approval.'],
          ['Importer package', 'Approved DDS evidence, report summary, and GeoJSON can be shared downstream.'],
        ],
      },
    ],
    checklist: [
      'Complete exporter profile.',
      'Create supplier record and attach supplier declaration.',
      'Draw plot or upload GeoJSON.',
      'Run EUDR analysis and review status.',
      'Link plot and documents to shipment before verifier submission.',
    ],
  },
  'erp-bridge': {
    title: 'ERP / Tally Import Guide',
    subtitle: 'Accounting, purchase, utility, and invoice evidence preparation',
    fileName: 'carbontrace-erp-tally-import-guide.pdf',
    purpose:
      'Use this guide when bringing accounting or ERP records into the evidence workflow. It explains how purchase logs, invoices, utilities, and bill data should be organized before upload or manual entry.',
    sections: [
      {
        heading: 'Core data to collect',
        rows: [
          ['Invoice records', 'Invoice ID, supplier/customer name, date, product, quantity, amount, and currency.'],
          ['Utility records', 'Electricity bill number, billing period, kWh, facility, and source file.'],
          ['Fuel records', 'Fuel invoice, fuel type, quantity, unit, supplier, and linked facility/batch.'],
          ['Purchase logs', 'Material supplier, purchase quantity, date, invoice reference, and commodity/product stream.'],
          ['Document references', 'File names or IDs that connect each accounting row to uploaded proof.'],
        ],
      },
      {
        heading: 'How CarbonTrace uses it',
        rows: [
          ['Evidence linking', 'Accounting rows help connect uploaded bills to shipments, batches, and facilities.'],
          ['OCR review', 'Extracted invoice and bill fields can be checked against accounting records.'],
          ['CBAM readiness', 'Utility and fuel records support emissions input calculations.'],
          ['Audit trail', 'Each reviewed value can be traced back to a source document.'],
        ],
      },
    ],
    checklist: [
      'Export invoices or ledgers from ERP/Tally.',
      'Clean supplier names and invoice IDs.',
      'Upload matching source PDFs or images.',
      'Review extracted values in CarbonTrace.',
      'Link reviewed records to facilities, batches, and shipments.',
    ],
  },
};

export const downloadHelpGuidePdf = (guideId: HelpGuideId) => {
  const guide = helpGuides[guideId];
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  addHeader(doc, guide.title, guide.subtitle, 'MSME guide');

  addSectionTitle(doc, 'Purpose', 120);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(20, 35, 56);
  doc.text(guide.purpose, 40, 142, { maxWidth: 515, lineHeightFactor: 1.35 });

  let cursorY = 210;
  guide.sections.forEach((section) => {
    addSectionTitle(doc, section.heading, cursorY);
    autoTable(doc, {
      startY: cursorY + 12,
      theme: 'striped',
      margin: { left: 40, right: 40 },
      styles: {
        font: 'helvetica',
        fontSize: 9.5,
        textColor: [20, 35, 56],
        cellPadding: 8,
        overflow: 'linebreak',
        valign: 'top',
      },
      headStyles: { fillColor: [20, 35, 56], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 150, fontStyle: 'bold', textColor: [15, 76, 92] },
        1: { cellWidth: 365 },
      },
      head: [['Input area', 'What to prepare']],
      body: section.rows,
    });
    cursorY = (doc as any).lastAutoTable.finalY + 34;
  });

  addSectionTitle(doc, 'Exporter checklist', cursorY);
  autoTable(doc, {
    startY: cursorY + 12,
    theme: 'plain',
    margin: { left: 40, right: 40 },
    styles: {
      font: 'helvetica',
      fontSize: 10,
      textColor: [20, 35, 56],
      cellPadding: 7,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 42, halign: 'center', fontStyle: 'bold', textColor: [255, 125, 53] },
      1: { cellWidth: 473 },
    },
    body: guide.checklist.map((item, index) => [`${index + 1}`, item]),
    didDrawCell: (data) => {
      doc.setDrawColor(226, 234, 242);
      doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
    },
  });

  const footerY = 792;
  doc.setFillColor(255, 243, 232);
  doc.roundedRect(40, footerY - 54, 515, 42, 8, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 35, 56);
  doc.text('CarbonTrace AI note:', 56, footerY - 30);
  doc.setFont('helvetica', 'normal');
  doc.text('Use this as preparation guidance; final compliance needs reviewed source evidence.', 160, footerY - 30, {
    maxWidth: 360,
  });

  if (
    postMobileDownload({
      fileName: guide.fileName,
      contentType: 'application/pdf',
      contentBase64: arrayBufferToBase64(doc.output('arraybuffer')),
    })
  ) {
    return;
  }
  doc.save(guide.fileName);
};
