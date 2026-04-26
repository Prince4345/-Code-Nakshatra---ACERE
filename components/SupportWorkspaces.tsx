import React, { useEffect, useMemo, useState } from 'react';
import { AuditLogEntry, DocumentRecord, ExtractionRecord, NotificationRecord, ShipmentRecord } from '../types';
import { InsightMetricCard, PremiumEmptyState, SegmentedFilter } from './Insights';
import { downloadHelpGuidePdf } from '../services/pdfExports';
import { toFriendlyMessage } from '../services/userMessages';

const timestampToIso = (value?: string | null) => {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
};

const statusTone = (status: string) => {
  if (status === 'REVIEWED') return 'is-good';
  if (status === 'EXTRACTED') return 'is-neutral';
  return 'is-warn';
};

type ExtractionWorkspaceProps = {
  documents: DocumentRecord[];
  extractions: ExtractionRecord[];
  onRunExtraction: (document: DocumentRecord) => Promise<void>;
  onReviewExtraction: (documentId: string, fields: Record<string, string>, notes: string) => Promise<void>;
  onDownloadPdf: (document: DocumentRecord) => void;
};

export const ExtractionWorkspace: React.FC<ExtractionWorkspaceProps> = ({
  documents,
  extractions,
  onRunExtraction,
  onReviewExtraction,
  onDownloadPdf,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeDocumentId, setActiveDocumentId] = useState('');
  const [processingDocumentId, setProcessingDocumentId] = useState('');
  const [reviewingDocumentId, setReviewingDocumentId] = useState('');
  const [extractionError, setExtractionError] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSavedMessage, setReviewSavedMessage] = useState('');
  const [hasReviewDraftChanges, setHasReviewDraftChanges] = useState(false);

  const orderedDocuments = useMemo(
    () =>
      [...documents].sort((left, right) => {
        const leftValue = timestampToIso(left.updatedAt ?? left.createdAt);
        const rightValue = timestampToIso(right.updatedAt ?? right.createdAt);
        return rightValue.localeCompare(leftValue);
      }),
    [documents],
  );

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orderedDocuments.filter((document) => {
      const extraction = extractions.find((item) => item.documentId === document.id);
      const stage = extraction?.status ?? document.ocrStatus ?? 'PENDING';
      const matchesQuery =
        !query ||
        `${document.fileName} ${document.documentType} ${document.notes} ${extraction?.detectedDocumentType ?? ''} ${extraction?.rawText ?? ''}`
          .toLowerCase()
          .includes(query);
      const matchesStatus = statusFilter === 'ALL' || stage === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [documents, extractions, orderedDocuments, search, statusFilter]);

  const activeDocument = filteredDocuments.find((document) => document.id === activeDocumentId) ?? filteredDocuments[0] ?? orderedDocuments[0] ?? null;
  const activeExtraction = extractions.find((extraction) => extraction.documentId === activeDocument?.id);
  const [reviewFields, setReviewFields] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState('');

  const reviewedCount = extractions.filter((extraction) => extraction.status === 'REVIEWED').length;
  const pendingCount = documents.length - reviewedCount;
  const avgConfidence = extractions.length
    ? extractions.reduce((total, extraction) => total + extraction.confidence, 0) / extractions.length
    : 0;
  const documentAiCount = extractions.filter((extraction) => extraction.provider === 'document-ai').length;

  useEffect(() => {
    setReviewError('');
    setReviewSavedMessage('');
    if (!activeExtraction) {
      setReviewFields({});
      setReviewNotes('');
      return;
    }
    setReviewFields(activeExtraction.extractedFields);
    setReviewNotes(activeExtraction.reviewerNotes);
    setHasReviewDraftChanges(false);
  }, [activeExtraction?.id]);

  const runExtraction = async (document: DocumentRecord) => {
    setProcessingDocumentId(document.id);
    setExtractionError('');
    try {
      await onRunExtraction(document);
    } catch (error) {
      setExtractionError(toFriendlyMessage(error, 'The document could not be extracted right now. Please try again.'));
    } finally {
      setProcessingDocumentId('');
    }
  };

  const saveReview = async (document: DocumentRecord) => {
    setReviewingDocumentId(document.id);
    setReviewError('');
    setReviewSavedMessage('');
    try {
      await onReviewExtraction(document.id, reviewFields, reviewNotes);
      setReviewSavedMessage('Reviewed extraction saved.');
      setHasReviewDraftChanges(false);
    } catch (error) {
      setReviewError(toFriendlyMessage(error, 'The reviewed extraction could not be saved right now. Please try again.'));
    } finally {
      setReviewingDocumentId('');
    }
  };

  return (
    <div className="ct-stack ct-extraction-workspace">
      <section className="ct-hero ct-compact-hero">
        <div>
          <div className="ct-badge">OCR & REVIEW</div>
          <h2>Review evidence fields</h2>
        </div>
        <p>Preview source, correct fields, save review.</p>
      </section>
      <div className="ct-insight-grid">
        <InsightMetricCard label="Pending review" value={pendingCount} helper="Documents still waiting for reviewer confirmation" tone={pendingCount ? 'warn' : 'good'} />
        <InsightMetricCard label="Reviewed" value={reviewedCount} helper={`${Math.round((reviewedCount / Math.max(documents.length, 1)) * 100)}% confirmed`} tone="good" />
        <InsightMetricCard label="Average confidence" value={`${Math.round(avgConfidence * 100)}%`} helper="Across extracted documents" />
        <InsightMetricCard label="Document AI" value={documentAiCount} helper="Live Document AI processed files" />
      </div>
      <div className="ct-review-shell">
        <aside className="ct-review-sidebar">
          <section className="ct-card ct-stack">
            <div className="ct-section-head">
              <div>
                <h2>Extraction Queue</h2>
                <p>{filteredDocuments.length} document(s) in this review view.</p>
              </div>
            </div>
            <label className="ct-field">
              <span>Search documents</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="file name, notes, detected type, raw text"
              />
            </label>
            <SegmentedFilter
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All', badge: documents.length },
                { value: 'PENDING', label: 'Pending', badge: documents.filter((document) => (document.ocrStatus ?? 'PENDING') === 'PENDING').length },
                { value: 'EXTRACTED', label: 'Extracted', badge: extractions.filter((extraction) => extraction.status === 'EXTRACTED').length },
                { value: 'REVIEWED', label: 'Reviewed', badge: reviewedCount },
              ]}
            />
            {filteredDocuments.length ? (
              <div className="ct-library-list">
                {filteredDocuments.map((document) => {
                  const extraction = extractions.find((item) => item.documentId === document.id);
                  const stage = extraction?.status ?? document.ocrStatus ?? 'PENDING';
                  return (
                    <div
                      key={document.id}
                      className={`ct-entity-card ${activeDocument?.id === document.id ? 'is-active' : ''}`}
                    >
                      <div className="ct-entity-card-head">
                        <div>
                          <h3>{document.fileName}</h3>
                          <p>{(extraction?.detectedDocumentType ?? document.documentType) || 'Awaiting classification'}</p>
                        </div>
                        <span className={`ct-status-pill ${statusTone(stage)}`}>{stage}</span>
                      </div>
                      <div className="ct-meta-row">
                        <span>{extraction?.provider ?? 'heuristic'}</span>
                        <span>{Math.round((extraction?.confidence ?? 0) * 100)}% confidence</span>
                      </div>
                      <div className="ct-actions">
                        <button className="ct-secondary-button" onClick={() => setActiveDocumentId(document.id)} type="button">
                          Open
                        </button>
                        <button
                          className="ct-link-button"
                          disabled={processingDocumentId === document.id}
                          onClick={() => runExtraction(document)}
                          type="button"
                        >
                          {processingDocumentId === document.id ? 'Extracting...' : 'Extract'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <PremiumEmptyState
                badge="EXTRACTION QUEUE"
                title="No document matches this review view."
                description="Clear the filters or pick another stage to continue extraction review."
                steps={['Show all statuses', 'Search by file name', 'Open another document']}
              />
            )}
          </section>
        </aside>

        <div className="ct-review-main ct-stack">
          {activeDocument ? (
            <section className="ct-card ct-stack ct-extraction-detail-card">
              <div className="ct-section-head">
                <div className="ct-card-head">
                  <div className="ct-card-overline">Active review</div>
                  <h2 className="ct-card-title">{activeDocument.fileName}</h2>
                  <p className="ct-card-copy">{(activeExtraction?.detectedDocumentType ?? activeDocument.documentType) || 'Awaiting document type'}</p>
                </div>
                <div className="ct-actions">
                  {activeDocument.previewUrl ? (
                    <a className="ct-link-inline" href={activeDocument.previewUrl} target="_blank" rel="noreferrer">
                      Open source
                    </a>
                  ) : null}
                  <button className="ct-secondary-button" onClick={() => onDownloadPdf(activeDocument)} type="button">
                    Download PDF
                  </button>
                  <button
                    className="ct-secondary-button"
                    disabled={processingDocumentId === activeDocument.id}
                    onClick={() => runExtraction(activeDocument)}
                    type="button"
                  >
                    {processingDocumentId === activeDocument.id ? 'Extracting...' : 'Run extraction'}
                  </button>
                </div>
              </div>
              {extractionError ? (
                <div className="ct-note">
                  {extractionError}
                </div>
              ) : null}
              {reviewError ? (
                <div className="ct-note">
                  {reviewError}
                </div>
              ) : null}
              {reviewSavedMessage ? (
                <div className="ct-save-toast is-success" role="status">
                  {reviewSavedMessage}
                </div>
              ) : null}

              <div className="ct-document-status-grid">
                <InsightMetricCard label="Status" value={activeExtraction?.status ?? activeDocument.ocrStatus ?? 'PENDING'} helper="Current extraction stage" tone={(activeExtraction?.status ?? activeDocument.ocrStatus) === 'REVIEWED' ? 'good' : 'neutral'} />
                <InsightMetricCard label="Confidence" value={`${Math.round((activeExtraction?.confidence ?? 0) * 100)}%`} helper={(activeExtraction?.providerModel ?? activeExtraction?.provider) || 'Awaiting provider'} />
                <InsightMetricCard label="Pages" value={activeExtraction?.pageCount ?? 'N/A'} helper="Document length seen by OCR" />
                <InsightMetricCard label="Type" value={(activeExtraction?.detectedDocumentType ?? activeDocument.documentType) || 'Unknown'} helper="Detected or selected document category" />
              </div>

              <div className="ct-evidence-review-bench">
                <section className="ct-evidence-preview-panel">
                  <div className="ct-panel-mini-head">
                    <div>
                      <span>Source</span>
                      <strong>Document preview</strong>
                    </div>
                    <button className="ct-link-button" onClick={() => onDownloadPdf(activeDocument)} type="button">
                      PDF
                    </button>
                  </div>
                  {activeDocument.previewUrl ? (
                    <iframe className="ct-document-preview-frame" src={activeDocument.previewUrl} title={activeDocument.fileName} />
                  ) : (
                    <div className="ct-note">No inline preview. Use source or PDF.</div>
                  )}
                  <details className="ct-inline-details">
                    <summary>Raw text</summary>
                    <div className="ct-code">{activeExtraction?.rawText ?? `${activeDocument.fileName}\n${activeDocument.notes}`}</div>
                  </details>
                </section>

                <section className="ct-evidence-fields-panel">
                  <div className="ct-panel-mini-head">
                    <div>
                      <span>Review</span>
                      <strong>Extracted fields</strong>
                    </div>
                    <span className={`ct-status-pill ${statusTone(activeExtraction?.status ?? activeDocument.ocrStatus ?? 'PENDING')}`}>
                      {activeExtraction?.status ?? activeDocument.ocrStatus ?? 'PENDING'}
                    </span>
                  </div>
                  {Object.keys(reviewFields).length ? (
                    <div className="ct-form-grid two">
                      {Object.entries(reviewFields).map(([key, value]) => (
                        <label key={key} className="ct-field">
                          <span>
                            {key}
                            {activeExtraction?.fieldConfidences?.[key] !== undefined
                              ? ` (${Math.round(activeExtraction.fieldConfidences[key] * 100)}%)`
                              : ''}
                          </span>
                          <input
                            value={value}
                            onChange={(event) => {
                              setReviewFields((current) => ({ ...current, [key]: event.target.value }));
                              setHasReviewDraftChanges(true);
                              setReviewSavedMessage('');
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <PremiumEmptyState
                      badge="FIELDS"
                      title="No fields yet."
                      description="Run extraction to generate editable values."
                      steps={['Run extraction', 'Correct fields', 'Save review']}
                    />
                  )}
                  {activeExtraction?.warnings?.length ? (
                    <div className="ct-warning-list">
                      {activeExtraction.warnings.map((warning, index) => (
                        <div className="ct-note" key={`${warning}-${index}`}>
                          {warning}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <label className="ct-field">
                    <span>Reviewer notes</span>
                    <textarea
                      value={reviewNotes}
                      onChange={(event) => {
                        setReviewNotes(event.target.value);
                        setHasReviewDraftChanges(true);
                        setReviewSavedMessage('');
                      }}
                    />
                  </label>
                  <button
                    className={`ct-primary-button ${reviewSavedMessage && !hasReviewDraftChanges ? 'is-saved' : ''}`}
                    disabled={reviewingDocumentId === activeDocument.id}
                    onClick={() => saveReview(activeDocument)}
                    type="button"
                  >
                    {reviewingDocumentId === activeDocument.id
                      ? 'Saving...'
                      : reviewSavedMessage && !hasReviewDraftChanges
                        ? 'Saved'
                        : 'Save review'}
                  </button>
                </section>
              </div>
            </section>
          ) : (
            <PremiumEmptyState
              badge="ACTIVE REVIEW"
              title="No document selected."
              description="Choose a document from the extraction queue to preview it, run OCR, and save the reviewed structured fields."
              steps={['Open a document', 'Run extraction', 'Save reviewed fields']}
            />
          )}
        </div>
      </div>
    </div>
  );
};

type AuditTrailWorkspaceProps = {
  auditLogs: AuditLogEntry[];
  shipments?: ShipmentRecord[];
  documents?: DocumentRecord[];
  extractions?: ExtractionRecord[];
};

export const AuditTrailWorkspace: React.FC<AuditTrailWorkspaceProps> = ({
  auditLogs,
  shipments = [],
  documents = [],
  extractions = [],
}) => {
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filteredEntries = useMemo(
    () =>
      auditLogs.filter((entry) => {
        const matchesEntity = entityFilter === 'ALL' || entry.entityType === entityFilter;
        const query = search.trim().toLowerCase();
        const matchesQuery = !query || `${entry.actorName} ${entry.action} ${entry.summary} ${entry.details} ${entry.entityId}`.toLowerCase().includes(query);
        return matchesEntity && matchesQuery;
      }),
    [auditLogs, entityFilter, search],
  );

  return (
    <div className="ct-stack">
      <section className="ct-hero">
        <div>
          <div className="ct-badge">AUDIT TRAIL</div>
          <h2>Trace every decision back to evidence</h2>
        </div>
        <p>Clean history for review and handoff.</p>
      </section>
      <div className="ct-grid four">
        <div className="ct-card ct-stat"><div className="ct-stat-label">Audit Events</div><div className="ct-stat-value">{auditLogs.length}</div></div>
        <div className="ct-card ct-stat"><div className="ct-stat-label">Shipments</div><div className="ct-stat-value">{shipments.length}</div></div>
        <div className="ct-card ct-stat"><div className="ct-stat-label">Documents</div><div className="ct-stat-value">{documents.length}</div></div>
        <div className="ct-card ct-stat"><div className="ct-stat-label">Reviewed Extractions</div><div className="ct-stat-value">{extractions.filter((item) => item.status === 'REVIEWED').length}</div></div>
      </div>
      <section className="ct-card">
        <div className="ct-section-head">
          <div>
            <h2>Activity Log</h2>
            <p>{filteredEntries.length} event(s).</p>
          </div>
          <div className="ct-actions">
            <label className="ct-field">
              <span>Entity</span>
              <select value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)}>
                <option value="ALL">All</option>
                {Array.from(new Set(auditLogs.map((entry) => entry.entityType))).sort().map((entityType) => (
                  <option key={entityType} value={entityType}>{entityType}</option>
                ))}
              </select>
            </label>
            <label className="ct-field">
              <span>Search</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="action, actor, entity id" />
            </label>
          </div>
        </div>
        <table className="ct-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.createdAt.slice(0, 19).replace('T', ' ')}</td>
                <td>{entry.actorName}</td>
                <td>{entry.action}</td>
                <td>{entry.entityType}<div className="ct-note">{entry.entityId}</div></td>
                <td>{entry.summary}<div className="ct-note">{entry.details}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

type HelpCenterWorkspaceProps = {
  onDownloadTemplate: (name: string, content: string, type: string) => void;
};

export const HelpCenterWorkspace: React.FC<HelpCenterWorkspaceProps> = ({ onDownloadTemplate }) => (
  <div className="ct-stack">
    <section className="ct-hero ct-help-hero">
      <div className="ct-card-head">
        <div className="ct-badge">HELP & TEMPLATES</div>
        <h2>Pick the right starter file.</h2>
        <p className="ct-hero-lead">Download templates for CBAM, EUDR, and ERP import workflows.</p>
      </div>
      <div className="ct-help-quick">
        <span>3 templates</span>
        <span>2 compliance flows</span>
        <span>1 handoff pack</span>
      </div>
    </section>

    <div className="ct-template-grid">
      <section className="ct-template-card">
        <div className="ct-template-icon">C</div>
        <div className="ct-card-head">
          <div className="ct-card-overline">CBAM</div>
          <h2 className="ct-card-title">Installation inputs</h2>
          <p className="ct-card-copy">Fuel, electricity, batches, and source evidence.</p>
        </div>
        <div className="ct-mini-chip-row">
          <span>PDF Guide</span>
          <span>Emissions</span>
          <span>Batch links</span>
        </div>
        <button className="ct-primary-button" onClick={() => downloadHelpGuidePdf('cbam-installation')}>Download PDF</button>
      </section>

      <section className="ct-template-card">
        <div className="ct-template-icon">E</div>
        <div className="ct-card-head">
          <div className="ct-card-overline">EUDR</div>
          <h2 className="ct-card-title">DDS checklist</h2>
          <p className="ct-card-copy">Operator, product, shipment, and plot coordinates.</p>
        </div>
        <div className="ct-mini-chip-row">
          <span>PDF Guide</span>
          <span>DDS</span>
          <span>GeoJSON</span>
        </div>
        <button className="ct-primary-button" onClick={() => downloadHelpGuidePdf('eudr-dds')}>Download PDF</button>
      </section>

      <section className="ct-template-card">
        <div className="ct-template-icon">ERP</div>
        <div className="ct-card-head">
          <div className="ct-card-overline">ERP Bridge</div>
          <h2 className="ct-card-title">Accounting import</h2>
          <p className="ct-card-copy">Bring purchase logs and utilities into evidence review.</p>
        </div>
        <div className="ct-mini-chip-row">
          <span>PDF Guide</span>
          <span>Tally</span>
          <span>Invoices</span>
        </div>
        <button className="ct-primary-button" onClick={() => downloadHelpGuidePdf('erp-bridge')}>Download PDF</button>
      </section>
    </div>

    <section className="ct-card ct-stack">
      <div className="ct-card-head">
        <div className="ct-card-overline">Guidance</div>
        <h2 className="ct-card-title">What to prepare</h2>
        <p className="ct-card-copy">A short checklist before generating official outputs.</p>
      </div>
      <div className="ct-guide-strip">
        <div className="ct-guide-step">
          <span>01</span>
          <strong>CBAM</strong>
          <p>Installation and energy evidence.</p>
        </div>
        <div className="ct-guide-step">
          <span>02</span>
          <strong>EUDR</strong>
          <p>Operator, shipment, and plots.</p>
        </div>
        <div className="ct-guide-step">
          <span>03</span>
          <strong>Verifier</strong>
          <p>Evidence compared side by side.</p>
        </div>
        <div className="ct-guide-step">
          <span>04</span>
          <strong>Importer</strong>
          <p>DDS, XML, CBAM, GeoJSON.</p>
        </div>
      </div>
    </section>
  </div>
);

type IntegrationOpsWorkspaceProps = {
  shipments: ShipmentRecord[];
  documents: DocumentRecord[];
  extractions: ExtractionRecord[];
  onDownloadTemplate: (name: string, content: string, type: string) => void;
  onDownloadJson: (shipment: ShipmentRecord) => void;
  onDownloadXml: (shipment: ShipmentRecord) => void;
  onDownloadPackage: (shipment: ShipmentRecord) => void;
  onDownloadDds: (shipment: ShipmentRecord) => void;
  onDownloadCbamCsv: (shipment: ShipmentRecord) => void;
};

export const IntegrationOpsWorkspace: React.FC<IntegrationOpsWorkspaceProps> = ({
  shipments,
  documents,
  extractions,
  onDownloadTemplate,
  onDownloadJson,
  onDownloadXml,
  onDownloadPackage,
  onDownloadDds,
  onDownloadCbamCsv,
}) => {
  const [health, setHealth] = useState<{ status: string; service?: string } | null>(null);
  const [healthError, setHealthError] = useState('');

  const approvedShipments = shipments.filter((shipment) => shipment.status === 'APPROVED');
  const readyForDds = approvedShipments.filter((shipment) => shipment.report?.eudr.dds_ready);
  const reviewedDocuments = documents.filter((document) => extractions.some((extraction) => extraction.documentId === document.id && extraction.status === 'REVIEWED')).length;

  const checkBackendHealth = async () => {
    try {
      setHealthError('');
      const response = await fetch(`${(import.meta.env.VITE_GEE_API_URL || 'http://localhost:5000').replace(/\/$/, '')}/api/health`);
      if (!response.ok) throw new Error('Health check failed.');
      setHealth(await response.json());
    } catch (error: any) {
      setHealth(null);
      setHealthError(toFriendlyMessage(error, 'The live compliance service could not be reached right now.'));
    }
  };

  return (
    <div className="ct-stack">
      <section className="ct-hero">
        <div>
          <div className="ct-badge">INTEGRATIONS & OPS</div>
          <h2>Manage exports and bridge templates</h2>
        </div>
        <p>Health, bridges, and final package actions.</p>
      </section>
      <div className="ct-grid four">
        <div className="ct-card ct-stat"><div className="ct-stat-label">Approved Packages</div><div className="ct-stat-value">{approvedShipments.length}</div></div>
        <div className="ct-card ct-stat"><div className="ct-stat-label">DDS Ready</div><div className="ct-stat-value">{readyForDds.length}</div></div>
        <div className="ct-card ct-stat"><div className="ct-stat-label">Reviewed Documents</div><div className="ct-stat-value">{reviewedDocuments}</div></div>
        <div className="ct-card ct-stat"><div className="ct-stat-label">Backend Health</div><div className="ct-stat-value">{health?.status?.toUpperCase() ?? 'UNKNOWN'}</div></div>
      </div>
      <div className="ct-grid two">
        <section className="ct-card ct-stack">
          <div className="ct-section-head">
            <div>
              <h2>Connector Status</h2>
              <p>Current deployment status.</p>
            </div>
            <button className="ct-secondary-button" onClick={checkBackendHealth}>Check Backend</button>
          </div>
          <div className="ct-subgrid">
            <div className="ct-card ct-stack">
              <div className="ct-map-label">Earth Engine API</div>
              <strong>{health?.service ?? 'CarbonTrace backend'}</strong>
              <p>{health ? 'Backend responded successfully.' : 'Run a health check.'}</p>
            </div>
            <div className="ct-card ct-stack">
              <div className="ct-map-label">ERP / Tally Bridge</div>
              <strong>Template-driven import</strong>
              <p>CSV bridge packs for accounting and utilities.</p>
            </div>
            <div className="ct-card ct-stack">
              <div className="ct-map-label">Registry Handoff</div>
              <strong>DDS / TRACES / CBAM</strong>
              <p>DDS, XML, CSV, and full evidence packages.</p>
            </div>
          </div>
          {healthError && <div className="ct-note">{healthError}</div>}
        </section>
        <section className="ct-card ct-stack">
          <div className="ct-section-head">
            <div>
              <h2>Bridge Templates</h2>
              <p>Starter files for ERP and handoff.</p>
            </div>
          </div>
          <div className="ct-actions">
            <button className="ct-primary-button" onClick={() => onDownloadTemplate('tally-ledger-import.csv', 'voucher_date,ledger_name,invoice_id,amount,currency,notes\n', 'text/csv')}>Tally Import CSV</button>
            <button className="ct-secondary-button" onClick={() => onDownloadTemplate('cbam-line-items.csv', 'installation,batch_code,product,fuel_type,fuel_amount,fuel_unit,electricity_kwh,document_reference\n', 'text/csv')}>CBAM Line Items</button>
            <button className="ct-secondary-button" onClick={() => onDownloadTemplate('importer-package-checklist.csv', 'invoice_id,dds_ready,traces_ready,cbam_ready,geojson_ready,review_notes\n', 'text/csv')}>Importer Checklist</button>
          </div>
        </section>
      </div>
      <section className="ct-card">
        <div className="ct-section-head">
          <div>
            <h2>Approved Shipment Export Operations</h2>
            <p>Run final package actions from one place.</p>
          </div>
        </div>
        {!approvedShipments.length ? (
          <div className="ct-empty-state">No approved shipments are available yet. Approved cases will appear here for DDS, XML, CBAM CSV, and package downloads.</div>
        ) : (
          <table className="ct-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Product</th>
                <th>EUDR</th>
                <th>CBAM</th>
                <th>Exports</th>
              </tr>
            </thead>
            <tbody>
              {approvedShipments.map((shipment) => (
                <tr key={shipment.id}>
                  <td>{shipment.invoiceId}</td>
                  <td>{shipment.product}</td>
                  <td>{shipment.report?.eudr.status ?? 'PENDING'}</td>
                  <td>{shipment.report?.cbam.status ?? 'PENDING'}</td>
                  <td>
                    <div className="ct-actions">
                      <button className="ct-link-button" onClick={() => onDownloadJson(shipment)}>JSON</button>
                      <button className="ct-link-button" onClick={() => onDownloadDds(shipment)}>DDS</button>
                      <button className="ct-link-button" onClick={() => onDownloadXml(shipment)}>TRACES XML</button>
                      <button className="ct-link-button" onClick={() => onDownloadCbamCsv(shipment)}>CBAM CSV</button>
                      <button className="ct-link-button" onClick={() => onDownloadPackage(shipment)}>PACKAGE</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

type NotificationRailProps = {
  notifications: NotificationRecord[];
  onOpenNotification: (notification: NotificationRecord) => void | Promise<void>;
};

export const NotificationRail: React.FC<NotificationRailProps> = ({ notifications, onOpenNotification }) => {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const normalizeDate = (value: unknown) => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate().toISOString();
    }
    return '';
  };
  const ordered = useMemo(
    () => [...notifications].sort((left, right) => normalizeDate(right.createdAt).localeCompare(normalizeDate(left.createdAt))),
    [notifications],
  );
  const filtered = useMemo(
    () => ordered.filter((notification) => !showUnreadOnly || !notification.read),
    [ordered, showUnreadOnly],
  );
  const unreadCount = ordered.filter((notification) => !notification.read).length;

  if (!ordered.length) {
    return (
      <section className="ct-card">
        <div className="ct-section-head">
          <div>
            <h2>Notifications</h2>
            <p>No urgent items.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="ct-card">
      <div className="ct-section-head">
        <div>
          <h2>Notifications</h2>
          <p>{unreadCount} unread alert(s).</p>
        </div>
        <button className="ct-secondary-button" onClick={() => setShowUnreadOnly((current) => !current)}>
          {showUnreadOnly ? 'Show All' : 'Show Unread'}
        </button>
      </div>
      <div className="ct-stack">
        {filtered.map((notification) => (
          <div key={notification.id} className={`ct-note ${notification.read ? '' : 'is-unread'}`}>
            <div className="ct-section-head">
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <p>{normalizeDate(notification.createdAt).slice(0, 19).replace('T', ' ')}</p>
                </div>
              <button className="ct-link-button" onClick={() => onOpenNotification(notification)}>
                {notification.read ? 'Open' : 'Open & Mark Read'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
