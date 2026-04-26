import React, { useEffect, useMemo, useState } from 'react';
import ComplianceReportCard from './ComplianceReportCard';
import {
  AuditLogEntry,
  DocumentRecord,
  ExtractionRecord,
  InstallationRecord,
  PlotRecord,
  ProductionBatchRecord,
  ShipmentRecord,
  Supplier,
  VerificationCase,
} from '../types';
import { filterAuditEntriesForShipment } from '../services/complianceToolkit';
import { toFriendlyMessage } from '../services/userMessages';

const toneForStatus = (status: ShipmentRecord['status']) => {
  if (status === 'APPROVED') return 'is-good';
  if (status === 'REJECTED') return 'is-bad';
  return 'is-neutral';
};

const formatStatusLabel = (value: string) => value.replace(/_/g, ' ');

const getLinkedSuppliers = (shipment: ShipmentRecord, suppliers: Supplier[]) =>
  suppliers.filter((supplier) => shipment.supplierIds.includes(supplier.id));

const getLinkedPlots = (shipment: ShipmentRecord, plots: PlotRecord[]) =>
  plots.filter((plot) => shipment.plotIds.includes(plot.id));

const getLinkedDocuments = (shipment: ShipmentRecord, documents: DocumentRecord[]) =>
  documents.filter((document) => shipment.documentIds.includes(document.id));

const StatCard = ({ label, value, detail }: { label: string; value: string | number; detail: string }) => (
  <div className="ct-card ct-stat ct-metric-card">
    <div className="ct-card-overline">{label}</div>
    <div className="ct-stat-value">{value}</div>
    <div className="ct-note">{detail}</div>
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
  const safeMax = Math.max(max, 1);
  const percentage = Math.min(100, Math.round((value / safeMax) * 100));

  return (
    <div className="ct-progress-meter">
      <div className="ct-progress-meter-head">
        <strong>{label}</strong>
        <span>{percentage}%</span>
      </div>
      <div className="ct-progress-track" aria-label={`${label}: ${percentage}%`}>
        <span style={{ width: `${percentage}%` }} />
      </div>
      <p>{detail}</p>
    </div>
  );
};

const PreviewRail = ({
  documents,
  selectedDocumentId,
  onSelect,
  extractions,
}: {
  documents: DocumentRecord[];
  selectedDocumentId: string;
  onSelect: (id: string) => void;
  extractions: ExtractionRecord[];
}) => {
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) ?? documents[0] ?? null;
  const selectedExtraction = selectedDocument
    ? extractions.find((entry) => entry.documentId === selectedDocument.id)
    : null;

  if (!documents.length) {
    return <div className="ct-note">No documents linked to this case yet.</div>;
  }

  return (
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
              onClick={() => onSelect(document.id)}
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
          {selectedDocument?.previewUrl ? (
            <a className="ct-link-inline" href={selectedDocument.previewUrl} target="_blank" rel="noreferrer">
              Open file
            </a>
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
              <p>The selected document does not have a preview URL yet.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const VerifierQueueWorkspace = ({
  shipments,
  reviews,
  suppliers,
  plots,
  documents,
  installations,
  batches,
  extractions,
  auditLogs,
  initialShipmentId,
  onDownloadJson,
  onDownloadXml,
  onDownloadPackage,
  onDownloadPdf,
  onDownloadDds,
  onDownloadCbamCsv,
  onReview,
}: {
  shipments: ShipmentRecord[];
  reviews: VerificationCase[];
  suppliers: Supplier[];
  plots: PlotRecord[];
  documents: DocumentRecord[];
  installations: InstallationRecord[];
  batches: ProductionBatchRecord[];
  extractions: ExtractionRecord[];
  auditLogs: AuditLogEntry[];
  initialShipmentId?: string;
  onDownloadJson: (shipment: ShipmentRecord) => void;
  onDownloadXml: (shipment: ShipmentRecord) => void;
  onDownloadPackage: (shipment: ShipmentRecord) => void;
  onDownloadPdf: (shipment: ShipmentRecord) => void;
  onDownloadDds: (shipment: ShipmentRecord) => void;
  onDownloadCbamCsv: (shipment: ShipmentRecord) => void;
  onReview: (
    shipmentId: string,
    status: 'APPROVED' | 'REJECTED' | 'CLARIFICATION_REQUESTED',
    notes: string,
  ) => Promise<void>;
}) => {
  const [activeShipmentId, setActiveShipmentId] = useState(initialShipmentId ?? '');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CLARIFICATION_REQUESTED'>('ALL');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [completedDecisionIds, setCompletedDecisionIds] = useState<string[]>([]);
  const [decisionState, setDecisionState] = useState<{
    status: 'idle' | 'saving' | 'saved' | 'error';
    action?: 'APPROVED' | 'REJECTED' | 'CLARIFICATION_REQUESTED';
    message?: string;
  }>({ status: 'idle' });

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return shipments.filter((shipment) => {
      const isActiveQueueStatus = ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED'].includes(shipment.status);
      if (!isActiveQueueStatus || completedDecisionIds.includes(shipment.id)) return false;
      const matchesQuery =
        !query ||
        `${shipment.invoiceId} ${shipment.product} ${shipment.destinationCountry} ${shipment.status}`
          .toLowerCase()
          .includes(query);
      const matchesStatus = statusFilter === 'ALL' || shipment.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [completedDecisionIds, search, shipments, statusFilter]);

  useEffect(() => {
    if (initialShipmentId && filteredShipments.some((shipment) => shipment.id === initialShipmentId)) {
      setActiveShipmentId(initialShipmentId);
      return;
    }
    if (!filteredShipments.length) {
      setActiveShipmentId('');
      return;
    }
    if (!filteredShipments.some((shipment) => shipment.id === activeShipmentId)) {
      setActiveShipmentId(filteredShipments[0].id);
    }
  }, [activeShipmentId, filteredShipments, initialShipmentId]);

  const active = filteredShipments.find((shipment) => shipment.id === activeShipmentId) ?? null;
  const linkedSuppliers = active ? getLinkedSuppliers(active, suppliers) : [];
  const linkedPlots = active ? getLinkedPlots(active, plots) : [];
  const linkedDocuments = active ? getLinkedDocuments(active, documents) : [];
  const linkedBatches = active
    ? batches.filter((batch) => (active.batchIds ?? []).includes(batch.id) || batch.shipmentId === active.id)
    : [];
  const linkedInstallations = active
    ? installations.filter(
        (installation) =>
          (active.installationIds ?? []).includes(installation.id) ||
          linkedBatches.some((batch) => batch.installationId === installation.id),
      )
    : [];
  const linkedExtractions = active
    ? extractions.filter((extraction) => linkedDocuments.some((document) => document.id === extraction.documentId))
    : [];
  const linkedAuditEntries = active
    ? filterAuditEntriesForShipment(active, auditLogs, documents, plots, batches)
    : [];
  const existingReviewNotes = active
    ? reviews.find((review) => review.shipmentId === active.id)?.reviewerNotes ?? ''
    : '';
  const firstLinkedDocumentId = linkedDocuments[0]?.id ?? '';

  useEffect(() => {
    setNotes(existingReviewNotes);
    setDecisionState({ status: 'idle' });
  }, [active?.id, existingReviewNotes]);

  useEffect(() => {
    setSelectedDocumentId(firstLinkedDocumentId);
  }, [active?.id, firstLinkedDocumentId]);

  const handleDecision = async (status: 'APPROVED' | 'REJECTED' | 'CLARIFICATION_REQUESTED') => {
    if (!active || decisionState.status === 'saving') return;
    const labels = {
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      CLARIFICATION_REQUESTED: 'Clarification requested',
    };

    setDecisionState({ status: 'saving', action: status, message: `${labels[status]} is being saved...` });
    try {
      await onReview(active.id, status, notes);
      setDecisionState({
        status: 'saved',
        action: status,
        message: `${labels[status]} saved. Shipment status is now ${formatStatusLabel(status)}.`,
      });
      if (status === 'APPROVED' || status === 'REJECTED') {
        setCompletedDecisionIds((current) => (current.includes(active.id) ? current : [...current, active.id]));
      }
      window.setTimeout(() => {
        setDecisionState((current) => (current.status === 'saved' && current.action === status ? { status: 'idle' } : current));
      }, 3500);
    } catch (error) {
      setDecisionState({
        status: 'error',
        action: status,
        message: toFriendlyMessage(error, 'The decision could not be saved right now. Please try again.'),
      });
    }
  };

  if (!shipments.length) {
    return (
      <div className="ct-stack">
        <section className="ct-empty-state-dark ct-empty-state-premium">
          <div className="ct-badge">VERIFIER ONBOARDING</div>
          <h3>No shipments are waiting for verifier review.</h3>
          <p>The queue will fill as exporters submit shipments with linked plots, documents, and reports.</p>
          <div className="ct-empty-step-grid">
            <div className="ct-empty-step"><span>01</span><strong>Wait for exporter submission</strong></div>
            <div className="ct-empty-step"><span>02</span><strong>Review evidence coverage</strong></div>
            <div className="ct-empty-step"><span>03</span><strong>Approve or request clarification</strong></div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="ct-stack ct-verifier-queue-page">
      <section className="ct-hero">
        <div className="ct-hero-copy">
          <div className="ct-badge">VERIFIER QUEUE</div>
          <h2>Review the case, not the clutter.</h2>
          <p className="ct-hero-lead">Focus on the evidence, risk, and final decision.</p>
        </div>
        <div className="ct-hero-metrics">
          <div className="ct-hero-metric">
            <span>Queued cases</span>
            <strong>{shipments.length}</strong>
            <small>awaiting reviewer action</small>
          </div>
          <div className="ct-hero-metric">
            <span>Clarifications</span>
            <strong>{shipments.filter((shipment) => shipment.status === 'CLARIFICATION_REQUESTED').length}</strong>
            <small>currently back with exporters</small>
          </div>
        </div>
      </section>

      <div className="ct-grid four">
        <StatCard label="Submitted" value={shipments.filter((shipment) => shipment.status === 'SUBMITTED').length} detail="Fresh cases not yet pulled into review." />
        <StatCard label="Under Review" value={shipments.filter((shipment) => shipment.status === 'UNDER_REVIEW').length} detail="Active reviewer workload right now." />
        <StatCard label="High Risk" value={shipments.filter((shipment) => shipment.report?.overall_shipment_risk === 'HIGH').length} detail="Cases with higher risk signatures." />
        <StatCard label="Reviewed Docs" value={extractions.filter((entry) => entry.status === 'REVIEWED').length} detail="Structured documents already confirmed." />
      </div>

      <section className="ct-review-shell">
        <aside className="ct-card ct-review-sidebar">
          <div className="ct-section-head">
            <div className="ct-card-head">
              <div className="ct-card-overline">Summary</div>
              <h2 className="ct-card-title">Cases</h2>
              <p className="ct-card-copy">Search, filter, and open the next shipment to review.</p>
            </div>
          </div>
          <div className="ct-toolbar-grid">
            <label className="ct-field">
              <span>Search case</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Invoice, product, destination"
              />
            </label>
            <label className="ct-field">
              <span>Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                <option value="ALL">All statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under review</option>
                <option value="CLARIFICATION_REQUESTED">Clarification</option>
              </select>
            </label>
          </div>

          <div className="ct-case-list">
            {filteredShipments.map((shipment) => (
              <button
                key={shipment.id}
                type="button"
                className={`ct-case-card ${shipment.id === activeShipmentId ? 'is-active' : ''}`}
                onClick={() => setActiveShipmentId(shipment.id)}
              >
                <div className="ct-case-card-top">
                  <div>
                    <span className="ct-case-eyebrow">Shipment case</span>
                    <strong>{shipment.invoiceId || 'Untitled shipment'}</strong>
                  </div>
                  <span className={`ct-status-pill ${toneForStatus(shipment.status)}`}>{formatStatusLabel(shipment.status)}</span>
                </div>
                <div className="ct-case-card-meta">
                  <span><b>{shipment.product || 'Product missing'}</b>Product</span>
                  <span><b>{shipment.destinationCountry || 'EU'}</b>Destination</span>
                  <span><b>{shipment.report?.overall_shipment_risk ?? 'Pending'}</b>Risk</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="ct-review-main">
          {active ? (
            <div className="ct-stack">
              <section className="ct-card ct-stack ct-verifier-decision-card">
                <div className="ct-section-head">
                  <div className="ct-card-head">
                    <div className="ct-card-overline">Summary</div>
                    <h2 className="ct-card-title">{active.invoiceId}</h2>
                    <p className="ct-card-copy">{active.product} / {active.destinationCountry}</p>
                  </div>
                  <span className={`ct-status-pill ${toneForStatus(active.status)}`}>{active.status}</span>
                </div>
                <div className="ct-grid four ct-verifier-summary-grid">
                  <StatCard label="Suppliers" value={linkedSuppliers.length} detail="Upstream counterparties tied to this shipment." />
                  <StatCard label="Plots" value={linkedPlots.length} detail="Linked geolocation records in the case." />
                  <StatCard label="Documents" value={linkedDocuments.length} detail="Evidence files attached to review." />
                  <StatCard label="Installations" value={linkedInstallations.length} detail="Production footprint surfaced for CBAM." />
                </div>
                <div className="ct-shipment-route-strip">
                  <div><span>Exporter</span><strong>{active.exporterReferenceId || active.ownerId || 'N/A'}</strong></div>
                  <div><span>Verifier</span><strong>{active.verifierId || 'Legacy queue'}</strong></div>
                  <div><span>Importer</span><strong>{active.importerId || 'Unassigned'}</strong></div>
                  <div><span>Release rule</span><strong>After approval</strong><small>Importer sees only approved package</small></div>
                </div>
              </section>

              <section className="ct-guided-grid">
                <div className="ct-guided-block">
                  <div className="ct-card-overline">Evidence</div>
                  <div className="ct-guidance-list">
                    <div className="ct-guidance-item">
                      <strong>Suppliers</strong>
                      <p>{linkedSuppliers.map((supplier) => supplier.name).join(', ') || 'No suppliers linked.'}</p>
                    </div>
                    <div className="ct-guidance-item">
                      <strong>Plots</strong>
                      <p>{linkedPlots.map((plot) => `${plot.name} (${plot.analysis?.status ?? 'PENDING'})`).join(', ') || 'No plots linked.'}</p>
                    </div>
                    <div className="ct-guidance-item">
                      <strong>Installations</strong>
                      <p>{linkedInstallations.map((installation) => installation.name).join(', ') || 'No installations linked.'}</p>
                    </div>
                  </div>
                </div>
                <div className="ct-guided-block">
                  <div className="ct-card-overline">Risk</div>
                  <ProgressMeter
                    label="Reviewed extractions"
                    value={linkedExtractions.filter((entry) => entry.status === 'REVIEWED').length}
                    max={Math.max(linkedDocuments.length, 1)}
                    detail={`${linkedExtractions.filter((entry) => entry.status === 'REVIEWED').length}/${linkedDocuments.length || 0} linked document(s) have reviewer-confirmed fields.`}
                  />
                  <ProgressMeter
                    label="Batch linkage"
                    value={linkedBatches.length}
                    max={Math.max((active.batchIds ?? []).length || linkedBatches.length, 1)}
                    detail={`${linkedBatches.length} production batch record(s) tied into the case.`}
                  />
                </div>
              </section>

              <details className="ct-inline-details">
                <summary>Review focus</summary>
                <p>Check linked plots, reviewed evidence, and production coverage first. Use notes only for decision-critical context.</p>
              </details>

              <PreviewRail
                documents={linkedDocuments}
                selectedDocumentId={selectedDocumentId}
                onSelect={setSelectedDocumentId}
                extractions={linkedExtractions}
              />

              <section className="ct-detail-grid">
                <div className="ct-card ct-stack">
                  <div className="ct-card-overline">Evidence</div>
                  {linkedExtractions.length ? (
                    <div className="ct-guidance-list">
                      {linkedExtractions.map((extraction) => (
                        <div key={extraction.id} className="ct-guidance-item">
                          <strong>
                            {linkedDocuments.find((document) => document.id === extraction.documentId)?.fileName ?? extraction.documentId}
                          </strong>
                          <p>{extraction.status} / {Math.round(extraction.confidence * 100)}% confidence</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ct-note">No extraction records linked to this case.</div>
                  )}
                </div>
                <div className="ct-card ct-stack">
                  <div className="ct-card-overline">Audit</div>
                  {linkedAuditEntries.length ? (
                    <div className="ct-guidance-list">
                      {linkedAuditEntries.slice(0, 8).map((entry) => (
                        <div key={entry.id} className="ct-guidance-item">
                          <strong>{entry.action}</strong>
                          <p>{entry.createdAt.slice(0, 19).replace('T', ' ')} / {entry.summary}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ct-note">No audit entries linked to this case yet.</div>
                  )}
                </div>
              </section>

              {active.report && (
                <>
                  <div className="ct-inline-links">
                    <button className="ct-link-button" onClick={() => onDownloadPdf(active)}>PDF</button>
                    <button className="ct-link-button" onClick={() => onDownloadDds(active)}>DDS</button>
                    <button className="ct-link-button" onClick={() => onDownloadCbamCsv(active)}>CBAM</button>
                  </div>
                  <ComplianceReportCard
                    shipment={active}
                    report={active.report}
                    onDownloadJson={() => onDownloadJson(active)}
                    onDownloadXml={() => onDownloadXml(active)}
                    onDownloadPackage={() => onDownloadPackage(active)}
                  />
                </>
              )}

              <section className="ct-card ct-stack">
                <div className="ct-card-head">
                  <div className="ct-card-overline">Actions</div>
                  <h2 className="ct-card-title">Decision</h2>
                  <p className="ct-card-copy">Leave a short note and choose the next state.</p>
                </div>
                {decisionState.status !== 'idle' && (
                  <div className={`ct-decision-feedback is-${decisionState.status}`} role="status">
                    <span className="ct-decision-feedback-icon" aria-hidden="true">
                      {decisionState.status === 'saving' ? '' : decisionState.status === 'saved' ? '✓' : '!'}
                    </span>
                    <div>
                      <strong>
                        {decisionState.status === 'saving'
                          ? 'Saving decision'
                          : decisionState.status === 'saved'
                            ? 'Decision saved'
                            : 'Decision not saved'}
                      </strong>
                      <p>{decisionState.message}</p>
                    </div>
                  </div>
                )}
                <label className="ct-field">
                  <span>Reviewer notes</span>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
                </label>
                <div className="ct-card-actions">
                  <button
                    className="ct-secondary-button"
                    disabled={decisionState.status === 'saving'}
                    onClick={() => handleDecision('CLARIFICATION_REQUESTED')}
                  >
                    {decisionState.status === 'saving' && decisionState.action === 'CLARIFICATION_REQUESTED'
                      ? 'Sending...'
                      : 'Clarification'}
                  </button>
                  <button
                    className="ct-link-button"
                    disabled={decisionState.status === 'saving'}
                    onClick={() => handleDecision('REJECTED')}
                  >
                    {decisionState.status === 'saving' && decisionState.action === 'REJECTED' ? 'Rejecting...' : 'Reject'}
                  </button>
                  <button
                    className="ct-primary-button ct-decision-approve"
                    disabled={decisionState.status === 'saving'}
                    onClick={() => handleDecision('APPROVED')}
                  >
                    {decisionState.status === 'saving' && decisionState.action === 'APPROVED' ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              </section>
            </div>
          ) : (
            <div className="ct-empty-state-dark ct-empty-state-premium">
              <div className="ct-badge">QUEUE FILTERS</div>
              <h3>No case matches this filter.</h3>
              <p>Widen the search or change the status view to pull another shipment into the review panel.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default VerifierQueueWorkspace;
