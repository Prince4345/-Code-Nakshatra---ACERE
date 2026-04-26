import React, { useMemo, useState } from 'react';
import { CompanyProfile, DocumentRecord, ExtractionRecord, FacilityRecord, ProductionBatchRecord, ShipmentRecord, Supplier } from '../types';
import { InsightMetricCard, PremiumEmptyState, SegmentedFilter } from './Insights';

type ProfileForm = {
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
};

type SupplierForm = {
  id: string;
  name: string;
  type: string;
  commodity: string;
  country: string;
  region: string;
};

const shortReference = (value?: string | null) => {
  if (!value) return 'Not linked';
  const text = String(value).trim();
  if (!text) return 'Not linked';
  if (text.length <= 18) return text;
  return `${text.slice(0, 8)}…${text.slice(-6)}`;
};

const documentStageTone = (stage: string) => {
  if (stage === 'REVIEWED') return 'is-good';
  if (stage === 'EXTRACTED') return 'is-neutral';
  return 'is-warn';
};

export const ProfileWorkspace = ({
  profile,
  profileForm,
  setProfileForm,
  onSubmit,
}: {
  profile: CompanyProfile | null;
  profileForm: ProfileForm;
  setProfileForm: React.Dispatch<React.SetStateAction<ProfileForm>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) => {
  return (
    <div className="ct-stack ct-profile-workspace">
      <form className="ct-card ct-stack" onSubmit={onSubmit}>
        <div className="ct-section-head">
          <div className="ct-card-head">
            <div className="ct-card-overline">{profile ? 'Published profile' : 'New profile'}</div>
            <h2 className="ct-card-title">{profile ? 'Edit exporter profile' : 'Create exporter profile'}</h2>
            <p className="ct-card-copy">Keep legal, contact, and market details release-ready.</p>
          </div>
        </div>
        <div className="ct-form-grid two">
          <label className="ct-field"><span>Legal Entity Name</span><input value={profileForm.legalEntityName} onChange={(event) => setProfileForm((current) => ({ ...current, legalEntityName: event.target.value }))} type="text" /></label>
          <label className="ct-field"><span>Trade Name</span><input value={profileForm.tradeName} onChange={(event) => setProfileForm((current) => ({ ...current, tradeName: event.target.value }))} type="text" /></label>
          <label className="ct-field"><span>GST</span><input value={profileForm.gst} onChange={(event) => setProfileForm((current) => ({ ...current, gst: event.target.value }))} type="text" /></label>
          <label className="ct-field"><span>Udyam</span><input value={profileForm.udyam} onChange={(event) => setProfileForm((current) => ({ ...current, udyam: event.target.value }))} type="text" /></label>
          <label className="ct-field"><span>EORI</span><input value={profileForm.eori} onChange={(event) => setProfileForm((current) => ({ ...current, eori: event.target.value }))} type="text" /></label>
          <label className="ct-field"><span>Contact Name</span><input value={profileForm.contactName} onChange={(event) => setProfileForm((current) => ({ ...current, contactName: event.target.value }))} type="text" /></label>
          <label className="ct-field"><span>Contact Email</span><input value={profileForm.contactEmail} onChange={(event) => setProfileForm((current) => ({ ...current, contactEmail: event.target.value }))} type="email" /></label>
          <label className="ct-field"><span>Contact Phone</span><input value={profileForm.contactPhone} onChange={(event) => setProfileForm((current) => ({ ...current, contactPhone: event.target.value }))} type="text" /></label>
          <label className="ct-field"><span>Export Commodities</span><input value={profileForm.exportCommodities} onChange={(event) => setProfileForm((current) => ({ ...current, exportCommodities: event.target.value }))} type="text" placeholder="Coffee, Steel billets" /></label>
          <label className="ct-field"><span>EU Destination Countries</span><input value={profileForm.destinationCountries} onChange={(event) => setProfileForm((current) => ({ ...current, destinationCountries: event.target.value }))} type="text" placeholder="Germany, Netherlands" /></label>
        </div>
        <label className="ct-field"><span>Registered Address</span><textarea value={profileForm.registeredAddress} onChange={(event) => setProfileForm((current) => ({ ...current, registeredAddress: event.target.value }))} /></label>
        <button className="ct-primary-button" type="submit">Save Profile</button>
      </form>
    </div>
  );
};

export const SuppliersWorkspace = ({
  suppliers,
  supplierForm,
  setSupplierForm,
  products,
  onSubmit,
}: {
  suppliers: Supplier[];
  supplierForm: SupplierForm;
  setSupplierForm: React.Dispatch<React.SetStateAction<SupplierForm>>;
  products: string[];
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [registryOpen, setRegistryOpen] = useState(false);

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesQuery = !query || `${supplier.name} ${supplier.commodity} ${supplier.region} ${supplier.country}`.toLowerCase().includes(query);
      const matchesType = typeFilter === 'ALL' || supplier.type === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [search, suppliers, typeFilter]);

  return (
    <div className="ct-stack ct-supplier-workspace">
      <section className="ct-hero ct-supplier-hero">
        <div>
          <div className="ct-badge">SUPPLIERS</div>
          <h2>Supplier registry</h2>
          <p className="ct-hero-lead">Create, search, link.</p>
        </div>
        <div className="ct-hero-metrics">
          <div className="ct-hero-metric">
            <span>Total</span>
            <strong>{suppliers.length}</strong>
            <small>records</small>
          </div>
          <div className="ct-hero-metric">
            <span>Products</span>
            <strong>{new Set(suppliers.map((supplier) => supplier.commodity).filter(Boolean)).size || 0}</strong>
            <small>streams</small>
          </div>
          <div className="ct-hero-metric">
            <span>Regions</span>
            <strong>{new Set(suppliers.map((supplier) => `${supplier.country}:${supplier.region}`)).size || 0}</strong>
            <small>mapped</small>
          </div>
        </div>
      </section>

      <div className="ct-insight-grid">
        <InsightMetricCard label="Farmers" value={suppliers.filter((supplier) => supplier.type === 'Farmer').length} helper="Direct" />
        <InsightMetricCard label="Aggregators" value={suppliers.filter((supplier) => supplier.type === 'Aggregator').length} helper="Collection" />
        <InsightMetricCard label="Traders" value={suppliers.filter((supplier) => supplier.type === 'Trader').length} helper="Trade" />
        <InsightMetricCard label="Visible" value={filteredSuppliers.length} helper="Shown" />
      </div>

      <div className="ct-grid two wide-right">
        <form className="ct-card ct-stack" onSubmit={onSubmit}>
          <div className="ct-section-head">
            <div className="ct-card-head">
              <div className="ct-card-overline">{supplierForm.id ? 'Edit' : 'Create'}</div>
              <h2 className="ct-card-title">{supplierForm.id ? 'Edit supplier' : 'Add supplier'}</h2>
              <p className="ct-card-copy">Save source details.</p>
            </div>
            {supplierForm.id && <button className="ct-link-button" type="button" onClick={() => setSupplierForm({ id: '', name: '', type: '', commodity: '', country: '', region: '' })}>Cancel Edit</button>}
          </div>
          <label className="ct-field"><span>Supplier Name</span><input value={supplierForm.name} onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))} type="text" /></label>
          <label className="ct-field"><span>Supplier Type</span><select value={supplierForm.type} onChange={(event) => setSupplierForm((current) => ({ ...current, type: event.target.value }))}><option value="">Select...</option>{['Farmer', 'Aggregator', 'Intermediary', 'Trader'].map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label className="ct-field"><span>Commodity</span><select value={supplierForm.commodity} onChange={(event) => setSupplierForm((current) => ({ ...current, commodity: event.target.value }))}><option value="">Select...</option>{products.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <div className="ct-form-grid two">
            <label className="ct-field"><span>Country</span><input value={supplierForm.country} onChange={(event) => setSupplierForm((current) => ({ ...current, country: event.target.value }))} type="text" /></label>
            <label className="ct-field"><span>Region</span><input value={supplierForm.region} onChange={(event) => setSupplierForm((current) => ({ ...current, region: event.target.value }))} type="text" /></label>
          </div>
          <button className="ct-primary-button" type="submit">{supplierForm.id ? 'Update' : 'Save supplier'}</button>
        </form>

        <section className={`ct-card ct-stack ct-supplier-registry-card ${registryOpen ? 'is-open' : ''}`}>
          <div className="ct-section-head">
            <div className="ct-card-head">
              <div className="ct-card-overline">Registry</div>
              <h2 className="ct-card-title">Registry</h2>
              <p className="ct-card-copy">{filteredSuppliers.length} shown</p>
            </div>
            <button className="ct-secondary-button" type="button" onClick={() => setRegistryOpen((current) => !current)}>
              {registryOpen ? 'Hide registry' : 'Open registry'}
            </button>
          </div>
          {registryOpen ? (
            <>
              <div className="ct-toolbar-grid">
                <label className="ct-field">
                  <span>Search</span>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="name, commodity, region" />
                </label>
                <label className="ct-field">
                  <span>Supplier type</span>
                  <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                    <option value="ALL">All supplier types</option>
                    {['Farmer', 'Aggregator', 'Intermediary', 'Trader'].map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
              {filteredSuppliers.length ? (
                <div className="ct-library-list">
                  {filteredSuppliers.map((supplier) => (
                    <div key={supplier.id} className="ct-entity-card ct-supplier-row-card">
                      <div className="ct-entity-card-head">
                        <div>
                          <h3>{supplier.name}</h3>
                          <p>{supplier.type} / {supplier.commodity || 'Commodity pending'}</p>
                        </div>
                        <span className="ct-status-pill is-neutral">{supplier.country || 'Country pending'}</span>
                      </div>
                      <div className="ct-meta-row">
                        <span>{supplier.region || 'Region pending'}</span>
                        <button className="ct-link-button" onClick={() => setSupplierForm({ id: supplier.id, name: supplier.name, type: supplier.type, commodity: supplier.commodity, country: supplier.country, region: supplier.region })} type="button">Edit</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PremiumEmptyState
                  badge="SUPPLIERS"
                  title="No suppliers match this view."
                  description="Clear the filters or add a fresh supplier record to keep the exporter registry moving."
                  steps={['Search by name', 'Switch supplier type', 'Create a new supplier']}
                />
              )}
            </>
          ) : (
            <div className="ct-supplier-registry-preview">
              {filteredSuppliers.slice(0, 3).map((supplier) => (
                <button
                  key={supplier.id}
                  className="ct-supplier-preview-pill"
                  type="button"
                  onClick={() => setRegistryOpen(true)}
                >
                  <strong>{supplier.name}</strong>
                  <span>{supplier.commodity || supplier.type}</span>
                </button>
              ))}
              {!filteredSuppliers.length ? <span className="ct-note">No suppliers yet.</span> : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const documentTimestamp = (document: DocumentRecord) => {
  const parsed = new Date(document.updatedAt ?? document.createdAt);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
};

const documentStageLabel = (document: DocumentRecord, extraction?: ExtractionRecord) =>
  extraction?.status ?? document.ocrStatus ?? 'PENDING';

export const UploadsWorkspace = ({
  documents,
  extractions,
  docTypes,
  shipments = [],
  facilities = [],
  batches = [],
  onSubmit,
  onDownloadPdf,
}: {
  documents: DocumentRecord[];
  extractions: ExtractionRecord[];
  docTypes: string[];
  shipments?: ShipmentRecord[];
  facilities?: FacilityRecord[];
  batches?: ProductionBatchRecord[];
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onDownloadPdf: (document: DocumentRecord) => void;
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [activeDocumentId, setActiveDocumentId] = useState('');

  const orderedDocuments = useMemo(
    () => [...documents].sort((left, right) => documentTimestamp(right).localeCompare(documentTimestamp(left))),
    [documents],
  );

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orderedDocuments.filter((document) => {
      const extraction = extractions.find((item) => item.documentId === document.id);
      const stage = documentStageLabel(document, extraction);
      const matchesQuery =
        !query ||
        `${document.fileName} ${document.documentType} ${document.notes} ${extraction?.detectedDocumentType ?? ''}`
          .toLowerCase()
          .includes(query);
      const matchesType =
        typeFilter === 'ALL' ||
        document.documentType === typeFilter ||
        extraction?.detectedDocumentType === typeFilter;
      const matchesStage = stageFilter === 'ALL' || stage === stageFilter;
      return matchesQuery && matchesType && matchesStage;
    });
  }, [documents, extractions, orderedDocuments, search, stageFilter, typeFilter]);

  const activeDocument =
    filteredDocuments.find((document) => document.id === activeDocumentId) || filteredDocuments[0] || orderedDocuments[0] || null;
  const activeExtraction = activeDocument ? extractions.find((item) => item.documentId === activeDocument.id) : undefined;
  const activeShipment = activeDocument?.linkedShipmentId ? shipments.find((shipment) => shipment.id === activeDocument.linkedShipmentId) : undefined;
  const activeFacility = activeDocument?.linkedFacilityId ? facilities.find((facility) => facility.id === activeDocument.linkedFacilityId) : undefined;
  const activeBatch = activeDocument?.linkedBatchId ? batches.find((batch) => batch.id === activeDocument.linkedBatchId) : undefined;
  const reviewedCount = documents.filter((document) => documentStageLabel(document, extractions.find((item) => item.documentId === document.id)) === 'REVIEWED').length;
  const extractedCount = documents.filter((document) =>
    ['EXTRACTED', 'REVIEWED'].includes(documentStageLabel(document, extractions.find((item) => item.documentId === document.id))),
  ).length;
  const autoDetectedCount = extractions.filter((item) => Boolean(item.detectedDocumentType)).length;
  const linkedShipmentCount = new Set(documents.filter((document) => document.linkedShipmentId).map((document) => document.linkedShipmentId)).size;

  return (
    <div className="ct-stack ct-upload-workspace">
      <section className="ct-hero ct-compact-hero">
        <div>
          <div className="ct-badge">UPLOADS</div>
          <h2>Bring evidence in once.</h2>
        </div>
        <p className="ct-hero-lead">Upload. Classify. Link.</p>
      </section>

      <div className="ct-insight-grid">
        <InsightMetricCard label="Evidence files" value={documents.length} helper="Documents stored in the workspace" />
        <InsightMetricCard label="Auto-detected" value={autoDetectedCount} helper="Files with detected document categories" />
        <InsightMetricCard label="Reviewed" value={reviewedCount} helper={`${Math.round((reviewedCount / Math.max(documents.length, 1)) * 100)}% confirmed`} tone="good" />
        <InsightMetricCard label="Linked shipments" value={linkedShipmentCount} helper="Shipment packages already using evidence" />
      </div>

      <div className="ct-review-shell">
        <aside className="ct-review-sidebar">
          <section className="ct-card ct-stack">
            <div className="ct-section-head">
              <div className="ct-card-head">
                <div className="ct-card-overline">Summary</div>
                <h2 className="ct-card-title">Evidence library</h2>
                <p className="ct-card-copy">{filteredDocuments.length} file(s) in the current view.</p>
              </div>
            </div>
            <label className="ct-field">
              <span>Search evidence</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="file name, notes, detected type"
              />
            </label>
            <SegmentedFilter
              value={stageFilter}
              onChange={setStageFilter}
              options={[
                { value: 'ALL', label: 'All', badge: documents.length },
                { value: 'PENDING', label: 'Pending', badge: documents.length - extractedCount },
                { value: 'EXTRACTED', label: 'Extracted', badge: extractedCount - reviewedCount },
                { value: 'REVIEWED', label: 'Reviewed', badge: reviewedCount },
              ]}
            />
            <label className="ct-field">
              <span>Document type</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="ALL">All types</option>
                {docTypes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            {filteredDocuments.length ? (
              <div className="ct-library-list">
                {filteredDocuments.map((document) => {
                  const extraction = extractions.find((item) => item.documentId === document.id);
                  const stage = documentStageLabel(document, extraction);
                  return (
                    <div
                      key={document.id}
                      className={`ct-entity-card ${activeDocument?.id === document.id ? 'is-active' : ''}`}
                    >
                      <div className="ct-entity-card-head">
                        <div>
                          <h3>{document.fileName}</h3>
                          <p>{(extraction?.detectedDocumentType ?? document.documentType) || 'Auto-detect pending'}</p>
                        </div>
                        <span className={`ct-status-pill ${stage === 'REVIEWED' ? 'is-good' : stage === 'EXTRACTED' ? 'is-neutral' : 'is-warn'}`}>
                          {stage}
                        </span>
                      </div>
                      <div className="ct-meta-row">
                        <span>{document.linkedShipmentId ? 'Shipment-linked' : 'Unlinked evidence'}</span>
                        <span>{document.notes || 'No notes yet'}</span>
                      </div>
                      <div className="ct-actions">
                        <button className="ct-secondary-button" onClick={() => setActiveDocumentId(document.id)} type="button">
                          Open
                        </button>
                        <button className="ct-link-button" onClick={() => onDownloadPdf(document)} type="button">
                          PDF
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <PremiumEmptyState
                badge="EVIDENCE LIBRARY"
                title="No evidence matches this filter."
                description="Clear the filters or upload a new file to start building the evidence set for extraction and shipment linking."
                steps={['Upload a document', 'Leave type on auto-detect', 'Open it for preview']}
              />
            )}
          </section>
        </aside>

        <div className="ct-review-main ct-stack">
          <form className="ct-card ct-stack" onSubmit={onSubmit}>
            <div className="ct-section-head">
              <div className="ct-card-head">
                <div className="ct-card-overline">Action</div>
                <h2 className="ct-card-title">Upload file</h2>
                <p className="ct-card-copy">Add a document to the shared exporter library.</p>
              </div>
            </div>
            <label className="ct-field">
              <span>File</span>
              <input name="file" type="file" />
            </label>
            <div className="ct-form-grid two">
              <label className="ct-field">
                <span>Document type</span>
                <select name="documentType">
                  <option value="">Auto-detect</option>
                  {docTypes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ct-field">
                <span>Notes</span>
                <textarea name="notes" />
              </label>
            </div>
            <button className="ct-primary-button" type="submit">
              Upload file
            </button>
          </form>

          {activeDocument ? (
            <section className="ct-card ct-stack">
              <div className="ct-section-head">
                <div className="ct-card-head">
                  <div className="ct-card-overline">Active document</div>
                  <h2 className="ct-card-title">{activeDocument.fileName}</h2>
                  <p className="ct-card-copy">{(activeExtraction?.detectedDocumentType ?? activeDocument.documentType) || 'Awaiting classification'}</p>
                </div>
                <div className="ct-inline-links">
                  {activeDocument.previewUrl ? (
                    <a className="ct-link-inline" href={activeDocument.previewUrl} target="_blank" rel="noreferrer">
                      Open source
                    </a>
                  ) : null}
                  <button className="ct-secondary-button" onClick={() => onDownloadPdf(activeDocument)} type="button">
                    Download PDF
                  </button>
                </div>
              </div>

              <div className="ct-document-status-grid">
                <div className="ct-document-status-card">
                  <span>Stage</span>
                  <strong className={`ct-status-pill ${documentStageTone(documentStageLabel(activeDocument, activeExtraction))}`}>
                    {documentStageLabel(activeDocument, activeExtraction)}
                  </strong>
                  <small>Current processing state</small>
                </div>
                <div className="ct-document-status-card">
                  <span>Confidence</span>
                  <strong>{Math.round((activeExtraction?.confidence ?? 0) * 100)}%</strong>
                  <small>{activeExtraction?.provider ?? 'Awaiting extraction'}</small>
                </div>
                <div className="ct-document-status-card">
                  <span>Linked shipment</span>
                  <strong title={activeDocument.linkedShipmentId || ''}>
                    {activeShipment ? activeShipment.invoiceId || shortReference(activeShipment.id) : shortReference(activeDocument.linkedShipmentId)}
                  </strong>
                  <small>
                    {activeShipment
                      ? `${activeShipment.product || 'Shipment'} / ${activeShipment.destinationCountry || 'No destination'}`
                      : activeDocument.linkedShipmentId
                        ? 'Shipment record not loaded'
                        : 'Attach from shipment editing'}
                  </small>
                </div>
                <div className="ct-document-status-card">
                  <span>Notes</span>
                  <strong>{activeDocument.notes ? 'Present' : 'None'}</strong>
                  <small>{activeDocument.notes || 'No notes captured yet'}</small>
                </div>
              </div>

              <div className="ct-guided-grid">
                <div className="ct-guided-block">
                  <div className="ct-card-overline">Evidence</div>
                  <div className="ct-card-copy">Preview the file and confirm it is the right source record.</div>
                </div>
                <div className="ct-guided-block is-soft">
                  <div className="ct-card-overline">Context</div>
                  <div className="ct-card-copy">Check shipment, facility, and batch linkage before review.</div>
                </div>
              </div>

              <div className="ct-document-center-layout">
                <div className="ct-stack">
                  {activeDocument.previewUrl ? (
                    <iframe className="ct-document-preview-frame" src={activeDocument.previewUrl} title={activeDocument.fileName} />
                  ) : (
                    <PremiumEmptyState
                      badge="DOCUMENT PREVIEW"
                      title="Preview unavailable for this file."
                      description="This file is saved in the evidence library, but there is no preview URL attached yet."
                      steps={['Open source file', 'Download PDF export', 'Continue in extraction review']}
                    />
                  )}
                </div>

                <div className="ct-stack">
                  <section className="ct-card ct-stack">
                    <div className="ct-section-head">
                      <div className="ct-card-head">
                        <div className="ct-card-overline">Context</div>
                        <h2 className="ct-card-title">Linked records</h2>
                        <p className="ct-card-copy">Where this file already sits in the workflow.</p>
                      </div>
                    </div>
                    <div className="ct-context-grid">
                      <div className="ct-context-card">
                        <span>Shipment</span>
                        <strong>{activeShipment ? `${activeShipment.invoiceId} · ${activeShipment.product}` : 'Not linked yet'}</strong>
                        <small>{activeShipment ? `${activeShipment.destinationCountry} · ${activeShipment.status}` : 'Attach from shipment editing when ready.'}</small>
                      </div>
                      <div className="ct-context-card">
                        <span>Facility</span>
                        <strong>{activeFacility?.name || 'Not linked yet'}</strong>
                        <small>{activeFacility ? `${activeFacility.region}, ${activeFacility.country}` : 'Useful for CBAM evidence routing.'}</small>
                      </div>
                      <div className="ct-context-card">
                        <span>Batch</span>
                        <strong>{activeBatch?.batchCode || 'Not linked yet'}</strong>
                        <small>{activeBatch ? `${activeBatch.product} · ${activeBatch.quantity} ${activeBatch.unit}` : 'Link when production data is mapped.'}</small>
                      </div>
                    </div>
                  </section>

                  <section className="ct-card ct-stack">
                    <div className="ct-section-head">
                      <div className="ct-card-head">
                        <div className="ct-card-overline">Fields</div>
                        <h2 className="ct-card-title">Structured values</h2>
                        <p className="ct-card-copy">Detected values available for review and reporting.</p>
                      </div>
                    </div>
                    {activeExtraction && Object.keys(activeExtraction.extractedFields).length ? (
                      <div className="ct-key-value-grid">
                        {Object.entries(activeExtraction.extractedFields).map(([key, value]) => (
                          <div key={key} className="ct-key-value">
                            <span>{key}</span>
                            <strong>{value || 'Not detected'}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <PremiumEmptyState
                        badge="STRUCTURED DATA"
                        title="No extracted fields yet."
                        description="Run extraction or continue in Extraction Review to turn this evidence into structured values."
                        steps={['Run extraction', 'Open extraction review', 'Confirm the fields']}
                      />
                    )}
                  </section>
                </div>
              </div>
            </section>
          ) : (
            <PremiumEmptyState
              badge="ACTIVE DOCUMENT"
              title="No evidence selected yet."
              description="Upload a file or pick one from the evidence library to see document preview, extraction confidence, and shipment linkage."
              steps={['Upload a file', 'Open a document', 'Run extraction review']}
            />
          )}
        </div>
      </div>
    </div>
  );
};
