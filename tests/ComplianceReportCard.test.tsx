import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ComplianceReportCard from '../components/ComplianceReportCard';
import { ComplianceStatus, RiskLevel, ShipmentRecord } from '../types';

const shipment: ShipmentRecord = {
  id: 'shipment-1',
  ownerId: 'owner-1',
  invoiceId: 'INV-12345',
  product: 'Coffee beans',
  productCategory: 'coffee',
  hsCode: '0901',
  destinationCountry: 'Germany',
  quantity: '20',
  unit: 't',
  supplierIds: ['supplier-1'],
  plotIds: ['plot-1'],
  documentIds: ['doc-1'],
  facilityIds: [],
  installationIds: [],
  batchIds: [],
  energyNotes: '',
  additionalNotes: 'Verifier-ready package.',
  status: 'SUBMITTED',
  report: null,
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-01T10:00:00.000Z',
};

const report = {
  invoice_id: 'INV-12345',
  product_category: 'coffee',
  destination_eu_country: 'Germany',
  cbam: {
    status: ComplianceStatus.NOT_APPLICABLE,
    reported_emissions_tCO2: null,
    default_value_triggered: false,
    non_compliance_reasons: [],
  },
  eudr: {
    status: ComplianceStatus.COMPLIANT,
    geolocation_provided: true,
    deforestation_cutoff_verified: true,
    non_compliance_reasons: [],
    dds_ready: true,
    plot_count: 1,
  },
  overall_shipment_risk: RiskLevel.LOW,
};

describe('ComplianceReportCard', () => {
  it('renders a formal compliance summary and triggers downloads', () => {
    const onDownloadJson = vi.fn();
    const onDownloadXml = vi.fn();
    const onDownloadPackage = vi.fn();

    render(
      <ComplianceReportCard
        shipment={shipment}
        report={report}
        onDownloadJson={onDownloadJson}
        onDownloadXml={onDownloadXml}
        onDownloadPackage={onDownloadPackage}
      />,
    );

    expect(screen.getByText('CarbonTrace AI / Compliance package')).toBeInTheDocument();
    expect(screen.getByText('Compliance Package Summary')).toBeInTheDocument();
    expect(screen.getByText('Shipment ID')).toBeInTheDocument();
    expect(screen.getByText('EUDR Status')).toBeInTheDocument();
    expect(screen.getByText('Cutoff screen passed')).toBeInTheDocument();
    expect(screen.getByText(/ready for downstream review/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
    fireEvent.click(screen.getByRole('button', { name: 'XML' }));
    fireEvent.click(screen.getByRole('button', { name: 'Package' }));

    expect(onDownloadJson).toHaveBeenCalledTimes(1);
    expect(onDownloadXml).toHaveBeenCalledTimes(1);
    expect(onDownloadPackage).toHaveBeenCalledTimes(1);
  });
});
