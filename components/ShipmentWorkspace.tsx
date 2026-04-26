import React, { useMemo, useState } from 'react';
import ComplianceReportCard from './ComplianceReportCard';
import { InsightMetricCard, PremiumEmptyState, SegmentedFilter } from './Insights';
import {
  DocumentRecord,
  ExtractionRecord,
  FacilityRecord,
  InstallationRecord,
  PlotRecord,
  ProductionBatchRecord,
  SessionUser,
  ShipmentRecord,
  Supplier,
} from '../types';
import { requiresCbamCoverage, requiresEudrCoverage } from '../services/complianceToolkit';
import { getUserWorkspaceId } from '../services/identity';

const toggleSelection = (values: string[], nextValue: string) =>
  values.includes(nextValue) ? values.filter((value) => value !== nextValue) : [...values, nextValue];

const normalizeDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toneForStatus = (status: ShipmentRecord['status']) => {
  if (status === 'APPROVED') return 'is-good';
  if (status === 'REJECTED') return 'is-bad';
  if (status === 'CLARIFICATION_REQUESTED') return 'is-warn';
  return 'is-neutral';
};

const shipmentEventDate = (shipment: ShipmentRecord) =>
  normalizeDate(shipment.approvedAt ?? shipment.updatedAt ?? shipment.createdAt);

const getLinkedSuppliers = (shipment: ShipmentRecord, suppliers: Supplier[]) =>
  suppliers.filter((supplier) => shipment.supplierIds.includes(supplier.id));

const getLinkedPlots = (shipment: ShipmentRecord, plots: PlotRecord[]) =>
  plots.filter((plot) => shipment.plotIds.includes(plot.id));

const getLinkedDocuments = (shipment: ShipmentRecord, documents: DocumentRecord[]) =>
  documents.filter((document) => shipment.documentIds.includes(document.id));

type ShipmentForm = {
  id: string;
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
  facilityIds: string[];
  installationIds: string[];
  batchIds: string[];
  verifierId: string;
  verifierName: string;
  importerId: string;
  importerName: string;
  energyNotes: string;
  additionalNotes: string;
};

type Readiness = {
  isReady: boolean;
  issues: string[];
};

type ExporterActionRoute =
  | '/app/exporter/suppliers'
  | '/app/exporter/plots'
  | '/app/exporter/uploads'
  | '/app/exporter/extractions'
  | '/app/exporter/facilities'
  | '/app/exporter/production';

type ShipmentCardProps = {
  shipment: ShipmentRecord;
  readiness: Readiness;
  selected: boolean;
  onOpen: () => void;
  onEdit: () => void;
};

const ShipmentLibraryCard = ({ shipment, readiness, selected, onOpen, onEdit }: ShipmentCardProps) => {
  const coverageChecks = [
    shipment.supplierIds.length > 0,
    shipment.plotIds.length > 0,
    shipment.documentIds.length > 0,
    (shipment.facilityIds?.length ?? 0) > 0 || (shipment.installationIds?.length ?? 0) > 0 || (shipment.batchIds?.length ?? 0) > 0,
  ].filter(Boolean).length;
  const coveragePercent = Math.round((coverageChecks / 4) * 100);

  return (
    <div className={`ct-entity-card ${selected ? 'is-active' : ''}`}>
      <div className="ct-entity-card-head">
        <div>
          <div className="ct-card-overline">Shipment</div>
          <h3>{shipment.invoiceId || 'Unnumbered shipment'}</h3>
          <p>{shipment.product} / {shipment.destinationCountry || 'EU'}</p>
        </div>
        <span className={`ct-status-pill ${toneForStatus(shipment.status)}`}>{shipment.status.replaceAll('_', ' ')}</span>
      </div>
      <div className="ct-meta-row">
        <span>
          Qty {shipment.quantity || '0'} {shipment.unit || 'units'}
        </span>
        <span>{shipment.report?.overall_shipment_risk ?? 'UNASSESSED'} risk</span>
      </div>
      <div className="ct-progress-card compact">
        <div className="ct-progress-header">
          <strong>Coverage</strong>
          <span>{coveragePercent}%</span>
        </div>
        <div className="ct-progress-bar">
          <div className="ct-progress-fill" style={{ width: `${coveragePercent}%` }} />
        </div>
        <p>{readiness.isReady ? 'Ready' : `${readiness.issues.length} left`}</p>
      </div>
      <div className="ct-card-actions">
        <button className="ct-primary-button" onClick={onOpen} type="button">
          Open
        </button>
        <button className="ct-link-button" onClick={onEdit} type="button">
          Edit
        </button>
      </div>
    </div>
  );
};

const ShipmentDetailEmptyState = ({
  onCreate,
}: {
  onCreate: () => void;
}) => (
  <section className="ct-card ct-stack ct-shipment-detail-card ct-shipment-empty-card">
    <div className="ct-section-head">
      <div className="ct-card-head">
        <div className="ct-card-overline">Shipment detail</div>
        <h2 className="ct-card-title">Open or create a package</h2>
        <p className="ct-card-copy">Pick one from the library or start a new draft.</p>
      </div>
      <button className="ct-primary-button" type="button" onClick={onCreate}>
        New shipment
      </button>
    </div>
    <div className="ct-shipment-empty-strip" aria-label="Shipment workflow steps">
      <div className="ct-shipment-empty-step">
        <span>01</span>
        <strong>Create</strong>
      </div>
      <div className="ct-shipment-empty-step">
        <span>02</span>
        <strong>Link evidence</strong>
      </div>
      <div className="ct-shipment-empty-step">
        <span>03</span>
        <strong>Submit</strong>
      </div>
    </div>
  </section>
);

export const ShipmentsWorkspace = ({
  shipmentForm,
  setShipmentForm,
  suppliers,
  plots,
  documents,
  extractions,
  facilities,
  installations,
  batches,
  shipments,
  activeShipment,
  exporterReferenceId,
  verifierOptions,
  importerOptions,
  euCountries,
  products,
  onSubmit,
  onReset,
  onOpenShipment,
  onEditShipment,
  onOpenWorkspace,
  getReadiness,
  onSubmitForVerification,
  onDownloadJson,
  onDownloadXml,
  onDownloadPackage,
  onDownloadPdf,
  onDownloadDds,
  onDownloadCbamCsv,
  onDownloadPlotGeoJson,
}: {
  shipmentForm: ShipmentForm;
  setShipmentForm: React.Dispatch<React.SetStateAction<ShipmentForm>>;
  suppliers: Supplier[];
  plots: PlotRecord[];
  documents: DocumentRecord[];
  extractions: ExtractionRecord[];
  facilities: FacilityRecord[];
  installations: InstallationRecord[];
  batches: ProductionBatchRecord[];
  shipments: ShipmentRecord[];
  activeShipment: ShipmentRecord | null;
  exporterReferenceId: string;
  verifierOptions: SessionUser[];
  importerOptions: SessionUser[];
  euCountries: string[];
  products: string[];
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onReset: () => void;
  onOpenShipment: (shipmentId: string) => void;
  onEditShipment: (shipment: ShipmentRecord) => void;
  onOpenWorkspace: (path: ExporterActionRoute) => void;
  getReadiness: (shipment: ShipmentRecord) => Readiness;
  onSubmitForVerification: (shipment: ShipmentRecord) => Promise<void>;
  onDownloadJson: (shipment: ShipmentRecord) => void;
  onDownloadXml: (shipment: ShipmentRecord) => void;
  onDownloadPackage: (shipment: ShipmentRecord) => void;
  onDownloadPdf: (shipment: ShipmentRecord) => void;
  onDownloadDds: (shipment: ShipmentRecord) => void;
  onDownloadCbamCsv: (shipment: ShipmentRecord) => void;
  onDownloadPlotGeoJson: (plot: PlotRecord) => void;
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showSubmissionChecklist, setShowSubmissionChecklist] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const orderedShipments = useMemo(
    () =>
      [...shipments].sort((left, right) => {
        const leftDate = shipmentEventDate(left)?.toISOString() ?? '';
        const rightDate = shipmentEventDate(right)?.toISOString() ?? '';
        return rightDate.localeCompare(leftDate);
      }),
    [shipments],
  );

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orderedShipments.filter((shipment) => {
      const matchesQuery =
        !query ||
        `${shipment.invoiceId} ${shipment.product} ${shipment.productCategory} ${shipment.destinationCountry} ${shipment.hsCode}`
          .toLowerCase()
          .includes(query);
      const readiness = getReadiness(shipment);
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && !['APPROVED', 'REJECTED'].includes(shipment.status)) ||
        (statusFilter === 'READY' && readiness.isReady) ||
        (statusFilter === 'ACTION' && !readiness.isReady) ||
        shipment.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [getReadiness, orderedShipments, search, statusFilter]);

  const selectedShipment =
    (activeShipment && filteredShipments.find((shipment) => shipment.id === activeShipment.id)) ||
    filteredShipments[0] ||
    activeShipment ||
    null;

  const linkedSuppliers = selectedShipment ? getLinkedSuppliers(selectedShipment, suppliers) : [];
  const linkedPlots = selectedShipment ? getLinkedPlots(selectedShipment, plots) : [];
  const linkedDocuments = selectedShipment ? getLinkedDocuments(selectedShipment, documents) : [];
  const linkedFacilities = selectedShipment
    ? facilities.filter(
        (facility) =>
          (selectedShipment.facilityIds ?? []).includes(facility.id) ||
          batches.some((batch) => batch.shipmentId === selectedShipment.id && batch.facilityId === facility.id),
      )
    : [];
  const linkedInstallations = selectedShipment
    ? installations.filter(
        (installation) =>
          (selectedShipment.installationIds ?? []).includes(installation.id) ||
          batches.some((batch) => batch.shipmentId === selectedShipment.id && batch.installationId === installation.id),
      )
    : [];
  const linkedBatches = selectedShipment
    ? batches.filter((batch) => (selectedShipment.batchIds ?? []).includes(batch.id) || batch.shipmentId === selectedShipment.id)
    : [];
  const linkedExtractions = selectedShipment
    ? extractions.filter((extraction) => linkedDocuments.some((document) => document.id === extraction.documentId))
    : [];
  const reviewedLinkedDocuments = linkedDocuments.filter((document) =>
    linkedExtractions.some((extraction) => extraction.documentId === document.id && extraction.status === 'REVIEWED'),
  );
  const readiness = selectedShipment ? getReadiness(selectedShipment) : null;
  const selectedRequiresEudr = selectedShipment ? requiresEudrCoverage(selectedShipment) : false;
  const selectedRequiresCbam = selectedShipment ? requiresCbamCoverage(selectedShipment) : false;
  const shipmentBasicsReady = Boolean(
    selectedShipment?.invoiceId &&
      selectedShipment.product &&
      selectedShipment.productCategory &&
      selectedShipment.hsCode &&
      selectedShipment.destinationCountry &&
      selectedShipment.quantity,
  );
  const submissionChecklist = selectedShipment
    ? [
        {
          label: 'Shipment identity',
          detail: 'Invoice, product, HS code, destination, and quantity are filled.',
          ready: shipmentBasicsReady,
          actionLabel: 'Edit',
          action: () => onEditShipment(selectedShipment),
        },
        {
          label: 'Handoff route',
          detail:
            selectedShipment.verifierId && selectedShipment.importerId
              ? `${selectedShipment.verifierId} -> ${selectedShipment.importerId}`
              : 'Assign verifier and importer IDs before submission.',
          ready: Boolean(selectedShipment.verifierId && selectedShipment.importerId),
          actionLabel: 'Edit',
          action: () => onEditShipment(selectedShipment),
        },
        {
          label: 'Supplier linked',
          detail: linkedSuppliers.length ? `${linkedSuppliers.length} supplier record(s) attached.` : 'Attach at least one supplier record.',
          ready: linkedSuppliers.length > 0,
          actionLabel: 'Suppliers',
          action: () => onOpenWorkspace('/app/exporter/suppliers'),
        },
        {
          label: 'Plot and EUDR check',
          detail: selectedRequiresEudr
            ? linkedPlots.some((plot) => plot.analysis?.status === 'COMPLIANT')
              ? 'A compliant EUDR plot is linked.'
              : 'Link a plot and run EUDR until one plot is compliant.'
            : 'Not required for this shipment category.',
          ready: !selectedRequiresEudr || linkedPlots.some((plot) => plot.analysis?.status === 'COMPLIANT'),
          actionLabel: 'Plots',
          action: () => onOpenWorkspace('/app/exporter/plots'),
        },
        {
          label: 'Documents attached',
          detail: linkedDocuments.length ? `${linkedDocuments.length} document(s) attached.` : 'Attach invoice, declaration, utility, shipment, or proof documents.',
          ready: linkedDocuments.length > 0,
          actionLabel: 'Uploads',
          action: () => onOpenWorkspace('/app/exporter/uploads'),
        },
        {
          label: 'Extraction reviewed',
          detail: reviewedLinkedDocuments.length
            ? `${reviewedLinkedDocuments.length} linked document(s) reviewer-confirmed.`
            : 'Review at least one linked extraction before verifier submission.',
          ready: reviewedLinkedDocuments.length > 0,
          actionLabel: 'Review',
          action: () => onOpenWorkspace('/app/exporter/extractions'),
        },
        {
          label: 'CBAM production coverage',
          detail: selectedRequiresCbam
            ? linkedInstallations.length && linkedBatches.length
              ? 'Installation and production batch are linked.'
              : 'Link installation and production batch for CBAM shipment coverage.'
            : 'Not required for this shipment category.',
          ready: !selectedRequiresCbam || (linkedInstallations.length > 0 && linkedBatches.length > 0),
          actionLabel: linkedInstallations.length ? 'Production' : 'Facilities',
          action: () => onOpenWorkspace(linkedInstallations.length ? '/app/exporter/production' : '/app/exporter/facilities'),
        },
        {
          label: 'Compliance report generated',
          detail: selectedShipment.report ? 'Report is available for verifier review.' : 'Save the shipment once to generate the report.',
          ready: Boolean(selectedShipment.report),
          actionLabel: 'Edit',
          action: () => onEditShipment(selectedShipment),
        },
      ]
    : [];
  const submissionReady = Boolean(readiness?.isReady && submissionChecklist.every((item) => item.ready));
  const missingChecklistCount = submissionChecklist.filter((item) => !item.ready).length;
  const evidenceCount =
    linkedSuppliers.length +
    linkedPlots.length +
    linkedDocuments.length +
    linkedFacilities.length +
    linkedInstallations.length +
    linkedBatches.length;
  const reportRisk = selectedShipment?.report?.overall_shipment_risk ?? 'Unassessed';
  const reportedEmissions = selectedShipment?.report?.cbam.reported_emissions_tCO2 ?? 0;

  const approvedCount = shipments.filter((shipment) => shipment.status === 'APPROVED').length;
  const underReviewCount = shipments.filter((shipment) =>
    ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED'].includes(shipment.status),
  ).length;
  const blockedCount = shipments.filter((shipment) => !getReadiness(shipment).isReady).length;
  const trackedEmissions = shipments.reduce((total, shipment) => total + (shipment.report?.cbam.reported_emissions_tCO2 ?? 0), 0);
  const formVisible = formOpen || Boolean(shipmentForm.id);
  const editingShipment = shipmentForm.id ? shipments.find((shipment) => shipment.id === shipmentForm.id) ?? null : null;
  const saveButtonLabel =
    editingShipment && editingShipment.status !== 'DRAFT'
      ? 'Save changes'
      : 'Save draft';
  const saveButtonCopy =
    editingShipment && editingShipment.status !== 'DRAFT'
      ? 'Updates this package without changing its current review state.'
      : 'Saving keeps this shipment in draft. Verifier review starts only after separate submission.';
  const openEditForm = (shipment: ShipmentRecord) => {
    onEditShipment(shipment);
    setFormOpen(true);
  };
  const closeForm = () => {
    onReset();
    setFormOpen(false);
  };
  const verifierRoutingOptions = verifierOptions.map((user) => ({
    id: getUserWorkspaceId(user),
    label: `${user.name} / ${getUserWorkspaceId(user)}`,
  }));
  const importerRoutingOptions = importerOptions.map((user) => ({
    id: getUserWorkspaceId(user),
    label: `${user.name} / ${getUserWorkspaceId(user)}`,
  }));
  const setVerifierRouting = (value: string) => {
    const selected = verifierOptions.find((user) => getUserWorkspaceId(user) === value || user.id === value);
    setShipmentForm((current) => ({
      ...current,
      verifierId: value,
      verifierName: selected?.name ?? '',
    }));
  };
  const setImporterRouting = (value: string) => {
    const selected = importerOptions.find((user) => getUserWorkspaceId(user) === value || user.id === value);
    setShipmentForm((current) => ({
      ...current,
      importerId: value,
      importerName: selected?.name ?? '',
    }));
  };

  return (
    <div className="ct-stack ct-shipments-workspace">
      <section className="ct-shipments-header">
        <div className="ct-hero-copy">
          <div className="ct-badge">SHIPMENT COMMAND</div>
          <h2>Shipments</h2>
          <p className="ct-hero-lead">Create, link evidence, submit, export.</p>
          <button className="ct-primary-button" type="button" onClick={() => setFormOpen((current) => !current)}>
            {formVisible ? 'Hide form' : 'New shipment'}
          </button>
        </div>
        <div className="ct-hero-metrics">
          <div className="ct-hero-metric">
            <span>Approved</span>
            <strong>{approvedCount}</strong>
            <small>release-ready packages</small>
          </div>
          <div className="ct-hero-metric">
            <span>In review</span>
            <strong>{underReviewCount}</strong>
            <small>with verifier activity</small>
          </div>
          <div className="ct-hero-metric">
            <span>Needs work</span>
            <strong>{blockedCount}</strong>
            <small>missing required linkage</small>
          </div>
        </div>
      </section>

      <div className="ct-insight-grid">
        <InsightMetricCard
          label="Approval rate"
          value={`${Math.round((approvedCount / Math.max(shipments.length, 1)) * 100)}%`}
          helper={`${approvedCount} package(s) approved`}
          tone="good"
        />
        <InsightMetricCard
          label="In review"
          value={underReviewCount}
          helper="Submitted or under review"
          tone="warn"
        />
        <InsightMetricCard
          label="Needs work"
          value={blockedCount}
          helper="Missing required coverage"
          tone={blockedCount ? 'bad' : 'good'}
        />
        <InsightMetricCard
          label="Reported emissions"
          value={`${trackedEmissions.toFixed(1)} tCO2`}
          helper="Current CBAM total"
        />
      </div>

      <details className="ct-inline-details">
        <summary>What counts as ready</summary>
        <p>A shipment is ready when the package has linked supplier, plot, document, and facility or production coverage.</p>
      </details>

      <div className="ct-review-shell">
        <aside className="ct-review-sidebar">
          <section className="ct-card ct-stack">
            <div className="ct-section-head">
              <div className="ct-card-head">
                <div className="ct-card-overline">Shipments</div>
                <h2 className="ct-card-title">Library</h2>
                <p className="ct-card-copy">{filteredShipments.length} shown</p>
              </div>
            </div>
            <label className="ct-field">
              <span>Search shipments</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="invoice, product, destination, HS code"
              />
            </label>
            <SegmentedFilter
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All', badge: shipments.length },
                {
                  value: 'ACTIVE',
                  label: 'Active',
                  badge: shipments.filter((shipment) => !['APPROVED', 'REJECTED'].includes(shipment.status)).length,
                },
                {
                  value: 'READY',
                  label: 'Ready',
                  badge: shipments.filter((shipment) => getReadiness(shipment).isReady).length,
                },
                { value: 'ACTION', label: 'Attention', badge: blockedCount },
                { value: 'APPROVED', label: 'Approved', badge: approvedCount },
              ]}
            />
            {filteredShipments.length ? (
              <div className="ct-library-list">
                {filteredShipments.map((shipment) => (
                  <ShipmentLibraryCard
                    key={shipment.id}
                    shipment={shipment}
                    readiness={getReadiness(shipment)}
                    selected={selectedShipment?.id === shipment.id}
                    onOpen={() => onOpenShipment(shipment.id)}
                    onEdit={() => openEditForm(shipment)}
                  />
                ))}
              </div>
            ) : (
              <PremiumEmptyState
                badge="SHIPMENT LIBRARY"
                title="No shipment found."
                description="Clear filters or start a draft."
                steps={['Clear', 'Search', 'New shipment']}
              />
            )}
          </section>
        </aside>

        <div className="ct-review-main ct-stack">
          {formVisible ? (
          <form className="ct-card ct-stack ct-shipment-form-card" onSubmit={onSubmit}>
            <div className="ct-section-head">
              <div className="ct-card-head">
                <div className="ct-card-overline">{shipmentForm.id ? 'Edit mode' : 'Create mode'}</div>
                <h2 className="ct-card-title">{shipmentForm.id ? 'Edit shipment' : 'New shipment'}</h2>
                <p className="ct-card-copy">Set route, then attach evidence.</p>
              </div>
              {shipmentForm.id ? (
                <button className="ct-link-button" type="button" onClick={closeForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>
            <div className="ct-routing-panel">
              <div className="ct-routing-node">
                <span>Exporter ID</span>
                <strong>{exporterReferenceId || 'Add GSTIN in profile'}</strong>
                <small>GSTIN / EORI / workspace ID</small>
              </div>
              <label className="ct-field">
                <span>Verifier ID</span>
                <input
                  list="ct-verifier-routing-options"
                  value={shipmentForm.verifierId}
                  onChange={(event) => setVerifierRouting(event.target.value)}
                  placeholder="Choose or enter VER-..."
                  type="text"
                />
                <datalist id="ct-verifier-routing-options">
                  {verifierRoutingOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </datalist>
              </label>
              <label className="ct-field">
                <span>Importer ID</span>
                <input
                  list="ct-importer-routing-options"
                  value={shipmentForm.importerId}
                  onChange={(event) => setImporterRouting(event.target.value)}
                  placeholder="Choose or enter IMP-..."
                  type="text"
                />
                <datalist id="ct-importer-routing-options">
                  {importerRoutingOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </datalist>
              </label>
            </div>
            <div className="ct-form-grid two">
              <label className="ct-field">
                <span>Invoice ID</span>
                <input
                  value={shipmentForm.invoiceId}
                  onChange={(event) => setShipmentForm((current) => ({ ...current, invoiceId: event.target.value }))}
                  type="text"
                />
              </label>
              <label className="ct-field">
                <span>Product</span>
                <input
                  value={shipmentForm.product}
                  onChange={(event) => setShipmentForm((current) => ({ ...current, product: event.target.value }))}
                  type="text"
                />
              </label>
              <label className="ct-field">
                <span>Product category</span>
                <select
                  value={shipmentForm.productCategory}
                  onChange={(event) => setShipmentForm((current) => ({ ...current, productCategory: event.target.value }))}
                >
                  <option value="">Select...</option>
                  {products.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ct-field">
                <span>HS code</span>
                <input
                  value={shipmentForm.hsCode}
                  onChange={(event) => setShipmentForm((current) => ({ ...current, hsCode: event.target.value }))}
                  type="text"
                />
              </label>
              <label className="ct-field">
                <span>Destination</span>
                <select
                  value={shipmentForm.destinationCountry}
                  onChange={(event) => setShipmentForm((current) => ({ ...current, destinationCountry: event.target.value }))}
                >
                  <option value="">Select...</option>
                  {euCountries.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ct-field">
                <span>Quantity</span>
                <input
                  value={shipmentForm.quantity}
                  onChange={(event) => setShipmentForm((current) => ({ ...current, quantity: event.target.value }))}
                  type="text"
                />
              </label>
              <label className="ct-field">
                <span>Unit</span>
                <input
                  value={shipmentForm.unit}
                  onChange={(event) => setShipmentForm((current) => ({ ...current, unit: event.target.value }))}
                  type="text"
                />
              </label>
              <label className="ct-field">
                <span>Energy / emissions notes</span>
                <input
                  value={shipmentForm.energyNotes}
                  onChange={(event) => setShipmentForm((current) => ({ ...current, energyNotes: event.target.value }))}
                  type="text"
                />
              </label>
            </div>
            <div className="ct-form-grid three">
              <label className="ct-field">
                <span>Suppliers</span>
                <div className="ct-multi-select">
                  {suppliers.map((supplier) => (
                    <label key={supplier.id} className="ct-check">
                      <input
                        type="checkbox"
                        checked={shipmentForm.supplierIds.includes(supplier.id)}
                        onChange={() =>
                          setShipmentForm((current) => ({
                            ...current,
                            supplierIds: toggleSelection(current.supplierIds, supplier.id),
                          }))
                        }
                      />
                      {supplier.name}
                    </label>
                  ))}
                </div>
              </label>
              <label className="ct-field">
                <span>Plots</span>
                <div className="ct-multi-select">
                  {plots.map((plot) => (
                    <label key={plot.id} className="ct-check">
                      <input
                        type="checkbox"
                        checked={shipmentForm.plotIds.includes(plot.id)}
                        onChange={() =>
                          setShipmentForm((current) => ({
                            ...current,
                            plotIds: toggleSelection(current.plotIds, plot.id),
                          }))
                        }
                      />
                      {plot.name}
                    </label>
                  ))}
                </div>
              </label>
              <label className="ct-field">
                <span>Documents</span>
                <div className="ct-multi-select">
                  {documents.map((document) => (
                    <label key={document.id} className="ct-check">
                      <input
                        type="checkbox"
                        checked={shipmentForm.documentIds.includes(document.id)}
                        onChange={() =>
                          setShipmentForm((current) => ({
                            ...current,
                            documentIds: toggleSelection(current.documentIds, document.id),
                          }))
                        }
                      />
                      {document.fileName}
                    </label>
                  ))}
                </div>
              </label>
            </div>
            <div className="ct-form-grid three">
              <label className="ct-field">
                <span>Facilities</span>
                <div className="ct-multi-select">
                  {facilities.map((facility) => (
                    <label key={facility.id} className="ct-check">
                      <input
                        type="checkbox"
                        checked={shipmentForm.facilityIds.includes(facility.id)}
                        onChange={() =>
                          setShipmentForm((current) => ({
                            ...current,
                            facilityIds: toggleSelection(current.facilityIds, facility.id),
                          }))
                        }
                      />
                      {facility.name}
                    </label>
                  ))}
                </div>
              </label>
              <label className="ct-field">
                <span>Installations</span>
                <div className="ct-multi-select">
                  {installations.map((installation) => (
                    <label key={installation.id} className="ct-check">
                      <input
                        type="checkbox"
                        checked={shipmentForm.installationIds.includes(installation.id)}
                        onChange={() =>
                          setShipmentForm((current) => ({
                            ...current,
                            installationIds: toggleSelection(current.installationIds, installation.id),
                          }))
                        }
                      />
                      {installation.name}
                    </label>
                  ))}
                </div>
              </label>
              <label className="ct-field">
                <span>Production batches</span>
                <div className="ct-multi-select">
                  {batches.map((batch) => (
                    <label key={batch.id} className="ct-check">
                      <input
                        type="checkbox"
                        checked={shipmentForm.batchIds.includes(batch.id)}
                        onChange={() =>
                          setShipmentForm((current) => ({
                            ...current,
                            batchIds: toggleSelection(current.batchIds, batch.id),
                          }))
                        }
                      />
                      {batch.batchCode}
                    </label>
                  ))}
                </div>
              </label>
            </div>
            <label className="ct-field">
              <span>Additional notes</span>
              <textarea
                value={shipmentForm.additionalNotes}
                onChange={(event) => setShipmentForm((current) => ({ ...current, additionalNotes: event.target.value }))}
              />
            </label>
            <div className="ct-guided-block is-soft ct-shipment-form-footer">
              <div>
                <div className="ct-card-overline">Draft save</div>
                <strong>{saveButtonLabel}</strong>
                <p>{saveButtonCopy}</p>
              </div>
              <div className="ct-card-actions">
                <button className="ct-primary-button" type="submit">
                  {saveButtonLabel}
                </button>
              </div>
            </div>
          </form>
          ) : null}

          {selectedShipment ? (
            <section className="ct-card ct-stack ct-shipment-detail-card">
              <div className="ct-shipment-hero-card">
                <div className="ct-shipment-title-row">
                  <div>
                    <div className="ct-card-overline">Active package</div>
                    <h2 className="ct-card-title">{selectedShipment.invoiceId || 'Shipment package'}</h2>
                    <p className="ct-card-copy">
                      {selectedShipment.product || 'Product pending'} / {selectedShipment.destinationCountry || 'Destination pending'} / HS{' '}
                      {selectedShipment.hsCode || 'pending'}
                    </p>
                  </div>
                  <span className={`ct-status-pill ${toneForStatus(selectedShipment.status)}`}>
                    {selectedShipment.status.replaceAll('_', ' ')}
                  </span>
                </div>

                <div className="ct-shipment-snapshot-grid">
                  <div className="ct-shipment-snapshot">
                    <span>Quantity</span>
                    <strong>
                      {selectedShipment.quantity || '0'} {selectedShipment.unit || 'units'}
                    </strong>
                  </div>
                  <div className="ct-shipment-snapshot">
                    <span>Evidence</span>
                    <strong>{evidenceCount}</strong>
                  </div>
                  <div className="ct-shipment-snapshot">
                    <span>Risk</span>
                    <strong>{reportRisk}</strong>
                  </div>
                  <div className="ct-shipment-snapshot">
                    <span>CBAM</span>
                    <strong>{reportedEmissions.toFixed(1)} tCO2</strong>
                  </div>
                </div>

                <div className="ct-shipment-route-strip" aria-label="Shipment handoff route">
                  <div>
                    <span>Exporter</span>
                    <strong>{selectedShipment.exporterReferenceId || exporterReferenceId || 'Not set'}</strong>
                  </div>
                  <div>
                    <span>Verifier</span>
                    <strong>{selectedShipment.verifierId || 'Not assigned'}</strong>
                    {selectedShipment.verifierName ? <small>{selectedShipment.verifierName}</small> : null}
                  </div>
                  <div>
                    <span>Importer</span>
                    <strong>{selectedShipment.importerId || 'Not assigned'}</strong>
                    {selectedShipment.importerName ? <small>{selectedShipment.importerName}</small> : null}
                  </div>
                  <div>
                    <span>Release</span>
                    <strong>{selectedShipment.status === 'APPROVED' ? 'Importer visible' : 'Locked'}</strong>
                    <small>{selectedShipment.status === 'APPROVED' ? 'Package is available' : 'Visible after approval'}</small>
                  </div>
                </div>

                <div className="ct-shipment-action-strip">
                  <button className="ct-secondary-button" onClick={() => openEditForm(selectedShipment)} type="button">
                    Edit
                  </button>
                  <button className="ct-secondary-button" type="button" onClick={() => setShowSubmissionChecklist((current) => !current)}>
                    {showSubmissionChecklist
                      ? 'Hide submission'
                      : missingChecklistCount
                        ? `Submission (${missingChecklistCount})`
                        : 'Submission'}
                  </button>
                  {selectedShipment.report ? (
                    <details className="ct-package-download-menu">
                      <summary>Download package</summary>
                      <div className="ct-download-menu-list">
                        <button onClick={() => onDownloadPackage(selectedShipment)} type="button">Full package</button>
                        <button onClick={() => onDownloadPdf(selectedShipment)} type="button">Official PDF</button>
                        <button onClick={() => onDownloadDds(selectedShipment)} type="button">DDS</button>
                        <button onClick={() => onDownloadXml(selectedShipment)} type="button">XML</button>
                        <button onClick={() => onDownloadJson(selectedShipment)} type="button">JSON</button>
                        <button onClick={() => onDownloadCbamCsv(selectedShipment)} type="button">CBAM CSV</button>
                      </div>
                    </details>
                  ) : null}
                </div>
              </div>

              <div className="ct-guided-block is-soft ct-shipment-submit-panel">
                <div>
                  <div className="ct-card-overline">Verifier handoff</div>
                  <strong>
                    {selectedShipment.status === 'DRAFT'
                      ? 'Submit this draft only when the package is ready.'
                      : selectedShipment.status === 'SUBMITTED' || selectedShipment.status === 'UNDER_REVIEW'
                        ? 'This package is already in verifier review.'
                        : selectedShipment.status === 'APPROVED'
                          ? 'Approved packages are now visible to the importer.'
                          : selectedShipment.status === 'CLARIFICATION_REQUESTED'
                            ? 'Verifier asked for clarification before approval.'
                            : 'This shipment is no longer in draft.'}
                  </strong>
                  <p>
                    Saving does not send anything to the verifier. Submission happens here as a separate handoff step.
                  </p>
                </div>
                <div className="ct-card-actions">
                  <button className="ct-secondary-button" type="button" onClick={() => setShowSubmissionChecklist((current) => !current)}>
                    {showSubmissionChecklist ? 'Hide checklist' : 'Open checklist'}
                  </button>
                  {selectedShipment.status === 'DRAFT' ? (
                    <button
                      className="ct-primary-button"
                      disabled={!submissionReady}
                      onClick={() => onSubmitForVerification(selectedShipment)}
                      type="button"
                    >
                      Submit to verifier
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="ct-evidence-board">
                <div className="ct-evidence-row">
                  <div className="ct-evidence-main">
                    <span>Suppliers</span>
                    <strong>{linkedSuppliers.length ? `${linkedSuppliers.length} linked` : 'Missing'}</strong>
                  </div>
                  <div className="ct-evidence-chip-list">
                    {linkedSuppliers.slice(0, 3).map((supplier) => (
                      <span key={supplier.id} className="ct-mini-chip">{supplier.name}</span>
                    ))}
                    {!linkedSuppliers.length ? <button type="button" onClick={() => onOpenWorkspace('/app/exporter/suppliers')}>Add</button> : null}
                  </div>
                </div>
                <div className="ct-evidence-row">
                  <div className="ct-evidence-main">
                    <span>Plots</span>
                    <strong>{linkedPlots.length ? `${linkedPlots.length} mapped` : selectedRequiresEudr ? 'Required' : 'Optional'}</strong>
                  </div>
                  <div className="ct-evidence-chip-list">
                    {linkedPlots.slice(0, 3).map((plot) => (
                      <span key={plot.id} className="ct-mini-chip">{plot.name}</span>
                    ))}
                    {!linkedPlots.length ? <button type="button" onClick={() => onOpenWorkspace('/app/exporter/plots')}>Map</button> : null}
                  </div>
                </div>
                <div className="ct-evidence-row">
                  <div className="ct-evidence-main">
                    <span>Documents</span>
                    <strong>{linkedDocuments.length ? `${linkedDocuments.length} attached` : 'Missing'}</strong>
                  </div>
                  <div className="ct-evidence-chip-list">
                    {linkedDocuments.slice(0, 3).map((document) => (
                      <span key={document.id} className="ct-mini-chip">{document.documentType}</span>
                    ))}
                    {!linkedDocuments.length ? <button type="button" onClick={() => onOpenWorkspace('/app/exporter/uploads')}>Upload</button> : null}
                  </div>
                </div>
                <div className="ct-evidence-row">
                  <div className="ct-evidence-main">
                    <span>CBAM data</span>
                    <strong>{selectedRequiresCbam ? `${linkedInstallations.length + linkedBatches.length} linked` : 'Not required'}</strong>
                  </div>
                  <div className="ct-evidence-chip-list">
                    {linkedInstallations.slice(0, 2).map((installation) => (
                      <span key={installation.id} className="ct-mini-chip">{installation.name}</span>
                    ))}
                    {linkedBatches.slice(0, 2).map((batch) => (
                      <span key={batch.id} className="ct-mini-chip">{batch.batchCode}</span>
                    ))}
                    {selectedRequiresCbam && !linkedInstallations.length ? (
                      <button type="button" onClick={() => onOpenWorkspace('/app/exporter/facilities')}>Link</button>
                    ) : null}
                  </div>
                </div>
              </div>

              {showSubmissionChecklist ? (
                <div className="ct-guided-block ct-submission-checklist ct-collapsible-panel">
                  <div className="ct-card-overline">Verification checklist</div>
                  <strong>{submissionReady ? 'Ready for verifier' : 'Items to fix'}</strong>
                  <div className="ct-submission-list">
                    {submissionChecklist.map((item) => (
                      <div key={item.label} className={`ct-submission-item ${item.ready ? 'is-good' : 'is-warn'}`}>
                        <div>
                          <span>{item.ready ? 'Ready' : 'Needed'}</span>
                          <strong>{item.label}</strong>
                          <small>{item.detail}</small>
                        </div>
                        {!item.ready ? (
                          <button className="ct-link-button" type="button" onClick={item.action}>
                            {item.actionLabel}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {linkedPlots.length ? (
                <details className="ct-collapsible-panel">
                  <summary>Linked plot evidence</summary>
                  <div className="ct-grid two">
                    {linkedPlots.map((plot) => (
                      <div key={plot.id} className="ct-package-card">
                        <div className="ct-package-card-top">
                          <div>
                            <div className="ct-badge">PLOT</div>
                            <h3>{plot.name}</h3>
                            <p>
                              {plot.commodity} / {plot.countryOfProduction}
                            </p>
                          </div>
                          <span className={`ct-status-pill ${plot.analysis?.status === 'COMPLIANT' ? 'is-good' : 'is-neutral'}`}>
                            {plot.analysis?.status ?? 'PENDING'}
                          </span>
                        </div>
                        <div className="ct-package-meta">
                          <span>{plot.geometryType}</span>
                          <span>{plot.areaHectares || 'N/A'} ha</span>
                          <span>{plot.analysis?.satellite_source ?? 'Awaiting analysis'}</span>
                        </div>
                        <div className="ct-package-actions">
                          <button className="ct-secondary-button" onClick={() => onDownloadPlotGeoJson(plot)} type="button">
                            GeoJSON
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}

              {selectedShipment.report ? (
                <details className="ct-collapsible-panel">
                  <summary>Report preview</summary>
                  <ComplianceReportCard
                    shipment={selectedShipment}
                    report={selectedShipment.report}
                    onDownloadJson={() => onDownloadJson(selectedShipment)}
                    onDownloadXml={() => onDownloadXml(selectedShipment)}
                    onDownloadPackage={() => onDownloadPackage(selectedShipment)}
                  />
                </details>
              ) : null}
            </section>
          ) : (
            <ShipmentDetailEmptyState onCreate={() => setFormOpen(true)} />
          )}
        </div>
      </div>
    </div>
  );
};

