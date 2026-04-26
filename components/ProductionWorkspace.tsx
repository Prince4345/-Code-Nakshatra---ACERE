import React, { useMemo, useState } from 'react';
import { DocumentRecord, FacilityRecord, InstallationRecord, ProductionBatchRecord, ShipmentRecord } from '../types';
import { InsightMetricCard, PremiumEmptyState } from './Insights';

const toggleSelection = (values: string[], nextValue: string) =>
  values.includes(nextValue) ? values.filter((value) => value !== nextValue) : [...values, nextValue];

type Props = {
  facilities: FacilityRecord[];
  installations: InstallationRecord[];
  shipments: ShipmentRecord[];
  documents: DocumentRecord[];
  batches: ProductionBatchRecord[];
  onSaveBatch: (payload: Omit<ProductionBatchRecord, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => Promise<void>;
};

const ProductionWorkspace: React.FC<Props> = ({
  facilities,
  installations,
  shipments,
  documents,
  batches,
  onSaveBatch,
}) => {
  const [search, setSearch] = useState('');
  const [batchForm, setBatchForm] = useState({
    id: '',
    shipmentId: '',
    facilityId: '',
    installationId: '',
    batchCode: '',
    product: '',
    quantity: '',
    unit: 'kg',
    fuelType: 'Diesel',
    fuelAmount: '',
    fuelUnit: 'litre',
    electricityKwh: '',
    documentIds: [] as string[],
    notes: '',
  });
  const filteredBatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return batches.filter((batch) => {
      const shipment = shipments.find((item) => item.id === batch.shipmentId);
      const installation = installations.find((item) => item.id === batch.installationId);
      const facility = facilities.find((item) => item.id === batch.facilityId);
      return !query || `${batch.batchCode} ${batch.product} ${shipment?.invoiceId ?? ''} ${installation?.name ?? ''} ${facility?.name ?? ''}`.toLowerCase().includes(query);
    });
  }, [batches, facilities, installations, search, shipments]);
  const linkedEvidenceCount = batches.filter((batch) => batch.documentIds.length > 0).length;
  const linkedShipmentCount = new Set(batches.map((batch) => batch.shipmentId).filter(Boolean)).size;
  const averageElectricity = batches.length
    ? Math.round(batches.reduce((sum, batch) => sum + (Number(batch.electricityKwh) || 0), 0) / Math.max(batches.length, 1))
    : 0;

  return (
    <div className="ct-stack">
      <section className="ct-hero">
        <div>
          <div className="ct-badge">PRODUCTION MAPPING</div>
          <h2>Allocate fuel, electricity, and batch outputs by installation</h2>
        </div>
        <p>Each batch links activity data back to facilities, installations, documents, and shipment outputs.</p>
      </section>

      <div className="ct-insight-grid">
        <InsightMetricCard label="Batches" value={batches.length} helper="Production records in scope" />
        <InsightMetricCard label="Evidence-linked" value={linkedEvidenceCount} helper={`${Math.round((linkedEvidenceCount / Math.max(batches.length, 1)) * 100)}% with document support`} tone={linkedEvidenceCount ? 'good' : 'warn'} />
        <InsightMetricCard label="Shipments covered" value={linkedShipmentCount} helper="Shipment packages tied to production" />
        <InsightMetricCard label="Avg electricity" value={`${averageElectricity} kWh`} helper="Average batch electricity input" />
      </div>

      <div className="ct-grid two wide-right">
        <form
          className="ct-card ct-stack"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSaveBatch(
              {
                shipmentId: batchForm.shipmentId,
                facilityId: batchForm.facilityId,
                installationId: batchForm.installationId,
                batchCode: batchForm.batchCode.trim(),
                product: batchForm.product.trim(),
                quantity: batchForm.quantity.trim(),
                unit: batchForm.unit.trim(),
                fuelType: batchForm.fuelType.trim(),
                fuelAmount: batchForm.fuelAmount.trim(),
                fuelUnit: batchForm.fuelUnit.trim(),
                electricityKwh: batchForm.electricityKwh.trim(),
                documentIds: batchForm.documentIds,
                notes: batchForm.notes.trim(),
              },
              batchForm.id || undefined,
            );
            setBatchForm({
              id: '',
              shipmentId: '',
              facilityId: '',
              installationId: '',
              batchCode: '',
              product: '',
              quantity: '',
              unit: 'kg',
              fuelType: 'Diesel',
              fuelAmount: '',
              fuelUnit: 'litre',
              electricityKwh: '',
              documentIds: [],
              notes: '',
            });
          }}
        >
          <div className="ct-section-head">
            <div>
              <h2>{batchForm.id ? 'Edit Production Batch' : 'Add Production Batch'}</h2>
              <p>Capture quantity, fuel, electricity, and linked evidence.</p>
            </div>
          </div>
          <div className="ct-form-grid two">
            <label className="ct-field">
              <span>Shipment</span>
              <select value={batchForm.shipmentId} onChange={(e) => setBatchForm((current) => ({ ...current, shipmentId: e.target.value }))}>
                <option value="">Select...</option>
                {shipments.map((shipment) => <option key={shipment.id} value={shipment.id}>{shipment.invoiceId} / {shipment.product}</option>)}
              </select>
            </label>
            <label className="ct-field">
              <span>Facility</span>
              <select value={batchForm.facilityId} onChange={(e) => setBatchForm((current) => ({ ...current, facilityId: e.target.value }))}>
                <option value="">Select...</option>
                {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
              </select>
            </label>
          </div>
          <div className="ct-form-grid two">
            <label className="ct-field">
              <span>Installation</span>
              <select value={batchForm.installationId} onChange={(e) => setBatchForm((current) => ({ ...current, installationId: e.target.value }))}>
                <option value="">Select...</option>
                {installations.filter((installation) => !batchForm.facilityId || installation.facilityId === batchForm.facilityId).map((installation) => <option key={installation.id} value={installation.id}>{installation.name}</option>)}
              </select>
            </label>
            <label className="ct-field"><span>Batch Code</span><input value={batchForm.batchCode} onChange={(e) => setBatchForm((current) => ({ ...current, batchCode: e.target.value }))} /></label>
          </div>
          <div className="ct-form-grid two">
            <label className="ct-field"><span>Product</span><input value={batchForm.product} onChange={(e) => setBatchForm((current) => ({ ...current, product: e.target.value }))} /></label>
            <label className="ct-field"><span>Quantity</span><input value={batchForm.quantity} onChange={(e) => setBatchForm((current) => ({ ...current, quantity: e.target.value }))} /></label>
          </div>
          <div className="ct-form-grid three">
            <label className="ct-field"><span>Unit</span><input value={batchForm.unit} onChange={(e) => setBatchForm((current) => ({ ...current, unit: e.target.value }))} /></label>
            <label className="ct-field"><span>Fuel Type</span><input value={batchForm.fuelType} onChange={(e) => setBatchForm((current) => ({ ...current, fuelType: e.target.value }))} /></label>
            <label className="ct-field"><span>Fuel Amount</span><input value={batchForm.fuelAmount} onChange={(e) => setBatchForm((current) => ({ ...current, fuelAmount: e.target.value }))} /></label>
          </div>
          <div className="ct-form-grid two">
            <label className="ct-field"><span>Fuel Unit</span><input value={batchForm.fuelUnit} onChange={(e) => setBatchForm((current) => ({ ...current, fuelUnit: e.target.value }))} /></label>
            <label className="ct-field"><span>Electricity (kWh)</span><input value={batchForm.electricityKwh} onChange={(e) => setBatchForm((current) => ({ ...current, electricityKwh: e.target.value }))} /></label>
          </div>
          <label className="ct-field">
            <span>Linked Documents</span>
            <div className="ct-multi-select">
              {documents.map((document) => (
                <label key={document.id} className="ct-check">
                  <input
                    type="checkbox"
                    checked={batchForm.documentIds.includes(document.id)}
                    onChange={() => setBatchForm((current) => ({ ...current, documentIds: toggleSelection(current.documentIds, document.id) }))}
                  />
                  {document.fileName}
                </label>
              ))}
            </div>
          </label>
          <label className="ct-field"><span>Notes</span><textarea value={batchForm.notes} onChange={(e) => setBatchForm((current) => ({ ...current, notes: e.target.value }))} /></label>
          <button className="ct-primary-button" type="submit">{batchForm.id ? 'Update Batch' : 'Save Batch'}</button>
        </form>

        <section className="ct-card ct-stack">
          <div className="ct-section-head">
            <div>
              <h2>Production Registry</h2>
              <p>{filteredBatches.length} production batch record(s) in this view.</p>
            </div>
          </div>
          <div className="ct-toolbar-grid">
            <label className="ct-field">
              <span>Search production</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="batch, shipment, installation, facility" />
            </label>
          </div>
          {filteredBatches.length ? (
            <div className="ct-library-list">
              {filteredBatches.map((batch) => (
                <div key={batch.id} className="ct-entity-card">
                  <div className="ct-entity-card-head">
                    <div>
                      <h3>{batch.batchCode}</h3>
                      <p>{batch.product} · {batch.quantity} {batch.unit}</p>
                    </div>
                    <span className={`ct-status-pill ${batch.documentIds.length ? 'is-good' : 'is-neutral'}`}>
                      {batch.documentIds.length ? `${batch.documentIds.length} docs` : 'Needs evidence'}
                    </span>
                  </div>
                  <div className="ct-meta-row">
                    <span>{shipments.find((shipment) => shipment.id === batch.shipmentId)?.invoiceId ?? 'Shipment pending'}</span>
                    <span>{installations.find((installation) => installation.id === batch.installationId)?.name ?? 'Installation pending'}</span>
                  </div>
                  <div className="ct-meta-row">
                    <span>{batch.fuelType}: {batch.fuelAmount || 0} {batch.fuelUnit}</span>
                    <span>Electricity: {batch.electricityKwh || 0} kWh</span>
                  </div>
                  <div className="ct-actions">
                    <button
                      className="ct-secondary-button"
                      onClick={() => setBatchForm({
                        id: batch.id,
                        shipmentId: batch.shipmentId,
                        facilityId: batch.facilityId,
                        installationId: batch.installationId,
                        batchCode: batch.batchCode,
                        product: batch.product,
                        quantity: batch.quantity,
                        unit: batch.unit,
                        fuelType: batch.fuelType,
                        fuelAmount: batch.fuelAmount,
                        fuelUnit: batch.fuelUnit,
                        electricityKwh: batch.electricityKwh,
                        documentIds: batch.documentIds,
                        notes: batch.notes,
                      })}
                      type="button"
                    >
                      Edit batch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <PremiumEmptyState badge="PRODUCTION" title="No production batches match this view." description="Start with one mapped batch so CBAM activity data has evidence, installation scope, and shipment context." steps={['Pick a shipment', 'Link the installation', 'Attach supporting evidence']} />
          )}
        </section>
      </div>
    </div>
  );
};

export default ProductionWorkspace;
