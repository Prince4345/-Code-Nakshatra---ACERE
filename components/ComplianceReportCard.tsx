import React from 'react';
import { ComplianceReport, ShipmentRecord } from '../types';

type Props = {
  shipment: ShipmentRecord;
  report: ComplianceReport;
  exporterName?: string;
  importerName?: string;
  generatedDate?: string;
  verifierDecision?: string;
  onDownloadJson?: () => void;
  onDownloadXml?: () => void;
  onDownloadPackage?: () => void;
};

const formatStatus = (value: string) => value.replace(/_/g, ' ');

const issueText = (issues: string[]) => (issues.length ? issues.join('; ') : 'No exceptions');

const formatReportDate = (value?: string) => {
  if (!value) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const referenceId = (invoiceId: string, fallbackId: string) =>
  `CT-PACK-${(invoiceId || fallbackId).replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase()}`;

const ComplianceReportCard: React.FC<Props> = ({
  shipment,
  report,
  exporterName,
  importerName,
  generatedDate,
  verifierDecision,
  onDownloadJson,
  onDownloadXml,
  onDownloadPackage,
}) => {
  const isEudrClear = report.eudr.status === 'COMPLIANT';
  const isCbamClear = report.cbam.status === 'COMPLIANT' || report.cbam.status === 'NOT_APPLICABLE';
  const releaseState = isEudrClear && isCbamClear ? 'Release ready' : 'Review before release';
  const resolvedGeneratedDate = generatedDate ?? formatReportDate(shipment.approvedAt ?? shipment.updatedAt ?? shipment.createdAt);
  const resolvedExporter = exporterName ?? shipment.exporterReferenceId ?? shipment.ownerId ?? 'Exporter account';
  const resolvedImporter = importerName ?? shipment.importerName ?? shipment.importerId ?? `${shipment.destinationCountry} importer`;
  const resolvedDecision = verifierDecision ?? formatStatus(shipment.status);
  const resolvedReferenceId = referenceId(shipment.invoiceId, shipment.id);
  const qrSeed = resolvedReferenceId.replace(/[^A-Z0-9]/g, '').slice(-12).padEnd(12, '0').split('');
  const evidenceSummary = [
    ['Suppliers', shipment.supplierIds.length],
    ['Plots', shipment.plotIds.length],
    ['Documents', shipment.documentIds.length],
    ['Facilities', shipment.facilityIds?.length ?? 0],
    ['Installations', shipment.installationIds?.length ?? 0],
    ['Batches', shipment.batchIds?.length ?? 0],
  ];
  const summaryItems = [
    ['Shipment ID', shipment.invoiceId],
    ['Reference ID', resolvedReferenceId],
    ['Exporter', resolvedExporter],
    ['Importer', resolvedImporter],
    ['EUDR Status', formatStatus(report.eudr.status)],
    ['CBAM Status', formatStatus(report.cbam.status)],
    ['Verifier Decision', resolvedDecision],
    ['Generated Date', resolvedGeneratedDate],
  ];

  return (
    <article className="ct-report-card">
      <header className="ct-report-header">
        <div className="ct-card-head">
          <div className="ct-report-kicker">CarbonTrace AI / Compliance package</div>
          <h2>{shipment.invoiceId}</h2>
          <p>{shipment.product} / {shipment.destinationCountry}</p>
        </div>
        <div className="ct-inline-links">
          {onDownloadJson ? <button className="ct-link-button" onClick={onDownloadJson}>JSON</button> : null}
          {onDownloadXml ? <button className="ct-link-button" onClick={onDownloadXml}>XML</button> : null}
          {onDownloadPackage ? <button className="ct-link-button" onClick={onDownloadPackage}>Package</button> : null}
        </div>
      </header>

      <section className="ct-report-cover">
        <div className="ct-report-cover-main">
          <div className="ct-report-label">Compliance Package Summary</div>
          <h3>{shipment.invoiceId}</h3>
          <p>{shipment.product} / {shipment.destinationCountry}</p>
          <div className="ct-report-cover-pills">
            <span className={`ct-report-pill ${isEudrClear ? 'is-good' : 'is-warn'}`}>EUDR {formatStatus(report.eudr.status)}</span>
            <span className={`ct-report-pill ${isCbamClear ? 'is-good' : 'is-warn'}`}>CBAM {formatStatus(report.cbam.status)}</span>
            <span className={`ct-report-pill ${report.overall_shipment_risk === 'LOW' ? 'is-good' : 'is-warn'}`}>{formatStatus(report.overall_shipment_risk)} risk</span>
          </div>
          <div className="ct-report-reference">Reference {resolvedReferenceId}</div>
        </div>
        <div className="ct-report-seal" aria-label={`Package reference ${resolvedReferenceId}`}>
          <div className="ct-report-qr">
            {qrSeed.map((char, index) => (
              <span key={`${char}-${index}`} className={Number.parseInt(char, 36) % 2 ? 'is-filled' : ''} />
            ))}
          </div>
          <strong>Verified package</strong>
          <small>{resolvedReferenceId}</small>
        </div>
        <dl className="ct-report-summary-grid">
          {summaryItems.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="ct-report-evidence-appendix">
        <div>
          <div className="ct-report-label">Evidence appendix</div>
          <h3>Linked source records</h3>
        </div>
        <div className="ct-report-evidence-grid">
          {evidenceSummary.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="ct-report-banner">
        <div>
          <div className="ct-report-label">Decision</div>
          <div className={`ct-report-risk risk-${report.overall_shipment_risk.toLowerCase()}`}>
            {releaseState}
          </div>
        </div>
        <div className="ct-report-banner-copy">Use for review, release, and importer handoff.</div>
      </section>

      <section className="ct-report-kpi-grid">
        <div className="ct-report-panel">
          <div className="ct-report-label">Shipment</div>
          <strong>{shipment.quantity} {shipment.unit}</strong>
          <p>HS {shipment.hsCode || 'N/A'}</p>
        </div>
        <div className="ct-report-panel">
          <div className="ct-report-label">EUDR DDS</div>
          <strong>{report.eudr.dds_ready ? 'Ready' : 'Pending'}</strong>
          <p>{report.eudr.plot_count ?? shipment.plotIds.length} plot(s) in package</p>
        </div>
        <div className="ct-report-panel">
          <div className="ct-report-label">CBAM</div>
          <strong>{report.cbam.reported_emissions_tCO2 ?? 0} tCO2</strong>
          <p>{report.cbam.installation_count ?? shipment.installationIds?.length ?? 0} installation(s)</p>
        </div>
      </section>

      <section className="ct-report-grid">
        <div className="ct-report-panel">
          <div className="ct-report-label">Shipment identity</div>
          <dl className="ct-report-details">
            <div><dt>Invoice ID</dt><dd>{shipment.invoiceId}</dd></div>
            <div><dt>Exporter ref</dt><dd>{shipment.exporterReferenceId || 'N/A'}</dd></div>
            <div><dt>Verifier ID</dt><dd>{shipment.verifierId || 'N/A'}</dd></div>
            <div><dt>Importer ID</dt><dd>{shipment.importerId || 'N/A'}</dd></div>
            <div><dt>Destination</dt><dd>{report.destination_eu_country}</dd></div>
            <div><dt>Workflow</dt><dd>{formatStatus(shipment.status)}</dd></div>
            <div><dt>Notes</dt><dd>{shipment.additionalNotes || 'None'}</dd></div>
          </dl>
        </div>

        <div className="ct-report-panel">
          <div className="ct-report-label">Decision summary</div>
          <dl className="ct-report-details">
            <div><dt>EUDR status</dt><dd>{formatStatus(report.eudr.status)}</dd></div>
            <div><dt>CBAM status</dt><dd>{formatStatus(report.cbam.status)}</dd></div>
            <div><dt>Default values</dt><dd>{report.cbam.default_value_triggered ? 'Used in package' : 'No defaults used'}</dd></div>
            <div><dt>Energy notes</dt><dd>{shipment.energyNotes || 'None'}</dd></div>
          </dl>
        </div>
      </section>

      <section className="ct-report-columns">
        <div className="ct-report-section">
          <div className="ct-report-section-head">
            <div>
              <div className="ct-report-label">Land due diligence</div>
              <h3>{isEudrClear ? 'Cutoff screen passed' : 'EUDR review still needed'}</h3>
            </div>
            <span className={`ct-report-pill ${isEudrClear ? 'is-good' : 'is-warn'}`}>
              {formatStatus(report.eudr.status)}
            </span>
          </div>
          <dl className="ct-report-details">
            <div><dt>Geolocation provided</dt><dd>{report.eudr.geolocation_provided ? 'Yes' : 'No'}</dd></div>
            <div><dt>Cutoff verified</dt><dd>{report.eudr.deforestation_cutoff_verified ? 'Yes' : 'No'}</dd></div>
            <div><dt>Exceptions</dt><dd>{issueText(report.eudr.non_compliance_reasons)}</dd></div>
          </dl>
        </div>

        <div className="ct-report-section">
          <div className="ct-report-section-head">
            <div>
              <div className="ct-report-label">Emissions review</div>
              <h3>{isCbamClear ? 'Emissions inputs accepted' : 'CBAM inputs need review'}</h3>
            </div>
            <span className={`ct-report-pill ${isCbamClear ? 'is-good' : 'is-warn'}`}>
              {formatStatus(report.cbam.status)}
            </span>
          </div>
          <dl className="ct-report-details">
            <div><dt>Reported emissions</dt><dd>{report.cbam.reported_emissions_tCO2 ?? 0} tCO2</dd></div>
            <div><dt>Scope 1 / Scope 2</dt><dd>{report.cbam.scope1_tCO2 ?? 0} / {report.cbam.scope2_tCO2 ?? 0} tCO2</dd></div>
            <div><dt>Exceptions</dt><dd>{issueText(report.cbam.non_compliance_reasons)}</dd></div>
          </dl>
        </div>
      </section>

      <footer className="ct-report-footer">
        <div className="ct-report-label">Importer handoff conclusion</div>
        <p>
          {isEudrClear && isCbamClear
            ? 'Ready for downstream review, buyer reliance, and importer handoff with linked evidence.'
            : 'Keep this package in review until the remaining gaps are closed.'}
        </p>
        <div className="ct-report-signature">
          <span>Verifier sign-off</span>
          <strong>{resolvedDecision}</strong>
        </div>
      </footer>
    </article>
  );
};

export default ComplianceReportCard;
