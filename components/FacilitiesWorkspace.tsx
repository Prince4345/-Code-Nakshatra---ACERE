import React, { useMemo, useState } from 'react';
import { EmissionFactorRecord, FacilityRecord, InstallationRecord } from '../types';
import { InsightMetricCard, PremiumEmptyState } from './Insights';

type Props = {
  facilities: FacilityRecord[];
  installations: InstallationRecord[];
  factors: EmissionFactorRecord[];
  onSaveFacility: (payload: Omit<FacilityRecord, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => Promise<void>;
  onSaveInstallation: (payload: Omit<InstallationRecord, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => Promise<void>;
  onSaveFactor: (payload: Omit<EmissionFactorRecord, 'id'>, id: string) => Promise<void>;
};

const FacilitiesWorkspace: React.FC<Props> = ({
  facilities,
  installations,
  factors,
  onSaveFacility,
  onSaveInstallation,
  onSaveFactor,
}) => {
  const [search, setSearch] = useState('');
  const [facilityForm, setFacilityForm] = useState({
    id: '',
    name: '',
    address: '',
    country: 'India',
    region: '',
    productLines: '',
  });
  const [installationForm, setInstallationForm] = useState({
    id: '',
    facilityId: '',
    name: '',
    processType: '',
    fuelTypes: '',
    electricitySource: 'India Grid',
    coveredProducts: '',
    annualCapacity: '',
  });
  const filteredFacilities = useMemo(() => {
    const query = search.trim().toLowerCase();
    return facilities.filter((facility) => !query || `${facility.name} ${facility.region} ${facility.country} ${facility.productLines.join(' ')}`.toLowerCase().includes(query));
  }, [facilities, search]);
  const filteredInstallations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return installations.filter((installation) => {
      const facility = facilities.find((item) => item.id === installation.facilityId);
      return !query || `${installation.name} ${installation.processType} ${installation.fuelTypes.join(' ')} ${facility?.name ?? ''}`.toLowerCase().includes(query);
    });
  }, [facilities, installations, search]);
  const installationCoverage = facilities.length ? Math.round((installations.length / facilities.length) * 100) : 0;
  const electricityFactors = factors.filter((factor) => factor.category === 'electricity').length;
  const fuelFactors = factors.filter((factor) => factor.category === 'fuel').length;

  return (
    <div className="ct-stack">
      <section className="ct-hero">
        <div>
          <div className="ct-badge">CBAM FOUNDATION</div>
          <h2>Facilities, installations, and factor coverage for the CBAM side of the workflow</h2>
        </div>
        <p>Define operating boundaries, process lines, and factor coverage before you allocate batch activity and generate CBAM-ready outputs.</p>
      </section>

      <div className="ct-insight-grid">
        <InsightMetricCard label="Facilities" value={facilities.length} helper="Operating sites in current exporter scope" />
        <InsightMetricCard label="Installations" value={installations.length} helper={`${installationCoverage}% installation coverage`} tone={installations.length ? 'good' : 'warn'} />
        <InsightMetricCard label="Electricity factors" value={electricityFactors} helper="Grid and power references loaded" />
        <InsightMetricCard label="Fuel factors" value={fuelFactors} helper="Combustion factor library coverage" />
      </div>

      <div className="ct-grid two">
        <form
          className="ct-card ct-stack"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSaveFacility(
              {
                name: facilityForm.name.trim(),
                address: facilityForm.address.trim(),
                country: facilityForm.country.trim(),
                region: facilityForm.region.trim(),
                productLines: facilityForm.productLines.split(',').map((item) => item.trim()).filter(Boolean),
              },
              facilityForm.id || undefined,
            );
            setFacilityForm({ id: '', name: '', address: '', country: 'India', region: '', productLines: '' });
          }}
        >
          <div className="ct-section-head">
            <div>
              <h2>{facilityForm.id ? 'Edit Facility' : 'Add Facility'}</h2>
              <p>Store plant locations and product boundaries.</p>
            </div>
          </div>
          <label className="ct-field"><span>Facility Name</span><input value={facilityForm.name} onChange={(e) => setFacilityForm((current) => ({ ...current, name: e.target.value }))} /></label>
          <label className="ct-field"><span>Address</span><textarea value={facilityForm.address} onChange={(e) => setFacilityForm((current) => ({ ...current, address: e.target.value }))} /></label>
          <div className="ct-form-grid two">
            <label className="ct-field"><span>Country</span><input value={facilityForm.country} onChange={(e) => setFacilityForm((current) => ({ ...current, country: e.target.value }))} /></label>
            <label className="ct-field"><span>Region</span><input value={facilityForm.region} onChange={(e) => setFacilityForm((current) => ({ ...current, region: e.target.value }))} /></label>
          </div>
          <label className="ct-field"><span>Product Lines</span><input value={facilityForm.productLines} onChange={(e) => setFacilityForm((current) => ({ ...current, productLines: e.target.value }))} placeholder="Steel billets, aluminum rods" /></label>
          <button className="ct-primary-button" type="submit">{facilityForm.id ? 'Update Facility' : 'Save Facility'}</button>
        </form>

        <form
          className="ct-card ct-stack"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSaveInstallation(
              {
                facilityId: installationForm.facilityId,
                name: installationForm.name.trim(),
                processType: installationForm.processType.trim(),
                fuelTypes: installationForm.fuelTypes.split(',').map((item) => item.trim()).filter(Boolean),
                electricitySource: installationForm.electricitySource.trim(),
                coveredProducts: installationForm.coveredProducts.split(',').map((item) => item.trim()).filter(Boolean),
                annualCapacity: installationForm.annualCapacity.trim(),
              },
              installationForm.id || undefined,
            );
            setInstallationForm({
              id: '',
              facilityId: '',
              name: '',
              processType: '',
              fuelTypes: '',
              electricitySource: 'India Grid',
              coveredProducts: '',
              annualCapacity: '',
            });
          }}
        >
          <div className="ct-section-head">
            <div>
              <h2>{installationForm.id ? 'Edit Installation' : 'Add Installation'}</h2>
              <p>Define process scope, energy sources, and covered products.</p>
            </div>
          </div>
          <label className="ct-field">
            <span>Facility</span>
            <select value={installationForm.facilityId} onChange={(e) => setInstallationForm((current) => ({ ...current, facilityId: e.target.value }))}>
              <option value="">Select...</option>
              {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
            </select>
          </label>
          <label className="ct-field"><span>Installation Name</span><input value={installationForm.name} onChange={(e) => setInstallationForm((current) => ({ ...current, name: e.target.value }))} /></label>
          <div className="ct-form-grid two">
            <label className="ct-field"><span>Process Type</span><input value={installationForm.processType} onChange={(e) => setInstallationForm((current) => ({ ...current, processType: e.target.value }))} placeholder="Electric Arc Furnace" /></label>
            <label className="ct-field"><span>Annual Capacity</span><input value={installationForm.annualCapacity} onChange={(e) => setInstallationForm((current) => ({ ...current, annualCapacity: e.target.value }))} placeholder="12000 t/year" /></label>
          </div>
          <label className="ct-field"><span>Fuel Types</span><input value={installationForm.fuelTypes} onChange={(e) => setInstallationForm((current) => ({ ...current, fuelTypes: e.target.value }))} placeholder="Diesel, Natural Gas" /></label>
          <label className="ct-field"><span>Electricity Source</span><input value={installationForm.electricitySource} onChange={(e) => setInstallationForm((current) => ({ ...current, electricitySource: e.target.value }))} /></label>
          <label className="ct-field"><span>Covered Products</span><input value={installationForm.coveredProducts} onChange={(e) => setInstallationForm((current) => ({ ...current, coveredProducts: e.target.value }))} /></label>
          <button className="ct-primary-button" type="submit">{installationForm.id ? 'Update Installation' : 'Save Installation'}</button>
        </form>
      </div>

      <section className="ct-card ct-stack">
        <div className="ct-section-head">
          <div>
            <h2>Facility network</h2>
            <p>Search the physical operating footprint before you assign production batches.</p>
          </div>
        </div>
        <div className="ct-toolbar-grid">
          <label className="ct-field">
            <span>Search facilities and installations</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="name, region, process, product" />
          </label>
        </div>

        <div className="ct-grid two">
          <section className="ct-card ct-stack">
          <div className="ct-section-head">
            <div>
              <h2>Facility Registry</h2>
              <p>{filteredFacilities.length} facility record(s) in this view.</p>
            </div>
          </div>
          {filteredFacilities.length ? (
            <div className="ct-library-list">
              {filteredFacilities.map((facility) => (
                <div key={facility.id} className="ct-entity-card">
                  <div className="ct-entity-card-head">
                    <div>
                      <h3>{facility.name}</h3>
                      <p>{facility.region}, {facility.country}</p>
                    </div>
                    <span className="ct-status-pill is-neutral">{facility.productLines.length} lines</span>
                  </div>
                  <div className="ct-meta-row">
                    <span>{facility.productLines.join(', ') || 'No product lines yet'}</span>
                    <span>{facility.address || 'Address pending'}</span>
                  </div>
                  <div className="ct-actions">
                    <button className="ct-secondary-button" onClick={() => setFacilityForm({ id: facility.id, name: facility.name, address: facility.address, country: facility.country, region: facility.region, productLines: facility.productLines.join(', ') })} type="button">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <PremiumEmptyState badge="FACILITIES" title="No facilities in this view." description="Add the first facility or clear the search to bring the site registry back into view." steps={['Add a facility', 'Describe product lines', 'Link installations next']} />
          )}
        </section>

        <section className="ct-card ct-stack">
          <div className="ct-section-head">
            <div>
              <h2>Installation Registry</h2>
              <p>Process scope, energy inputs, and covered products used by batch and report workflows.</p>
            </div>
          </div>
          {filteredInstallations.length ? (
            <div className="ct-library-list">
              {filteredInstallations.map((installation) => (
                <div key={installation.id} className="ct-entity-card">
                  <div className="ct-entity-card-head">
                    <div>
                      <h3>{installation.name}</h3>
                      <p>{facilities.find((facility) => facility.id === installation.facilityId)?.name ?? 'Unlinked facility'}</p>
                    </div>
                    <span className="ct-status-pill is-good">{installation.processType || 'Process pending'}</span>
                  </div>
                  <div className="ct-meta-row">
                    <span>{installation.fuelTypes.join(', ') || installation.electricitySource}</span>
                    <span>{installation.coveredProducts.join(', ') || 'Covered products pending'}</span>
                  </div>
                  <div className="ct-actions">
                    <button className="ct-secondary-button" onClick={() => setInstallationForm({ id: installation.id, facilityId: installation.facilityId, name: installation.name, processType: installation.processType, fuelTypes: installation.fuelTypes.join(', '), electricitySource: installation.electricitySource, coveredProducts: installation.coveredProducts.join(', '), annualCapacity: installation.annualCapacity })} type="button">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <PremiumEmptyState badge="INSTALLATIONS" title="No installations in this view." description="Installations define the process boundary for CBAM logic and batch allocation." steps={['Pick a facility', 'Add process type', 'Capture fuel and electricity scope']} />
          )}
        </section>
      </div>
    </section>

      <section className="ct-card">
        <div className="ct-section-head">
          <div>
            <h2>Emission Factor Library</h2>
            <p>These factors drive the current CBAM calculation engine.</p>
          </div>
        </div>
        <table className="ct-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Factor</th>
              <th>Unit</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {factors.map((factor) => (
              <tr key={factor.id}>
                <td>{factor.name}</td>
                <td>{factor.category}</td>
                <td>
                  <input value={factor.factorKgCO2e} onChange={(e) => onSaveFactor({ ...factor, factorKgCO2e: Number(e.target.value) || 0, updatedAt: new Date().toISOString() }, factor.id)} />
                </td>
                <td>{factor.unit}</td>
                <td>{factor.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default FacilitiesWorkspace;
