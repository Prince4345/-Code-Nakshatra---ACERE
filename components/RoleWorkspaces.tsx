import React, { useEffect, useMemo, useState } from 'react';
import ComplianceReportCard from './ComplianceReportCard';
import {
  AuditLogEntry,
  CompanyProfile,
  DocumentRecord,
  ExtractionRecord,
  FacilityRecord,
  InstallationRecord,
  PlotRecord,
  ProductionBatchRecord,
  ShipmentRecord,
} from '../types';

type DownloadHandler = (shipment: ShipmentRecord) => void;

const toneForStatus = (status: ShipmentRecord['status']) => {
  if (status === 'APPROVED') return 'is-good';
  if (status === 'REJECTED') return 'is-bad';
  return 'is-neutral';
};

const formatStatusLabel = (value: string) => value.replace(/_/g, ' ');

const getExporterProfile = (shipment: ShipmentRecord, companyProfiles: CompanyProfile[]) =>
  companyProfiles.find((profile) => profile.id === shipment.ownerId) ?? null;

const getExporterName = (shipment: ShipmentRecord, companyProfiles: CompanyProfile[]) => {
  const profile = getExporterProfile(shipment, companyProfiles);
  return profile?.tradeName || profile?.legalEntityName || shipment.exporterReferenceId || 'Exporter account';
};

const importerDocumentPriority = (documentType: string) => {
  const normalized = documentType.toLowerCase();
  if (['shipment document', 'supplier declaration', 'land record', 'purchase order'].includes(normalized)) return 2;
  if (['production log', 'electricity bill', 'fuel invoice'].includes(normalized)) return 1;
  return 0;
};

const getLinkedShipmentDocuments = (shipment: ShipmentRecord, documents: DocumentRecord[]) =>
  documents.filter((document) => shipment.documentIds.includes(document.id));

const getReviewedDocumentCount = (linkedDocuments: DocumentRecord[], extractions: ExtractionRecord[]) =>
  linkedDocuments.filter((document) =>
    extractions.some((extraction) => extraction.documentId === document.id && extraction.status === 'REVIEWED'),
  ).length;

const getImporterVisibleDocuments = (linkedDocuments: DocumentRecord[]) => {
  const prioritizedDocuments = [...linkedDocuments]
    .filter((document) => importerDocumentPriority(document.documentType) > 0)
    .sort(
      (left, right) =>
        importerDocumentPriority(right.documentType) - importerDocumentPriority(left.documentType) ||
        left.fileName.localeCompare(right.fileName),
    );
  return prioritizedDocuments.length ? prioritizedDocuments : linkedDocuments;
};

const isLowFrictionPackage = (shipment: ShipmentRecord, linkedDocuments: DocumentRecord[], extractions: ExtractionRecord[]) => {
  const reviewedCount = getReviewedDocumentCount(linkedDocuments, extractions);
  return (
    shipment.status === 'APPROVED' &&
    shipment.report?.overall_shipment_risk === 'LOW' &&
    Boolean(shipment.report?.eudr.dds_ready) &&
    shipment.report?.cbam.status !== 'NON_COMPLIANT' &&
    (linkedDocuments.length === 0 || reviewedCount === linkedDocuments.length)
  );
};

const metricCard = (label: string, value: string | number, detail: string) => (
  <div className="ct-card ct-stat ct-metric-card">
    <div className="ct-card-overline">{label}</div>
    <div className="ct-stat-value">{value}</div>
    <div className="ct-note">{detail}</div>
  </div>
);

const EmptyState = ({
  eyebrow,
  title,
  body,
  steps,
}: {
  eyebrow: string;
  title: string;
  body: string;
  steps: string[];
}) => (
  <section className="ct-empty-state-dark ct-empty-state-premium">
    <div className="ct-card-head">
      <div className="ct-card-overline">{eyebrow}</div>
      <h3 className="ct-card-title">{title}</h3>
      <p className="ct-card-copy">{body}</p>
    </div>
    <div className="ct-empty-step-grid">
      {steps.map((step, index) => (
        <div key={step} className="ct-empty-step">
          <span>0{index + 1}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </div>
  </section>
);

const SegmentedFilter = <T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}) => (
  <div className="ct-field ct-field-compact">
    <span>{label}</span>
    <div className="ct-segmented">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`ct-segmented-button ${value === option.value ? 'is-active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

const ProgressMeter = ({
  label,
  value,
  max,
  detail,
}: {
  label: string;
  value: number;
  max: number;
  detail: string;
}) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="ct-progress-card">
      <div className="ct-progress-head">
        <strong>{label}</strong>
        <span>{pct}%</span>
      </div>
      <div className="ct-progress-bar">
        <div className="ct-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p>{detail}</p>
    </div>
  );
};

const PreviewPanel = ({
  title,
  documents,
  selectedDocumentId,
  onSelectDocument,
  extractions,
  onDownloadDocumentPdf,
}: {
  title: string;
  documents: DocumentRecord[];
  selectedDocumentId: string;
  onSelectDocument: (documentId: string) => void;
  extractions: ExtractionRecord[];
  onDownloadDocumentPdf?: (document: DocumentRecord) => void;
}) => {
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) ?? documents[0] ?? null;
  const selectedExtraction = selectedDocument
    ? extractions.find((extraction) => extraction.documentId === selectedDocument.id)
    : null;

  return (
    <div className="ct-card ct-stack">
      <div className="ct-section-head">
        <div className="ct-card-head">
          <div className="ct-card-overline">{title}</div>
          <h2 className="ct-card-title">Preview linked evidence</h2>
          <p className="ct-card-copy">Open the few files that matter for this shipment.</p>
        </div>
        {selectedDocument?.previewUrl ? (
          <a className="ct-link-inline" href={selectedDocument.previewUrl} target="_blank" rel="noreferrer">
            Open full file
          </a>
        ) : null}
      </div>
      {!documents.length ? (
        <div className="ct-note">No linked files yet.</div>
      ) : (
        <div className="ct-preview-layout">
          <div className="ct-preview-rail">
            {documents.map((document) => {
              const extraction = extractions.find((entry) => entry.documentId === document.id);
              const active = document.id === selectedDocument?.id;
              return (
                <button
                  key={document.id}
                  type="button"
                  className={`ct-preview-item ${active ? 'is-active' : ''}`}
                  onClick={() => onSelectDocument(document.id)}
                >
                  <strong>{document.fileName}</strong>
                  <span>{document.documentType}</span>
                  <small>{extraction?.status ?? document.ocrStatus ?? 'PENDING'}</small>
                </button>
              );
            })}
          </div>
          <div className="ct-document-preview-card">
            <div className="ct-document-preview-header">
              <div>
                <strong>{selectedDocument?.fileName ?? 'Document preview'}</strong>
                <div className="ct-note">
                  {selectedDocument?.documentType ?? 'No document selected'}
                  {selectedExtraction ? ` / ${Math.round(selectedExtraction.confidence * 100)}% confidence` : ''}
                </div>
              </div>
              {selectedDocument && onDownloadDocumentPdf ? (
                <button className="ct-link-button" onClick={() => onDownloadDocumentPdf(selectedDocument)}>
                  PDF
                </button>
              ) : null}
            </div>
            {selectedDocument?.previewUrl ? (
              <iframe
                key={selectedDocument.id}
                className="ct-document-preview-frame"
                src={selectedDocument.previewUrl}
                title={selectedDocument.fileName}
              />
            ) : (
              <div className="ct-map-empty">
                <div>
                  <strong>Preview unavailable</strong>
                  <p>The document is linked but does not have a preview URL yet.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

type ReportCenterWorkspaceProps = {
  shipments: ShipmentRecord[];
  approvedCount: number;
  onDownloadPdf: DownloadHandler;
  onDownloadJson: DownloadHandler;
  onDownloadXml: DownloadHandler;
  onDownloadPackage: DownloadHandler;
  onDownloadDds: DownloadHandler;
  onDownloadCbamCsv: DownloadHandler;
};

export const ReportCenterWorkspace: React.FC<ReportCenterWorkspaceProps> = ({
  shipments,
  approvedCount,
  onDownloadPdf,
  onDownloadJson,
  onDownloadXml,
  onDownloadPackage,
  onDownloadDds,
  onDownloadCbamCsv,
}) => {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');
  const [readinessFilter, setReadinessFilter] = useState<'ALL' | 'READY' | 'ATTENTION'>('ALL');

  const reportShipments = useMemo(
    () =>
      shipments.filter(
        (shipment): shipment is ShipmentRecord & { report: NonNullable<ShipmentRecord['report']> } =>
          Boolean(shipment.report),
      ),
    [shipments],
  );

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reportShipments.filter((shipment) => {
      const matchesQuery =
        !query ||
        `${shipment.invoiceId} ${shipment.product} ${shipment.destinationCountry} ${shipment.productCategory}`
          .toLowerCase()
          .includes(query);
      const matchesRisk =
        riskFilter === 'ALL' || shipment.report.overall_shipment_risk === riskFilter;
      const isReady =
        shipment.report.eudr.dds_ready &&
        shipment.report.cbam.status !== 'NON_COMPLIANT' &&
        shipment.status === 'APPROVED';
      const matchesReadiness =
        readinessFilter === 'ALL' ||
        (readinessFilter === 'READY' ? isReady : !isReady);
      return matchesQuery && matchesRisk && matchesReadiness;
    });
  }, [readinessFilter, reportShipments, riskFilter, search]);

  const readyPacks = filteredShipments.filter(
    (shipment) =>
      shipment.report.eudr.dds_ready &&
      shipment.report.cbam.status !== 'NON_COMPLIANT' &&
      shipment.status === 'APPROVED',
  ).length;
  const attentionCount = filteredShipments.filter(
    (shipment) =>
      shipment.report.overall_shipment_risk !== 'LOW' ||
      shipment.report.cbam.status === 'NON_COMPLIANT' ||
      shipment.report.eudr.status !== 'COMPLIANT',
  ).length;
  const destinationCount = new Set(filteredShipments.map((shipment) => shipment.destinationCountry)).size;
  const totalEmissions = filteredShipments.reduce(
    (sum, shipment) => sum + (shipment.report.cbam.reported_emissions_tCO2 ?? 0),
    0,
  );
  const riskDistribution = {
    LOW: filteredShipments.filter((shipment) => shipment.report.overall_shipment_risk === 'LOW').length,
    MEDIUM: filteredShipments.filter((shipment) => shipment.report.overall_shipment_risk === 'MEDIUM').length,
    HIGH: filteredShipments.filter((shipment) => shipment.report.overall_shipment_risk === 'HIGH').length,
  };

  return (
    <div className="ct-stack">
      <section className="ct-hero ct-report-center-hero">
        <div className="ct-hero-copy">
          <div className="ct-badge">REPORTS</div>
          <h2>Release packs</h2>
          <p className="ct-hero-lead">Approve. Export. Share.</p>
        </div>
        <div className="ct-hero-metrics">
          <div className="ct-hero-metric">
            <span>Approved</span>
            <strong>{approvedCount}</strong>
            <small>signed</small>
          </div>
          <div className="ct-hero-metric">
            <span>Ready</span>
            <strong>{readyPacks}</strong>
            <small>DDS + CBAM</small>
          </div>
        </div>
      </section>

      <section className="ct-card ct-stack">
        <div className="ct-section-head">
          <div className="ct-card-head">
            <div className="ct-card-overline">Summary</div>
            <h2 className="ct-card-title">Search and release</h2>
            <p className="ct-card-copy">{filteredShipments.length} package(s) in view.</p>
          </div>
        </div>
        <div className="ct-toolbar-grid">
          <label className="ct-field">
            <span>Search shipment</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Invoice, product, destination, category"
            />
          </label>
          <SegmentedFilter
            label="Risk"
            value={riskFilter}
            onChange={setRiskFilter}
            options={[
              { label: 'All', value: 'ALL' },
              { label: 'Low', value: 'LOW' },
              { label: 'Medium', value: 'MEDIUM' },
              { label: 'High', value: 'HIGH' },
            ]}
          />
          <SegmentedFilter
            label="Readiness"
            value={readinessFilter}
            onChange={setReadinessFilter}
            options={[
              { label: 'All', value: 'ALL' },
              { label: 'Ready', value: 'READY' },
              { label: 'Attention', value: 'ATTENTION' },
            ]}
          />
        </div>
      </section>

      {!filteredShipments.length ? (
        <EmptyState
          eyebrow="REPORT ONBOARDING"
          title="No release packs match this view."
          body="Approved and structured shipments appear here."
          steps={[
            'Link the shipment evidence.',
            'Run EUDR and CBAM checks.',
            'Approve the final package.',
          ]}
        />
      ) : (
        <>
          <div className="ct-grid four">
            {metricCard('Ready Packs', readyPacks, 'Operationally ready for importer handoff.')}
            {metricCard('Needs Attention', attentionCount, 'Higher-risk or incomplete package states.')}
            {metricCard('EU Destinations', destinationCount, 'Distinct importing destinations in this view.')}
            {metricCard('Reported Emissions', `${totalEmissions.toFixed(1)} tCO2`, 'Shipment-level CBAM total currently surfaced.')}
          </div>

          <section className="ct-grid two">
            <div className="ct-card ct-stack">
            <div className="ct-card-head">
              <div className="ct-card-overline">Risks</div>
              <h3 className="ct-card-title">Risk mix</h3>
                <p className="ct-card-copy">Move ready packs. Hold risky ones.</p>
            </div>
              <ProgressMeter label="Low risk" value={riskDistribution.LOW} max={filteredShipments.length} detail={`${riskDistribution.LOW} package(s) ready for low-friction release.`} />
              <ProgressMeter label="Medium risk" value={riskDistribution.MEDIUM} max={filteredShipments.length} detail={`${riskDistribution.MEDIUM} package(s) need reviewer attention before handoff.`} />
              <ProgressMeter label="High risk" value={riskDistribution.HIGH} max={filteredShipments.length} detail={`${riskDistribution.HIGH} package(s) should stay blocked from release.`} />
            </div>
            <div className="ct-card ct-stack">
            <div className="ct-card-head">
              <div className="ct-card-overline">Actions</div>
              <h3 className="ct-card-title">Release guidance</h3>
                <p className="ct-card-copy">One simple release rule.</p>
            </div>
              <div className="ct-guidance-list">
                <div className="ct-guidance-item">
                  <strong>Release now</strong>
                  <p>Approved + DDS-ready + CBAM clear.</p>
                </div>
                <div className="ct-guidance-item">
                  <strong>Review before release</strong>
                  <p>Medium risk or default values.</p>
                </div>
                <div className="ct-guidance-item">
                  <strong>Hold</strong>
                  <p>Rejected or non-compliant.</p>
                </div>
              </div>
            </div>
          </section>

          <div className="ct-grid two">
            {filteredShipments.map((shipment) => {
              const readyToRelease =
                shipment.report.eudr.dds_ready &&
                shipment.report.cbam.status !== 'NON_COMPLIANT' &&
                shipment.status === 'APPROVED';

              return (
                <section key={shipment.id} className="ct-card ct-stack">
                  <div className="ct-section-head">
                    <div className="ct-card-head">
                      <div className="ct-card-overline">Package</div>
                      <h2 className="ct-card-title">{shipment.invoiceId}</h2>
                      <p className="ct-card-copy">{shipment.product} / {shipment.destinationCountry}</p>
                    </div>
                    <span className={`ct-status-pill ${readyToRelease ? 'is-good' : 'is-neutral'}`}>
                      {readyToRelease ? 'Release ready' : 'Needs attention'}
                    </span>
                  </div>
                  <div className="ct-guided-grid">
                    <div className="ct-guided-block">
                      <div className="ct-card-overline">Summary</div>
                      <div className="ct-readiness-list">
                        <div className="ct-readiness-item is-neutral">
                          <strong>Shipment</strong>
                          <span>{formatStatusLabel(shipment.status)}</span>
                        </div>
                        <div className={`ct-readiness-item ${shipment.report.eudr.status === 'COMPLIANT' ? 'is-good' : 'is-neutral'}`}>
                          <strong>EUDR</strong>
                          <span>{formatStatusLabel(shipment.report.eudr.status)}</span>
                        </div>
                        <div className={`ct-readiness-item ${shipment.report.cbam.status === 'NON_COMPLIANT' ? 'is-neutral' : 'is-good'}`}>
                          <strong>CBAM</strong>
                          <span>{formatStatusLabel(shipment.report.cbam.status)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="ct-guided-block is-soft">
                      <div className="ct-card-overline">Actions</div>
                      <div className="ct-card-copy">
                        {readyToRelease ? 'Ready for handoff.' : 'Keep in review.'}
                      </div>
                      <div className="ct-card-actions">
                        <button className="ct-primary-button" onClick={() => onDownloadPackage(shipment)}>
                          Download package
                        </button>
                        <button className="ct-link-button" onClick={() => onDownloadPdf(shipment)}>
                          PDF
                        </button>
                        <button className="ct-link-button" onClick={() => onDownloadDds(shipment)}>
                          DDS
                        </button>
                        <button className="ct-link-button" onClick={() => onDownloadCbamCsv(shipment)}>
                          CBAM
                        </button>
                      </div>
                    </div>
                  </div>
                  <details className="ct-inline-details">
                    <summary>Report preview</summary>
                    <ComplianceReportCard
                      shipment={shipment}
                      report={shipment.report}
                      onDownloadJson={() => onDownloadJson(shipment)}
                      onDownloadXml={() => onDownloadXml(shipment)}
                      onDownloadPackage={() => onDownloadPackage(shipment)}
                    />
                  </details>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

type ShipmentReadinessCard = {
  shipment: ShipmentRecord;
  exporterName: string;
  reviewedDocuments: number;
  totalDocuments: number;
  linkedBatchCount: number;
  isReady: boolean;
};

const buildImporterCards = ({
  shipments,
  documents,
  batches,
  extractions,
  companyProfiles,
}: {
  shipments: ShipmentRecord[];
  documents: DocumentRecord[];
  batches: ProductionBatchRecord[];
  extractions: ExtractionRecord[];
  companyProfiles: CompanyProfile[];
}): ShipmentReadinessCard[] =>
  shipments.map((shipment) => {
    const reviewedDocuments = documents.filter(
      (document) =>
        shipment.documentIds.includes(document.id) &&
        extractions.some(
          (extraction) => extraction.documentId === document.id && extraction.status === 'REVIEWED',
        ),
    ).length;
    const linkedBatchCount = batches.filter(
      (batch) => shipment.batchIds?.includes(batch.id) || batch.shipmentId === shipment.id,
    ).length;
    const exporterName = getExporterName(shipment, companyProfiles);
    const isReady =
      shipment.status === 'APPROVED' &&
      Boolean(shipment.report?.eudr.dds_ready) &&
      shipment.report?.cbam.status !== 'NON_COMPLIANT' &&
      (shipment.documentIds.length === 0 || reviewedDocuments === shipment.documentIds.length);
    return {
      shipment,
      exporterName,
      reviewedDocuments,
      totalDocuments: shipment.documentIds.length,
      linkedBatchCount,
      isReady,
    };
  });

type ImporterReadinessWorkspaceProps = {
  shipments: ShipmentRecord[];
  documents: DocumentRecord[];
  batches: ProductionBatchRecord[];
  extractions: ExtractionRecord[];
  companyProfiles: CompanyProfile[];
  onOpenShipment: (shipmentId: string) => void;
};

export const ImporterReadinessWorkspace: React.FC<ImporterReadinessWorkspaceProps> = ({
  shipments,
  documents,
  batches,
  extractions,
  companyProfiles,
  onOpenShipment,
}) => {
  const [search, setSearch] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('ALL');
  const [packageFilter, setPackageFilter] = useState<'ALL' | 'READY' | 'WATCH'>('ALL');

  const shipmentCards = useMemo(
    () => buildImporterCards({ shipments, documents, batches, extractions, companyProfiles }),
    [batches, companyProfiles, documents, extractions, shipments],
  );

  const destinationOptions = useMemo(
    () => ['ALL', ...Array.from(new Set(shipments.map((shipment) => shipment.destinationCountry))).sort()],
    [shipments],
  );

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();
    return shipmentCards.filter(({ shipment, exporterName, isReady }) => {
      const matchesQuery =
        !query ||
        `${exporterName} ${shipment.invoiceId} ${shipment.product} ${shipment.destinationCountry} ${shipment.exporterReferenceId ?? ''} ${shipment.importerId ?? ''}`
          .toLowerCase()
          .includes(query);
      const matchesDestination =
        destinationFilter === 'ALL' || shipment.destinationCountry === destinationFilter;
      const matchesPackageFilter =
        packageFilter === 'ALL' ||
        (packageFilter === 'READY' ? isReady : !isReady);
      return matchesQuery && matchesDestination && matchesPackageFilter;
    });
  }, [destinationFilter, packageFilter, search, shipmentCards]);

  const readyCount = filteredCards.filter((card) => card.isReady).length;
  const watchCount = filteredCards.length - readyCount;
  const averageDocumentCoverage = filteredCards.length
    ? Math.round(
        filteredCards.reduce(
          (sum, card) =>
            sum + (card.totalDocuments ? card.reviewedDocuments / card.totalDocuments : 1),
          0,
        ) / filteredCards.length * 100,
      )
    : 0;

  return (
    <div className="ct-stack">
      <section className="ct-hero">
        <div className="ct-hero-copy">
          <div className="ct-badge">IMPORTER READINESS</div>
          <h2>Search exporters. Open the right package.</h2>
          <p className="ct-hero-lead">Find the handoff pack that is actually ready to use.</p>
        </div>
        <div className="ct-hero-metrics">
          <div className="ct-hero-metric">
            <span>Ready packages</span>
            <strong>{readyCount}</strong>
            <small>fully screened and importer-safe</small>
          </div>
          <div className="ct-hero-metric">
            <span>Watchlist</span>
            <strong>{watchCount}</strong>
            <small>still needs evidence or risk review</small>
          </div>
        </div>
      </section>

      <section className="ct-card ct-stack">
        <div className="ct-card-head">
          <div className="ct-card-overline">Summary</div>
          <h2 className="ct-card-title">Importer search</h2>
          <p className="ct-card-copy">Search by exporter, invoice, destination, or package state.</p>
        </div>
        <div className="ct-toolbar-grid">
          <label className="ct-field">
            <span>Search exporter or invoice</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Exporter, invoice, product, destination"
            />
          </label>
          <label className="ct-field">
            <span>Destination</span>
            <select value={destinationFilter} onChange={(event) => setDestinationFilter(event.target.value)}>
              {destinationOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'ALL' ? 'All destinations' : option}
                </option>
              ))}
            </select>
          </label>
          <SegmentedFilter
            label="Package state"
            value={packageFilter}
            onChange={setPackageFilter}
            options={[
              { label: 'All', value: 'ALL' },
              { label: 'Ready', value: 'READY' },
              { label: 'Watch', value: 'WATCH' },
            ]}
          />
        </div>
      </section>

      {!filteredCards.length ? (
        <EmptyState
          eyebrow="IMPORTER ONBOARDING"
          title="No approved packages fit this search yet."
          body="Approved and released shipment packs appear here."
          steps={[
            'Approve the shipment.',
            'Review the linked documents.',
            'Open the importer package.',
          ]}
        />
      ) : (
        <>
          <div className="ct-grid four">
            {metricCard('Visible Packages', filteredCards.length, 'Importer-facing shipment packages in this view.')}
            {metricCard('Ready To Open', readyCount, 'Packages that can move directly into importer use.')}
            {metricCard('Destinations', new Set(filteredCards.map((card) => card.shipment.destinationCountry)).size, 'Distinct destination markets covered right now.')}
            {metricCard('Document Coverage', `${averageDocumentCoverage}%`, 'Average reviewed-document coverage across visible packages.')}
          </div>

          <div className="ct-package-grid">
            {filteredCards.map((card) => {
              const documentCoverage = card.totalDocuments
                ? Math.round((card.reviewedDocuments / card.totalDocuments) * 100)
                : 100;
              return (
                <article key={card.shipment.id} className="ct-package-card">
                  <div className="ct-package-card-top">
                    <div>
                      <div className="ct-badge">EXPORTER PACKAGE</div>
                      <h3>{card.exporterName}</h3>
                      <p>{card.shipment.invoiceId} / {card.shipment.product}</p>
                    </div>
                    <span className={`ct-status-pill ${card.isReady ? 'is-good' : 'is-neutral'}`}>
                      {card.isReady ? 'Ready' : 'Watch'}
                    </span>
                  </div>
                  <div className="ct-package-meta">
                    <div>
                      <span>Destination</span>
                      <strong>{card.shipment.destinationCountry}</strong>
                    </div>
                    <div>
                      <span>EUDR</span>
                      <strong>{card.shipment.report?.eudr.status ?? 'Pending'}</strong>
                    </div>
                    <div>
                      <span>CBAM</span>
                      <strong>{card.shipment.report?.cbam.status ?? 'Pending'}</strong>
                    </div>
                  </div>
                  <ProgressMeter
                    label="Document review"
                    value={documentCoverage}
                    max={100}
                    detail={`${card.reviewedDocuments}/${card.totalDocuments || 0} linked document(s) reviewed.`}
                  />
                  <div className="ct-package-actions">
                    <div className="ct-note">{card.linkedBatchCount} production batch link(s)</div>
                    <button className="ct-primary-button" onClick={() => onOpenShipment(card.shipment.id)}>
                      Open package
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

type ImporterPackagesWorkspaceProps = {
  shipments: ShipmentRecord[];
  companyProfiles: CompanyProfile[];
  documents: DocumentRecord[];
  extractions: ExtractionRecord[];
  activeShipmentId: string;
  onOpenShipment: (shipmentId: string) => void;
  onDownloadPdf: DownloadHandler;
  onDownloadJson: DownloadHandler;
  onDownloadXml: DownloadHandler;
  onDownloadPackage: DownloadHandler;
};

export const ImporterPackagesWorkspace: React.FC<ImporterPackagesWorkspaceProps> = ({
  shipments,
  companyProfiles,
  documents,
  extractions,
  activeShipmentId,
  onOpenShipment,
  onDownloadPdf,
  onDownloadJson,
  onDownloadXml,
  onDownloadPackage,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW' | 'WATCH'>('ALL');

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return shipments.filter((shipment) => {
      const exporterName = getExporterName(shipment, companyProfiles).toLowerCase();
      const linkedDocuments = getLinkedShipmentDocuments(shipment, documents);
      const matchesQuery =
        !query ||
        `${exporterName} ${shipment.invoiceId} ${shipment.product} ${shipment.destinationCountry}`
          .toLowerCase()
          .includes(query);
      const isLowFriction = isLowFrictionPackage(shipment, linkedDocuments, extractions);
      const matchesFilter =
        statusFilter === 'ALL' ||
        (statusFilter === 'LOW' ? isLowFriction : !isLowFriction);
      return matchesQuery && matchesFilter;
    });
  }, [companyProfiles, documents, extractions, search, shipments, statusFilter]);

  const readyCount = filteredShipments.filter((shipment) =>
    isLowFrictionPackage(shipment, getLinkedShipmentDocuments(shipment, documents), extractions),
  ).length;
  const visibleDocumentCount = filteredShipments.reduce(
    (sum, shipment) => sum + getLinkedShipmentDocuments(shipment, documents).length,
    0,
  );
  const reviewedDocumentCount = filteredShipments.reduce(
    (sum, shipment) => sum + getReviewedDocumentCount(getLinkedShipmentDocuments(shipment, documents), extractions),
    0,
  );

  return (
    <section className="ct-stack">
      <section className="ct-hero ct-importer-hero">
        <div className="ct-hero-copy">
          <div className="ct-badge">IMPORTER</div>
          <h2>Approved packages</h2>
          <p className="ct-hero-lead">Search, open, download.</p>
        </div>
        <div className="ct-hero-metrics">
          <div className="ct-hero-metric">
            <span>Ready</span>
            <strong>{readyCount}</strong>
            <small>packages</small>
          </div>
          <div className="ct-hero-metric">
            <span>Files</span>
            <strong>{reviewedDocumentCount}/{visibleDocumentCount}</strong>
            <small>reviewed</small>
          </div>
        </div>
      </section>

      <section className="ct-card ct-stack">
        <div className="ct-section-head">
          <div className="ct-card-head">
            <div className="ct-card-overline">Package index</div>
            <h2 className="ct-card-title">Approved shipment library</h2>
            <p className="ct-card-copy">Open one package, then use inline exports if needed.</p>
          </div>
        </div>
        <div className="ct-toolbar-grid">
          <label className="ct-field">
            <span>Search package</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Exporter, invoice, product, destination"
            />
          </label>
          <SegmentedFilter
            label="Risk view"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: 'All', value: 'ALL' },
              { label: 'Low friction', value: 'LOW' },
              { label: 'Watchlist', value: 'WATCH' },
            ]}
          />
        </div>
      </section>

      {!filteredShipments.length ? (
        <EmptyState
          eyebrow="PACKAGE INDEX"
          title="No approved importer packages yet."
          body="Approved shipment packs will appear here."
          steps={[
            'Approve the shipment.',
            'Generate release outputs.',
            'Open the package.',
          ]}
        />
      ) : (
        <div className="ct-package-grid">
          {filteredShipments.map((shipment) => {
            const exporterName = getExporterName(shipment, companyProfiles);
            const active = shipment.id === activeShipmentId;
            const linkedDocuments = getLinkedShipmentDocuments(shipment, documents);
            const visibleDocuments = getImporterVisibleDocuments(linkedDocuments);
            const reviewedCount = getReviewedDocumentCount(linkedDocuments, extractions);
            const evidenceCoverage = linkedDocuments.length ? Math.round((reviewedCount / linkedDocuments.length) * 100) : 100;
            const lowFriction = isLowFrictionPackage(shipment, linkedDocuments, extractions);
            return (
              <article key={shipment.id} className={`ct-package-card ${active ? 'is-active' : ''}`}>
                <div className="ct-package-card-top">
                  <div>
                    <div className="ct-badge">APPROVED SHIPMENT</div>
                    <h3>{shipment.invoiceId}</h3>
                    <p>{exporterName} / {shipment.product}</p>
                  </div>
                  <span className={`ct-status-pill ${lowFriction ? 'is-good' : 'is-neutral'}`}>
                    {lowFriction ? 'READY' : shipment.report?.overall_shipment_risk ?? 'WATCH'}
                  </span>
                </div>
                <div className="ct-package-meta">
                  <div>
                    <span>Destination</span>
                    <strong>{shipment.destinationCountry}</strong>
                  </div>
                  <div>
                    <span>EUDR</span>
                    <strong>{shipment.report?.eudr.status ?? 'Pending'}</strong>
                  </div>
                  <div>
                    <span>Evidence</span>
                    <strong>{reviewedCount}/{linkedDocuments.length}</strong>
                  </div>
                  <div>
                    <span>Importer ID</span>
                    <strong>{shipment.importerId || 'Legacy'}</strong>
                  </div>
                </div>
                <ProgressMeter
                  label="Evidence review"
                  value={evidenceCoverage}
                  max={100}
                  detail={`${evidenceCoverage}% reviewed evidence coverage.`}
                />
                <div className="ct-importer-doc-strip">
                  {visibleDocuments.slice(0, 3).map((document) => (
                    <span key={document.id}>{document.documentType}</span>
                  ))}
                  {visibleDocuments.length > 3 ? <span>+{visibleDocuments.length - 3} more</span> : null}
                </div>
                <div className="ct-package-actions">
                  <button className="ct-secondary-button" onClick={() => onOpenShipment(shipment.id)}>
                    {active ? 'Viewing' : 'Open'}
                  </button>
                  <button className="ct-primary-button" onClick={() => onDownloadPackage(shipment)}>
                    Download package
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

type ImporterShipmentWorkspaceProps = {
  shipment: ShipmentRecord | null;
  companyProfiles: CompanyProfile[];
  plots: PlotRecord[];
  documents: DocumentRecord[];
  facilities: FacilityRecord[];
  installations: InstallationRecord[];
  batches: ProductionBatchRecord[];
  extractions: ExtractionRecord[];
  auditLogs: AuditLogEntry[];
  onDownloadJson: DownloadHandler;
  onDownloadXml: DownloadHandler;
  onDownloadPackage: DownloadHandler;
  onDownloadPdf: DownloadHandler;
  onDownloadDds: DownloadHandler;
  onDownloadCbamCsv: DownloadHandler;
  onDownloadGeoJson: (plot: PlotRecord) => void;
  onDownloadDocumentPdf: (document: DocumentRecord) => void;
};

export const ImporterShipmentWorkspace: React.FC<ImporterShipmentWorkspaceProps> = ({
  shipment,
  companyProfiles,
  plots,
  documents,
  facilities,
  installations,
  batches,
  extractions,
  auditLogs,
  onDownloadJson,
  onDownloadXml,
  onDownloadPackage,
  onDownloadPdf,
  onDownloadDds,
  onDownloadCbamCsv,
  onDownloadGeoJson,
  onDownloadDocumentPdf,
}) => {
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const eligibleShipment = shipment?.status === 'APPROVED' ? shipment : null;
  const exporterProfile = eligibleShipment ? getExporterProfile(eligibleShipment, companyProfiles) : null;
  const linkedPlots = eligibleShipment ? plots.filter((plot) => eligibleShipment.plotIds.includes(plot.id)) : [];
  const linkedDocuments = eligibleShipment ? documents.filter((document) => eligibleShipment.documentIds.includes(document.id)) : [];
  const linkedBatches = batches.filter(
    (batch) => eligibleShipment && ((eligibleShipment.batchIds ?? []).includes(batch.id) || batch.shipmentId === eligibleShipment.id),
  );
  const linkedInstallations = installations.filter(
    (installation) =>
      Boolean(
        eligibleShipment &&
        ((eligibleShipment.installationIds ?? []).includes(installation.id) ||
          linkedBatches.some((batch) => batch.installationId === installation.id)),
      ),
  );
  const linkedFacilities = facilities.filter(
    (facility) =>
      Boolean(
        eligibleShipment &&
        ((eligibleShipment.facilityIds ?? []).includes(facility.id) ||
          linkedBatches.some((batch) => batch.facilityId === facility.id)),
      ),
  );
  const linkedExtractions = extractions.filter((extraction) =>
    linkedDocuments.some((document) => document.id === extraction.documentId),
  );
  const linkedAuditLogs = auditLogs.filter((entry) =>
    eligibleShipment ? [eligibleShipment.id, ...eligibleShipment.documentIds, ...eligibleShipment.plotIds, ...(eligibleShipment.batchIds ?? [])].includes(entry.entityId) : false,
  );
  const displayedDocuments = getImporterVisibleDocuments(linkedDocuments);
  const firstDisplayedDocumentId = displayedDocuments[0]?.id ?? '';
  const reviewedDisplayedDocuments = getReviewedDocumentCount(displayedDocuments, linkedExtractions);
  const lowFriction = eligibleShipment ? isLowFrictionPackage(eligibleShipment, linkedDocuments, extractions) : false;
  const evidenceChecklist = [
    {
      label: 'Commercial / shipment papers',
      complete: displayedDocuments.some((document) => document.documentType === 'Shipment Document'),
    },
    {
      label: 'Buyer or supplier confirmation',
      complete: displayedDocuments.some((document) => ['Purchase Order', 'Supplier Declaration'].includes(document.documentType)),
    },
    {
      label: 'Land or production proof',
      complete: displayedDocuments.some((document) => ['Land Record', 'Production Log', 'Electricity Bill', 'Fuel Invoice'].includes(document.documentType)),
    },
    {
      label: 'Reviewed extraction',
      complete: reviewedDisplayedDocuments === displayedDocuments.length && displayedDocuments.length > 0,
    },
  ];

  useEffect(() => {
    setSelectedDocumentId(firstDisplayedDocumentId);
  }, [eligibleShipment?.id, firstDisplayedDocumentId]);

  if (!eligibleShipment) return null;

  return (
    <section className="ct-stack ct-importer-detail-page">
      <section className="ct-card ct-importer-release-card">
        <div className="ct-importer-release-main">
          <div className="ct-card-head">
            <div className="ct-card-overline">Importer package</div>
            <h2 className="ct-card-title">{eligibleShipment.invoiceId}</h2>
            <p className="ct-card-copy">{getExporterName(eligibleShipment, companyProfiles)} / {eligibleShipment.product}</p>
          </div>
          <div className="ct-importer-release-chips">
            <span className={`ct-status-pill ${lowFriction ? 'is-good' : toneForStatus(eligibleShipment.status)}`}>
              {lowFriction ? 'IMPORT READY' : eligibleShipment.status}
            </span>
            <span className="ct-pill-chip">{eligibleShipment.destinationCountry}</span>
            <span className="ct-pill-chip">{eligibleShipment.report?.overall_shipment_risk ?? 'Pending risk'}</span>
          </div>
        </div>
        <div className="ct-importer-release-actions">
          <button className="ct-primary-button" onClick={() => onDownloadPackage(eligibleShipment)}>Download package</button>
        </div>
      </section>

      <div className="ct-importer-handoff">
        <div><span>Exporter</span><strong>{getExporterName(eligibleShipment, companyProfiles)}</strong></div>
        <div><span>Importer ID</span><strong>{eligibleShipment.importerId || 'Legacy'}</strong></div>
        <div><span>EUDR</span><strong>{eligibleShipment.report?.eudr.status ?? 'N/A'}</strong></div>
        <div><span>CBAM</span><strong>{eligibleShipment.report?.cbam.status ?? 'N/A'}</strong></div>
        <div><span>Files</span><strong>{reviewedDisplayedDocuments}/{displayedDocuments.length}</strong></div>
      </div>

      <section className="ct-importer-priority-layout">
        <div className="ct-card ct-stack">
          <div className="ct-card-head">
            <div className="ct-card-overline">Buyer checklist</div>
            <h3 className="ct-card-title">Ready check</h3>
          </div>
          <div className="ct-importer-checklist">
            {evidenceChecklist.map((item) => (
              <div key={item.label} className={`ct-importer-check ${item.complete ? 'is-complete' : ''}`}>
                <span>{item.complete ? 'Ready' : 'Check'}</span>
                <strong>{item.label}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="ct-card ct-stack">
          <div className="ct-card-head">
            <div className="ct-card-overline">Important files</div>
            <h3 className="ct-card-title">Open first</h3>
          </div>
          <div className="ct-importer-doc-list is-compact">
            {displayedDocuments.slice(0, 5).map((document) => {
              const extraction = linkedExtractions.find((entry) => entry.documentId === document.id);
              return (
                <button
                  key={document.id}
                  className={`ct-importer-doc-card ${selectedDocumentId === document.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedDocumentId(document.id)}
                  type="button"
                >
                  <span>{document.documentType}</span>
                  <strong>{document.fileName}</strong>
                  <small>{extraction?.status ?? document.ocrStatus ?? 'PENDING'}</small>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <PreviewPanel
        title="Document preview"
        documents={displayedDocuments}
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={setSelectedDocumentId}
        extractions={linkedExtractions}
        onDownloadDocumentPdf={onDownloadDocumentPdf}
      />

      <details className="ct-inline-details ct-importer-technical-details">
        <summary>Technical evidence</summary>
        <div className="ct-detail-grid">
          <div className="ct-guided-block">
            <div className="ct-card-overline">Exporter</div>
            <strong>{exporterProfile?.tradeName || exporterProfile?.legalEntityName || 'Exporter profile unavailable'}</strong>
            <p>{exporterProfile?.eori ? `EORI ${exporterProfile.eori}` : 'EORI not recorded'}</p>
          </div>
          <div className="ct-guided-block">
            <div className="ct-card-overline">Coverage</div>
            <ProgressMeter
              label="Reviewed evidence"
              value={linkedExtractions.filter((entry) => entry.status === 'REVIEWED').length}
              max={Math.max(displayedDocuments.length, 1)}
              detail={`${linkedExtractions.filter((entry) => entry.status === 'REVIEWED').length}/${displayedDocuments.length || 0} visible files reviewed.`}
            />
          </div>
        </div>
        <div className="ct-detail-grid">
          <div className="ct-guided-block">
            <div className="ct-card-overline">Plots</div>
            {linkedPlots.length ? linkedPlots.map((plot) => (
              <div key={plot.id} className="ct-compact-row">
                <span>{plot.name}</span>
                <button className="ct-link-button" onClick={() => onDownloadGeoJson(plot)}>GeoJSON</button>
              </div>
            )) : <p>No linked plots.</p>}
          </div>
          <div className="ct-guided-block">
            <div className="ct-card-overline">Operations</div>
            {[...linkedFacilities.map((item) => item.name), ...linkedInstallations.map((item) => item.name), ...linkedBatches.map((item) => item.batchCode)].slice(0, 8).map((label) => (
              <div key={label} className="ct-compact-row"><span>{label}</span></div>
            ))}
            {!linkedFacilities.length && !linkedInstallations.length && !linkedBatches.length ? <p>No operation records linked.</p> : null}
          </div>
        </div>
        {!!linkedAuditLogs.length && (
          <div className="ct-guided-block">
            <div className="ct-card-overline">Audit</div>
            {linkedAuditLogs.slice(0, 6).map((entry) => (
              <div key={entry.id} className="ct-compact-row">
                <span>{entry.action}</span>
                <small>{entry.createdAt.slice(0, 10)}</small>
              </div>
            ))}
          </div>
        )}
      </details>

      {eligibleShipment.report && (
        <details className="ct-inline-details">
          <summary>Report preview</summary>
          <ComplianceReportCard
            shipment={eligibleShipment}
            report={eligibleShipment.report}
            exporterName={getExporterName(eligibleShipment, companyProfiles)}
            importerName={eligibleShipment.importerName || eligibleShipment.importerId || `${eligibleShipment.destinationCountry} importer`}
            onDownloadJson={() => onDownloadJson(eligibleShipment)}
            onDownloadXml={() => onDownloadXml(eligibleShipment)}
            onDownloadPackage={() => onDownloadPackage(eligibleShipment)}
          />
        </details>
      )}
    </section>
  );
};
