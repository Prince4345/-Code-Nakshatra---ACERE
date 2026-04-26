import React, { useMemo, useState } from 'react';
import { PlotRecord, Supplier } from '../types';
import { PremiumEmptyState } from './Insights';
import { PlotBuilderMap, PlotPreviewMap } from './PlotMaps';

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="ct-card ct-stat">
    <div className="ct-stat-label">{label}</div>
    <div className="ct-stat-value">{value}</div>
  </div>
);

type PlotForm = {
  id: string;
  name: string;
  supplierId: string;
  commodity: string;
  countryOfProduction: string;
  geometryType: 'point' | 'polygon';
  areaHectares: string;
  coordinates: string;
  geojsonText: string;
};

const getPlotStatusTone = (status?: string) => {
  const normalized = (status ?? 'PENDING').toUpperCase();

  if (normalized === 'COMPLIANT' || normalized === 'LOW') return 'is-good';
  if (normalized === 'PENDING' || normalized === 'MEDIUM') return 'is-neutral';
  return 'is-bad';
};

export const PlotsWorkspace = ({
  suppliers,
  products,
  plots,
  plotForm,
  setPlotForm,
  plotDraftCoordinates,
  setPlotDraftCoordinates,
  activePlot,
  busy,
  onSubmit,
  onReset,
  onClearBuilder,
  onUndoCoordinate,
  onRemoveCoordinate,
  onMoveCoordinate,
  onAddCoordinate,
  onSelectPlot,
  onEditPlot,
  onDownloadGeoJson,
  onRunAnalysis,
}: {
  suppliers: Supplier[];
  products: string[];
  plots: PlotRecord[];
  plotForm: PlotForm;
  setPlotForm: React.Dispatch<React.SetStateAction<PlotForm>>;
  plotDraftCoordinates: number[][];
  setPlotDraftCoordinates: React.Dispatch<React.SetStateAction<number[][]>>;
  activePlot: PlotRecord | null;
  busy: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onReset: () => void;
  onClearBuilder: () => void;
  onUndoCoordinate: () => void;
  onRemoveCoordinate: (index: number) => void;
  onMoveCoordinate: (index: number, coordinate: [number, number]) => void;
  onAddCoordinate: (coordinate: [number, number]) => void;
  onSelectPlot: (plotId: string) => void;
  onEditPlot: (plot: PlotRecord) => void;
  onDownloadGeoJson: (plot: PlotRecord) => void;
  onRunAnalysis: () => Promise<void>;
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'COMPLIANT' | 'PENDING' | 'NON_COMPLIANT'>('all');
  const [builderOpen, setBuilderOpen] = useState(true);
  const supplierById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier])),
    [suppliers],
  );
  const compliantCount = plots.filter(
    (plot) => (plot.analysis?.status ?? 'PENDING').toUpperCase() === 'COMPLIANT',
  ).length;
  const pendingCount = plots.length - compliantCount;
  const filteredPlots = useMemo(() => {
    const query = search.trim().toLowerCase();
    return plots.filter((plot) => {
      const supplier = supplierById.get(plot.supplierId);
      const status = (plot.analysis?.status ?? 'PENDING').toUpperCase();
      const matchesStatus = statusFilter === 'all' ? true : status === statusFilter;
      const matchesQuery =
        !query ||
        `${plot.name} ${plot.commodity} ${plot.countryOfProduction} ${supplier?.name ?? ''}`
          .toLowerCase()
          .includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [plots, search, statusFilter, supplierById]);
  const activeSupplier = activePlot ? supplierById.get(activePlot.supplierId) : null;

  return (
    <div className="ct-stack ct-plots-workspace">
      <section className="ct-plots-header">
        <div>
          <div className="ct-badge">LAND VERIFICATION</div>
          <h2>Plots & EUDR</h2>
          <p>Map land, screen risk, link provenance.</p>
        </div>
        <div className="ct-plots-header-actions">
          <button className="ct-secondary-button" type="button" onClick={() => setBuilderOpen((current) => !current)}>
            {builderOpen ? 'Hide builder' : 'New plot'}
          </button>
          {activePlot ? (
            <button className="ct-primary-button" disabled={busy} onClick={onRunAnalysis}>
              {busy ? 'Running...' : 'Run EUDR'}
            </button>
          ) : null}
        </div>
      </section>

      {builderOpen ? (
      <div className="ct-plot-builder-layout">
        <div className="ct-stack">
          <form className="ct-card ct-stack ct-plot-form-card" onSubmit={onSubmit}>
            <div className="ct-section-head">
              <div>
                <div className="ct-card-overline">{plotForm.id ? 'Editing' : 'Create'}</div>
                <h2 className="ct-card-title">{plotForm.id ? 'Edit plot' : 'Add plot'}</h2>
                <p className="ct-card-copy">Save supplier-linked geometry.</p>
              </div>
              {plotForm.id ? (
                <button className="ct-link-button" type="button" onClick={onReset}>
                  Cancel
                </button>
              ) : null}
            </div>
            <label className="ct-field">
              <span>Plot Name</span>
              <input
                value={plotForm.name}
                onChange={(event) => setPlotForm((current) => ({ ...current, name: event.target.value }))}
                type="text"
              />
            </label>
            <label className="ct-field">
              <span>Supplier</span>
              <select
                value={plotForm.supplierId}
                onChange={(event) => setPlotForm((current) => ({ ...current, supplierId: event.target.value }))}
              >
                <option value="">Select...</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="ct-field">
              <span>Commodity</span>
              <select
                value={plotForm.commodity}
                onChange={(event) => setPlotForm((current) => ({ ...current, commodity: event.target.value }))}
              >
                <option value="">Select...</option>
                {products.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </label>
            <label className="ct-field">
              <span>Country of Production</span>
              <input
                value={plotForm.countryOfProduction}
                onChange={(event) =>
                  setPlotForm((current) => ({ ...current, countryOfProduction: event.target.value }))
                }
                type="text"
              />
            </label>
            <label className="ct-field">
              <span>Geometry Type</span>
              <select
                value={plotForm.geometryType}
                onChange={(event) => {
                  const nextType = event.target.value as 'point' | 'polygon';
                  setPlotForm((current) => ({
                    ...current,
                    geometryType: nextType,
                    coordinates: '',
                    geojsonText: '',
                  }));
                  setPlotDraftCoordinates([]);
                }}
              >
                <option value="point">point</option>
                <option value="polygon">polygon</option>
              </select>
            </label>
            <label className="ct-field">
              <span>Area (ha)</span>
              <input
                value={plotForm.areaHectares}
                onChange={(event) => setPlotForm((current) => ({ ...current, areaHectares: event.target.value }))}
                type="text"
              />
            </label>
            <div className="ct-actions">
              <button className="ct-secondary-button" type="button" onClick={onClearBuilder}>
                Clear draft
              </button>
              {plotDraftCoordinates.length > 0 ? (
                <button className="ct-secondary-button" type="button" onClick={onUndoCoordinate}>
                  {plotForm.geometryType === 'point' ? 'Remove point' : 'Undo point'}
                </button>
              ) : null}
            </div>
            <label className="ct-field">
              <span>Coordinates</span>
              <textarea
                value={plotForm.coordinates}
                onChange={(event) => setPlotForm((current) => ({ ...current, coordinates: event.target.value }))}
              />
            </label>
            <div className="ct-note">
              {plotForm.geometryType === 'point'
                ? 'Click anywhere on the map to place the point, then drag the marker to refine it exactly.'
                : 'Click to add polygon points. Drag any vertex to adjust it. The polygon closes automatically when you save.'}
            </div>
            <label className="ct-field">
              <span>GeoJSON Text (optional)</span>
              <textarea
                value={plotForm.geojsonText}
                onChange={(event) => {
                  setPlotForm((current) => ({ ...current, geojsonText: event.target.value }));
                  if (event.target.value.trim()) setPlotDraftCoordinates([]);
                }}
              />
            </label>
            <button className="ct-primary-button" type="submit">
              {plotForm.id ? 'Update plot' : 'Save plot'}
            </button>
          </form>
        </div>

        <aside className="ct-card ct-stack ct-plot-builder-panel">
          <div className="ct-section-head">
            <div>
              <div className="ct-card-overline">Map builder</div>
              <h2 className="ct-card-title">Draw the plot</h2>
              <p className="ct-card-copy">Click map, drag points, save.</p>
            </div>
          </div>
          <PlotBuilderMap
            geometryType={plotForm.geometryType}
            coordinates={plotDraftCoordinates}
            onAddCoordinate={onAddCoordinate}
            onMoveCoordinate={onMoveCoordinate}
          />
          <div className="ct-subgrid">
            <div className="ct-note">
              <strong>Draft points</strong>
              <div>{plotDraftCoordinates.length || 0}</div>
            </div>
            <div className="ct-note">
              <strong>Geometry</strong>
              <div>{plotForm.geometryType}</div>
            </div>
            <div className="ct-note">
              <strong>Next step</strong>
              <div>{plotForm.geometryType === 'point' ? 'Pick one location.' : 'Add 3+ points.'}</div>
            </div>
          </div>
          {plotDraftCoordinates.length > 0 ? (
            <div className="ct-stack">
              <div className="ct-section-head">
                <div>
                  <h2>Draft points</h2>
                  <p>Adjust or remove points.</p>
                </div>
              </div>
              <div className="ct-vertex-list">
                {plotDraftCoordinates.map(([lat, lng], index) => (
                  <div className="ct-vertex-item" key={`${lat}-${lng}-${index}`}>
                    <div>
                      <strong>{plotForm.geometryType === 'point' ? 'Point' : `Vertex ${index + 1}`}</strong>
                      <div>
                        {lat.toFixed(6)}, {lng.toFixed(6)}
                      </div>
                    </div>
                    <button className="ct-link-button" type="button" onClick={() => onRemoveCoordinate(index)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
      ) : null}

      <section className="ct-card ct-stack ct-plot-list-card">
        <div className="ct-section-head">
          <div>
            <span className="ct-badge">Registry</span>
            <h2>Plot registry</h2>
            <p>{plots.length ? 'Open or edit saved land records.' : 'Saved plots appear here.'}</p>
          </div>
          <div className="ct-plot-list-metrics">
            <div className="ct-kpi-chip">
              <span>Total</span>
              <strong>{plots.length}</strong>
            </div>
            <div className="ct-kpi-chip">
              <span>Compliant</span>
              <strong>{compliantCount}</strong>
            </div>
            <div className="ct-kpi-chip">
              <span>Pending</span>
              <strong>{pendingCount}</strong>
            </div>
          </div>
        </div>

        <div className="ct-toolbar-grid">
          <label className="ct-field">
            <span>Search plots</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="plot, supplier, commodity, country"
            />
          </label>
          <label className="ct-field">
            <span>Status view</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | 'COMPLIANT' | 'PENDING' | 'NON_COMPLIANT')
              }
            >
              <option value="all">All plots</option>
              <option value="COMPLIANT">Compliant</option>
              <option value="PENDING">Pending</option>
              <option value="NON_COMPLIANT">Non-compliant</option>
            </select>
          </label>
        </div>

        {filteredPlots.length ? (
          <div className="ct-table-scroll">
            <table className="ct-table ct-table-plots">
              <thead>
                <tr>
                  <th>Plot</th>
                  <th>Commodity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlots.map((plot) => {
                  const supplier = supplierById.get(plot.supplierId);
                  const status = plot.analysis?.status ?? 'PENDING';

                  return (
                    <tr key={plot.id}>
                      <td>
                        <div className="ct-plot-name-cell">
                          <strong className="ct-plot-name-main">{plot.name}</strong>
                          <span className="ct-plot-meta">
                            {supplier?.name ?? 'Supplier pending'} • {plot.countryOfProduction || 'Country pending'}
                          </span>
                        </div>
                      </td>
                      <td>{plot.commodity}</td>
                      <td>
                        <span className={`ct-status-pill ${getPlotStatusTone(status)}`}>{status}</span>
                      </td>
                      <td>
                        <div className="ct-plot-actions">
                          <button className="ct-link-button ct-action-pill" onClick={() => onSelectPlot(plot.id)}>
                            Open
                          </button>
                          <button className="ct-link-button ct-action-pill" onClick={() => onEditPlot(plot)}>
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <PremiumEmptyState
            badge="PLOTS"
            title={plots.length ? 'No plots match this view yet.' : 'Start your provenance registry with the first plot.'}
            description={
              plots.length
                ? 'Adjust search or status filters to bring the right plots back into view.'
                : 'Create a supplier-linked plot, save geometry, then run EUDR screening to unlock shipment-ready provenance.'
            }
            steps={
              plots.length
                ? ['Clear search', 'Switch back to all plots', 'Open a saved plot']
                : ['Pick a supplier', 'Draw or upload geometry', 'Run EUDR analysis']
            }
          />
        )}
      </section>

      {activePlot ? (
        <section className="ct-card ct-stack ct-active-plot-card">
          <div className="ct-section-head">
            <div>
              <h2>{activePlot.name}</h2>
              <p>{activePlot.commodity} · {activePlot.countryOfProduction}</p>
            </div>
            <div className="ct-actions">
              <button className="ct-secondary-button" onClick={() => onDownloadGeoJson(activePlot)}>
                GeoJSON
              </button>
              <button className="ct-primary-button" disabled={busy} onClick={onRunAnalysis}>
                {busy ? 'Running...' : 'Run EUDR'}
              </button>
            </div>
          </div>
          <div className="ct-grid four">
            <StatCard label="Geometry" value={activePlot.geometryType} />
            <StatCard label="Area" value={activePlot.areaHectares || 'N/A'} />
            <StatCard label="Status" value={activePlot.analysis?.status ?? 'PENDING'} />
            <StatCard label="Deforested m2" value={activePlot.analysis?.deforested_area_m2 ?? 0} />
          </div>
          <div className="ct-key-value-grid">
            <div className="ct-key-value">
              <span>Supplier</span>
              <strong>{activeSupplier?.name ?? 'Supplier pending'}</strong>
            </div>
            <div className="ct-key-value">
              <span>Dataset</span>
              <strong>{activePlot.analysis?.source_dataset ?? 'Earth Engine screening pending'}</strong>
            </div>
            <div className="ct-key-value">
              <span>Risk label</span>
              <strong>{activePlot.analysis?.risk_label ?? activePlot.analysis?.status ?? 'Pending'}</strong>
            </div>
            <div className="ct-key-value">
              <span>Last screening</span>
              <strong>{activePlot.analysis?.analysis_timestamp ?? 'Not screened yet'}</strong>
            </div>
          </div>
          <PlotPreviewMap plot={activePlot} />
          {activePlot.geojsonText ? <pre className="ct-code">{activePlot.geojsonText}</pre> : null}
        </section>
      ) : null}
    </div>
  );
};
