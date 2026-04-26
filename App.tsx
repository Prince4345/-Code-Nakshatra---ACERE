import React, { Suspense, lazy, startTransition, useEffect, useMemo, useState } from 'react';
import { runGEEPipeline } from './services/gee_proxy';
import {
  attachReportToShipment,
  createShipmentSnapshotInFirebase,
  fetchAllUsers,
  fetchAllCompanyProfiles,
  fetchAllDocuments,
  fetchAllExtractionRecords,
  fetchAllFacilities,
  fetchAllInstallations,
  fetchAllPlots,
  fetchAllProductionBatches,
  fetchAllShipments,
  fetchShipmentSnapshots,
  fetchAllSuppliers,
  fetchAuditLogs,
  fetchCompanyProfile,
  fetchDocuments,
  fetchEmissionFactors,
  fetchExtractionRecords,
  fetchFacilities,
  fetchInstallations,
  fetchNotificationsForSession,
  fetchPlots,
  fetchProductionBatches,
  fetchShipments,
  fetchSuppliers,
  fetchVerificationCases,
  loginWithEmail,
  loginWithMobileSessionToken,
  markNotificationReadInFirebase,
  logoutUser,
  saveAuditLog,
  saveCompanyProfileToFirebase,
  saveDocumentRecordToFirebase,
  saveFacilityToFirebase,
  saveInstallationToFirebase,
  savePlotToFirebase,
  saveProductionBatchToFirebase,
  saveNotificationToFirebase,
  saveShipmentToFirebase,
  saveSupplierToFirebase,
  signupWithEmail,
  subscribeToSession,
  updateDocumentInFirebase,
  updateEmissionFactorInFirebase,
  updateFacilityInFirebase,
  updateInstallationInFirebase,
  updatePlotInFirebase,
  updatePlotAnalysisInFirebase,
  updateProductionBatchInFirebase,
  updateShipmentInFirebase,
  updateShipmentStatusInFirebase,
  updateSupplierInFirebase,
  uploadDocumentToFirebase,
  upsertExtractionRecord,
  upsertVerificationCase,
} from './services/firebaseData';
import {
  buildShipmentApprovalBundle,
  buildCbamRegistryCsv,
  buildComplianceReport,
  buildEudrDdsPayload,
  buildShipmentPackage as buildOperationalShipmentPackage,
  buildTracesXml,
  deriveExtractionFromDocument,
  filterAuditEntriesForShipment,
  inferDocumentTypeFromSource,
  requiresCbamCoverage,
  requiresEudrCoverage,
  serializeEudrDdsPayload,
} from './services/complianceToolkit';
import {
  sendWorkflowEmail,
  type WorkflowEmailAttachment,
  type EmailRecipient,
  type WorkflowEmailPayload,
  type WorkflowEmailSummaryItem,
} from './services/emailNotifications';
import { flushWebMonitoringQueue, reportWebError } from './services/monitoring';
import {
  findUserByRoutingId,
  getExporterReferenceId,
  getUserWorkspaceId,
  shipmentMatchesAssignee,
} from './services/identity';
import {
  BillingState,
  BillingUsageKind,
  consumeBillingAction,
  createInitialBillingState,
  readBillingState,
  saveBillingState,
} from './services/billingModel';
import { toFriendlyChecklist, toFriendlyMessage, WorkspaceNoticeTone } from './services/userMessages';
import {
  AuditLogEntry,
  CompanyProfile,
  ComplianceReport,
  CoordinatePoint,
  DocumentRecord,
  EmissionFactorRecord,
  ExtractionRecord,
  FacilityRecord,
  InstallationRecord,
  NotificationRecord,
  PlotRecord,
  ProductionBatchRecord,
  SessionUser,
  ShipmentRecord,
  ShipmentSnapshot,
  ShipmentWorkflowStatus,
  Supplier,
  UserRole,
  VerificationCase,
} from './types';
import { WebErrorBoundary } from './components/WebErrorBoundary';
import AuthScreen from './components/AuthScreen';
import { BillingPlanBadge } from './components/BillingPlanBadge';
import { LandingPage } from './components/LandingPage';
import { PricingPage } from './components/PricingPage';
import { WorkspaceLoadingState, WorkspaceNotice } from './components/WorkspaceChrome';
import { postMobileDownload, textToBase64 } from './services/mobileBridge';

const FacilitiesWorkspace = lazy(() => import('./components/FacilitiesWorkspace'));
const ProductionWorkspace = lazy(() => import('./components/ProductionWorkspace'));
const BillingWorkspace = lazy(() =>
  import('./components/BillingWorkspace').then((module) => ({ default: module.BillingWorkspace })),
);
const ProfileWorkspace = lazy(() =>
  import('./components/ProfileSupplierUploadWorkspaces').then((module) => ({ default: module.ProfileWorkspace })),
);
const SuppliersWorkspace = lazy(() =>
  import('./components/ProfileSupplierUploadWorkspaces').then((module) => ({ default: module.SuppliersWorkspace })),
);
const UploadsWorkspace = lazy(() =>
  import('./components/ProfileSupplierUploadWorkspaces').then((module) => ({ default: module.UploadsWorkspace })),
);
const PlotsWorkspace = lazy(() =>
  import('./components/PlotWorkspace').then((module) => ({ default: module.PlotsWorkspace })),
);
const ReportCenterWorkspace = lazy(() =>
  import('./components/RoleWorkspaces').then((module) => ({ default: module.ReportCenterWorkspace })),
);
const ImporterReadinessWorkspace = lazy(() =>
  import('./components/RoleWorkspaces').then((module) => ({ default: module.ImporterReadinessWorkspace })),
);
const ImporterPackagesWorkspace = lazy(() =>
  import('./components/RoleWorkspaces').then((module) => ({ default: module.ImporterPackagesWorkspace })),
);
const ImporterShipmentWorkspace = lazy(() =>
  import('./components/RoleWorkspaces').then((module) => ({ default: module.ImporterShipmentWorkspace })),
);
const ShipmentsWorkspace = lazy(() =>
  import('./components/ShipmentWorkspace').then((module) => ({ default: module.ShipmentsWorkspace })),
);
const AuditTrailWorkspace = lazy(() =>
  import('./components/SupportWorkspaces').then((module) => ({ default: module.AuditTrailWorkspace })),
);
const ExtractionWorkspace = lazy(() =>
  import('./components/SupportWorkspaces').then((module) => ({ default: module.ExtractionWorkspace })),
);
const HelpCenterWorkspace = lazy(() =>
  import('./components/SupportWorkspaces').then((module) => ({ default: module.HelpCenterWorkspace })),
);
const IntegrationOpsWorkspace = lazy(() =>
  import('./components/SupportWorkspaces').then((module) => ({ default: module.IntegrationOpsWorkspace })),
);
const NotificationRail = lazy(() =>
  import('./components/SupportWorkspaces').then((module) => ({ default: module.NotificationRail })),
);
const VerifierQueueWorkspace = lazy(() => import('./components/VerifierQueueWorkspace'));

type Route =
  | '/'
  | '/login'
  | '/signup'
  | '/pricing'
  | '/app/exporter/dashboard'
  | '/app/exporter/profile'
  | '/app/exporter/suppliers'
  | '/app/exporter/plots'
  | '/app/exporter/uploads'
  | '/app/exporter/facilities'
  | '/app/exporter/production'
  | '/app/exporter/extractions'
  | '/app/exporter/shipments'
  | '/app/exporter/reports'
  | '/app/exporter/audit'
  | '/app/exporter/integrations'
  | '/app/exporter/help'
  | '/app/exporter/billing'
  | '/app/verifier/dashboard'
  | '/app/verifier/queue'
  | '/app/verifier/billing'
  | '/app/importer/dashboard'
  | '/app/importer/readiness'
  | '/app/importer/shipments'
  | '/app/importer/billing';

type NavItem = { path: Route; label: string };
type ThemeMode = 'dark' | 'light';
type WorkspaceDataNeeds = {
  profile?: boolean;
  companyProfiles?: boolean;
  users?: boolean;
  suppliers?: boolean;
  plots?: boolean;
  documents?: boolean;
  shipments?: boolean;
  shipmentSnapshots?: boolean;
  reviews?: boolean;
  facilities?: boolean;
  installations?: boolean;
  batches?: boolean;
  extractions?: boolean;
  auditLogs?: boolean;
  factors?: boolean;
  notifications?: boolean;
};

const THEME_STORAGE_KEY = 'carbontrace-theme-mode-regulatory-v2';

const resolveInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
  return 'light';
};

const NAV: Record<UserRole, NavItem[]> = {
  exporter: [
    { path: '/app/exporter/dashboard', label: 'Home' },
    { path: '/app/exporter/profile', label: 'Profile' },
    { path: '/app/exporter/suppliers', label: 'Suppliers' },
    { path: '/app/exporter/plots', label: 'Plots' },
    { path: '/app/exporter/uploads', label: 'Evidence' },
    { path: '/app/exporter/facilities', label: 'Facilities' },
    { path: '/app/exporter/production', label: 'Production' },
    { path: '/app/exporter/extractions', label: 'Review' },
    { path: '/app/exporter/shipments', label: 'Shipments' },
    { path: '/app/exporter/reports', label: 'Reports' },
    { path: '/app/exporter/audit', label: 'Audit Trail' },
    { path: '/app/exporter/integrations', label: 'Ops' },
    { path: '/app/exporter/help', label: 'Help & Templates' },
    { path: '/app/exporter/billing', label: 'Billing' },
  ],
  verifier: [{ path: '/app/verifier/dashboard', label: 'Home' }, { path: '/app/verifier/queue', label: 'Queue' }, { path: '/app/verifier/billing', label: 'Billing' }],
  importer: [
    { path: '/app/importer/dashboard', label: 'Home' },
    { path: '/app/importer/readiness', label: 'Readiness' },
    { path: '/app/importer/shipments', label: 'Packages' },
    { path: '/app/importer/billing', label: 'Billing' },
  ],
};

const DEFAULT_ROUTE_BY_ROLE: Record<UserRole, Route> = {
  exporter: '/app/exporter/dashboard',
  verifier: '/app/verifier/dashboard',
  importer: '/app/importer/dashboard',
};

const isKnownRoute = (path: string): path is Route =>
  path === '/' ||
  path === '/login' ||
  path === '/signup' ||
  path === '/pricing' ||
  Object.values(NAV).some((items) => items.some((item) => item.path === path));

const EXPORTER_PRIMARY_ROUTES: Route[] = [
  '/app/exporter/dashboard',
  '/app/exporter/profile',
  '/app/exporter/suppliers',
  '/app/exporter/plots',
  '/app/exporter/shipments',
  '/app/exporter/reports',
  '/app/exporter/billing',
];

const loadPdfExports = () => import('./services/pdfExports');
const loadDocumentIntelligence = () => import('./services/documentIntelligence');

const mergeNeeds = (...needs: WorkspaceDataNeeds[]): WorkspaceDataNeeds =>
  needs.reduce<WorkspaceDataNeeds>((accumulator, current) => ({ ...accumulator, ...current }), {});

const filterShipmentsForSession = (shipments: ShipmentRecord[], session: SessionUser) =>
  session.role === 'exporter'
    ? shipments
    : session.role === 'verifier'
      ? shipments.filter((shipment) => shipment.status !== 'DRAFT' && shipmentMatchesAssignee(shipment.verifierId, session))
      : shipments.filter((shipment) => shipment.status === 'APPROVED' && shipmentMatchesAssignee(shipment.importerId, session));

const getWorkspaceDataNeeds = (route: Route, role: UserRole): WorkspaceDataNeeds => {
  const base: WorkspaceDataNeeds = { notifications: true };

  if (role === 'exporter') {
    const exporterShared: WorkspaceDataNeeds = { profile: true };
    switch (route) {
      case '/app/exporter/dashboard':
        return mergeNeeds(base, exporterShared, {
          suppliers: true,
          plots: true,
          documents: true,
          shipments: true,
          extractions: true,
        });
      case '/app/exporter/profile':
        return mergeNeeds(base, exporterShared);
      case '/app/exporter/suppliers':
        return mergeNeeds(base, exporterShared, { suppliers: true });
      case '/app/exporter/plots':
        return mergeNeeds(base, exporterShared, { suppliers: true, plots: true });
      case '/app/exporter/uploads':
        return mergeNeeds(base, exporterShared, { documents: true, shipments: true, facilities: true, batches: true, extractions: true });
      case '/app/exporter/facilities':
        return mergeNeeds(base, exporterShared, { facilities: true, installations: true, factors: true });
      case '/app/exporter/production':
        return mergeNeeds(base, exporterShared, { facilities: true, installations: true, shipments: true, documents: true, batches: true });
      case '/app/exporter/extractions':
        return mergeNeeds(base, exporterShared, { documents: true, extractions: true });
      case '/app/exporter/shipments':
        return mergeNeeds(base, exporterShared, {
          users: true,
          suppliers: true,
          plots: true,
          documents: true,
          shipments: true,
          facilities: true,
          installations: true,
          batches: true,
          extractions: true,
          factors: true,
        });
      case '/app/exporter/reports':
        return mergeNeeds(base, exporterShared, {
          suppliers: true,
          plots: true,
          documents: true,
          shipments: true,
          shipmentSnapshots: true,
          facilities: true,
          installations: true,
          batches: true,
          extractions: true,
        });
      case '/app/exporter/audit':
        return mergeNeeds(base, exporterShared, { documents: true, shipments: true, extractions: true, auditLogs: true });
      case '/app/exporter/integrations':
        return mergeNeeds(base, exporterShared, { documents: true, shipments: true, extractions: true });
      case '/app/exporter/help':
      case '/app/exporter/billing':
        return mergeNeeds(base, exporterShared);
      default:
        return mergeNeeds(base, exporterShared);
    }
  }

  if (role === 'verifier') {
    switch (route) {
      case '/app/verifier/dashboard':
        return mergeNeeds(base, { shipments: true });
      case '/app/verifier/queue':
        return mergeNeeds(base, {
          companyProfiles: true,
          users: true,
          suppliers: true,
          plots: true,
          documents: true,
          shipments: true,
          reviews: true,
          facilities: true,
          installations: true,
          batches: true,
          extractions: true,
          auditLogs: true,
          factors: true,
        });
      case '/app/verifier/billing':
        return base;
      default:
        return mergeNeeds(base, { shipments: true });
    }
  }

  switch (route) {
    case '/app/importer/dashboard':
      return mergeNeeds(base, { shipments: true });
    case '/app/importer/readiness':
      return mergeNeeds(base, { companyProfiles: true, documents: true, shipments: true, batches: true, extractions: true, shipmentSnapshots: true });
    case '/app/importer/shipments':
      return mergeNeeds(base, {
        companyProfiles: true,
        plots: true,
        documents: true,
        shipments: true,
        shipmentSnapshots: true,
        facilities: true,
        installations: true,
        batches: true,
        extractions: true,
        auditLogs: true,
      });
    case '/app/importer/billing':
      return base;
    default:
      return mergeNeeds(base, { shipments: true });
  }
};

const PRODUCTS = ['Coffee', 'Rubber', 'Timber', 'Steel', 'Aluminum', 'Cement', 'Fertilizer'];
const DOC_TYPES = ['Fuel Invoice', 'Electricity Bill', 'Shipment Document', 'Supplier Declaration', 'Land Record', 'Purchase Order', 'Production Log'];
const EU = ['Germany', 'France', 'Italy', 'Netherlands', 'Belgium', 'Spain'];
const DEMO_INVOICE_IDS = ['CT-EUDR-2026-041', 'CT-CBAM-2026-117'];
const LEGACY_DEMO_PREVIEW_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
const DEMO_PREVIEW_URLS = {
  land: '/demo-documents/land-record-hassan-cluster.html',
  declaration: '/demo-documents/supplier-declaration-coffee-apr2026.html',
  coffeeShipment: '/demo-documents/commercial-invoice-ct-eudr-2026-041.html',
  electricity: '/demo-documents/electricity-bill-pune-plant-mar2026.html',
  diesel: '/demo-documents/diesel-invoice-eaf-support-mar2026.html',
  production: '/demo-documents/production-log-batch-sb-2026-117.html',
  po: '/demo-documents/purchase-order-netherlands-buyer.html',
} as const;
const DEMO_PREVIEW_BY_FILENAME: Record<string, string> = {
  'land-record-hassan-cluster.pdf': DEMO_PREVIEW_URLS.land,
  'supplier-declaration-coffee-apr2026.pdf': DEMO_PREVIEW_URLS.declaration,
  'commercial-invoice-ct-eudr-2026-041.pdf': DEMO_PREVIEW_URLS.coffeeShipment,
  'electricity-bill-pune-plant-mar2026.pdf': DEMO_PREVIEW_URLS.electricity,
  'diesel-invoice-eaf-support-mar2026.pdf': DEMO_PREVIEW_URLS.diesel,
  'production-log-batch-sb-2026-117.pdf': DEMO_PREVIEW_URLS.production,
  'purchase-order-netherlands-buyer.pdf': DEMO_PREVIEW_URLS.po,
};
const MOBILE_SESSION_QUERY_KEY = 'mobileSessionToken';

const useRoute = (): [Route, (path: Route) => void] => {
  const current = () => {
    const path = window.location.pathname;
    return isKnownRoute(path) ? path : '/';
  };
  const [route, setRoute] = useState<Route>(current());
  useEffect(() => { const onPop = () => setRoute(current()); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);
  return [
    route,
    (path) => {
      window.history.pushState({}, '', path);
      startTransition(() => setRoute(path));
    },
  ];
};

const dashboardCard = (
  label: string,
  value: string | number,
  detail: string,
  actionLabel?: string,
  onAction?: () => void,
  tone: 'good' | 'warn' | 'bad' | 'neutral' = 'neutral',
) => (
  <article className={`ct-dashboard-card is-${tone}`}>
    <div>
      <div className="ct-card-overline">{label}</div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
    {actionLabel && onAction ? (
      <button className="ct-link-button" type="button" onClick={onAction}>
        {actionLabel}
      </button>
    ) : null}
  </article>
);

const DemoWalkthrough = ({
  role,
  onClose,
  onNavigate,
  onLoadDemo,
  demoBusy,
  hasDemo,
}: {
  role: UserRole;
  onClose: () => void;
  onNavigate: (path: Route) => void;
  onLoadDemo: () => void;
  demoBusy: boolean;
  hasDemo: boolean;
}) => {
  const steps: Array<{ label: string; route: Route; note: string }> = [
    { label: 'Profile', route: '/app/exporter/profile', note: 'Company identity and export markets.' },
    { label: 'Supplier', route: '/app/exporter/suppliers', note: 'Source entity used in provenance.' },
    { label: 'Plot + EUDR', route: '/app/exporter/plots', note: 'Map land and run screening.' },
    { label: 'Upload', route: '/app/exporter/uploads', note: 'Attach shipment and evidence files.' },
    { label: 'Shipment', route: '/app/exporter/shipments', note: 'Link evidence and submit package.' },
    { label: 'Verifier', route: '/app/verifier/queue', note: 'Approve, reject, or clarify.' },
    { label: 'Importer', route: '/app/importer/shipments', note: 'Open approved package and download.' },
  ];

  return (
    <div className="ct-demo-overlay" role="dialog" aria-modal="true" aria-label="Demo walkthrough">
      <section className="ct-demo-panel">
        <div className="ct-section-head">
          <div>
            <div className="ct-card-overline">Demo mode</div>
            <h2>Judge walkthrough</h2>
            <p>One clean story from exporter setup to importer handoff.</p>
          </div>
          <button className="ct-link-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="ct-demo-steps">
          {steps.map((step, index) => (
            <button
              key={step.label}
              className="ct-demo-step"
              type="button"
              onClick={() => {
                onNavigate(step.route);
                onClose();
              }}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{step.label}</strong>
              <small>{step.note}</small>
            </button>
          ))}
        </div>
        <div className="ct-demo-footer">
          <button className="ct-primary-button" type="button" onClick={onLoadDemo} disabled={demoBusy || hasDemo}>
            {hasDemo ? 'Demo data loaded' : demoBusy ? 'Loading demo...' : 'Load demo data'}
          </button>
          <span>Current role: {role}</span>
        </div>
      </section>
    </div>
  );
};

const downloadFile = (name: string, content: string, type: string) => {
  if (
    postMobileDownload({
      fileName: name,
      contentType: type,
      contentBase64: textToBase64(content),
    })
  ) {
    return;
  }
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const notificationDateValue = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return '';
};

const resolveDocumentPreviewUrl = (document: Pick<DocumentRecord, 'fileName' | 'previewUrl'>) => {
  const seededPreview = DEMO_PREVIEW_BY_FILENAME[document.fileName];
  if (!seededPreview) return document.previewUrl;
  if (!document.previewUrl || document.previewUrl === LEGACY_DEMO_PREVIEW_URL) return seededPreview;
  return document.previewUrl;
};

const closeRing = (coordinates: number[][]) => {
  if (!coordinates.length) return coordinates;
  const [firstLat, firstLng] = coordinates[0];
  const [lastLat, lastLng] = coordinates[coordinates.length - 1];
  return firstLat === lastLat && firstLng === lastLng ? coordinates : [...coordinates, coordinates[0]];
};

const normalizeStoredCoordinates = (
  coordinates: Array<CoordinatePoint | [number, number] | number[]> = [],
): CoordinatePoint[] =>
  coordinates
    .map((coordinate: CoordinatePoint | [number, number] | number[]) =>
      Array.isArray(coordinate)
        ? { lat: Number(coordinate[0]), lng: Number(coordinate[1]) }
        : { lat: Number(coordinate.lat), lng: Number(coordinate.lng) },
    )
    .filter((coordinate) => Number.isFinite(coordinate.lat) && Number.isFinite(coordinate.lng));

const toCoordinatePairs = (
  coordinates: Array<CoordinatePoint | [number, number] | number[]> = [],
): [number, number][] => normalizeStoredCoordinates(coordinates).map((coordinate) => [coordinate.lat, coordinate.lng]);

const toStoredCoordinates = (coordinates: number[][]): CoordinatePoint[] =>
  coordinates
    .map(([lat, lng]) => ({ lat: Number(lat), lng: Number(lng) }))
    .filter((coordinate) => Number.isFinite(coordinate.lat) && Number.isFinite(coordinate.lng));

const parseCoordinateText = (raw: string, geometryType: 'point' | 'polygon') => {
  if (!raw.trim()) return [];
  if (geometryType === 'point') {
    const [lat, lng] = raw.split(',').map((value) => Number(value.trim()));
    return Number.isFinite(lat) && Number.isFinite(lng) ? [[lat, lng]] : [];
  }
  return raw
    .split('\n')
    .map((row) => row.split(',').map((value) => Number(value.trim())))
    .filter((pair) => pair.length >= 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]))
    .map(([lat, lng]) => [lat, lng]);
};

const parseGeoJsonText = (geojsonText: string): { geometryType: PlotRecord['geometryType']; coordinates: number[][]; normalizedText: string } | null => {
  if (!geojsonText.trim()) return null;
  const parsed = JSON.parse(geojsonText);
  const geometry = parsed.type === 'Feature' ? parsed.geometry : parsed;
  if (!geometry?.type) {
    throw new Error('GeoJSON must include a valid geometry.');
  }
  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates ?? [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('GeoJSON point must include valid longitude and latitude values.');
    }
    return {
      geometryType: 'point',
      coordinates: [[lat, lng]],
      normalizedText: JSON.stringify({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [lng, lat] },
      }, null, 2),
    };
  }
  if (geometry.type === 'Polygon') {
    const ring = geometry.coordinates?.[0] ?? [];
    const coordinates = ring
      .map(([lng, lat]: number[]) => [lat, lng])
      .filter(([lat, lng]: number[]) => Number.isFinite(lat) && Number.isFinite(lng));
    if (coordinates.length < 3) {
      throw new Error('GeoJSON polygon must contain at least three valid points.');
    }
    const closedCoordinates = closeRing(coordinates);
    return {
      geometryType: 'polygon',
      coordinates: closedCoordinates,
      normalizedText: JSON.stringify({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [closedCoordinates.map(([lat, lng]) => [lng, lat])],
        },
      }, null, 2),
    };
  }
  throw new Error('Only GeoJSON Point and Polygon geometries are supported right now.');
};

const buildPlotGeoJson = (plot: PlotRecord) => {
  const plotCoordinates = toCoordinatePairs(plot.coordinates);
  if (plot.geometryType === 'point') {
    const [lat, lng] = plotCoordinates[0] ?? [];
    return {
      type: 'Feature',
      properties: {
        id: plot.id,
        name: plot.name,
        commodity: plot.commodity,
        countryOfProduction: plot.countryOfProduction,
        areaHectares: plot.areaHectares,
      },
      geometry: {
        type: 'Point',
        coordinates: [lng, lat],
      },
    };
  }

  const polygonCoordinates = closeRing(plotCoordinates);
  return {
    type: 'Feature',
    properties: {
      id: plot.id,
      name: plot.name,
      commodity: plot.commodity,
      countryOfProduction: plot.countryOfProduction,
      areaHectares: plot.areaHectares,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [polygonCoordinates.map(([lat, lng]) => [lng, lat])],
    },
  };
};

const formatCoordinates = (coordinates: number[][], geometryType: 'point' | 'polygon') => {
  if (!coordinates.length) return '';
  if (geometryType === 'point') {
    const [lat, lng] = coordinates[0];
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
  return coordinates
    .map(([lat, lng]) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`)
    .join('\n');
};

const getLinkedSuppliers = (shipment: ShipmentRecord, suppliers: Supplier[]) =>
  suppliers.filter((supplier) => shipment.supplierIds.includes(supplier.id));

const getLinkedPlots = (shipment: ShipmentRecord, plots: PlotRecord[]) =>
  plots.filter((plot) => shipment.plotIds.includes(plot.id));

const getLinkedDocuments = (shipment: ShipmentRecord, documents: DocumentRecord[]) =>
  documents.filter((document) => shipment.documentIds.includes(document.id));

const withComplianceReportDefaults = (report?: ComplianceReport | null): ComplianceReport | null => {
  if (!report || typeof report !== 'object') return null;
  const safeReport = report as ComplianceReport & {
    cbam?: Partial<ComplianceReport['cbam']>;
    eudr?: Partial<ComplianceReport['eudr']>;
  };

  return {
    invoice_id: safeReport.invoice_id ?? '',
    product_category: safeReport.product_category ?? '',
    destination_eu_country: safeReport.destination_eu_country ?? '',
    overall_shipment_risk: safeReport.overall_shipment_risk ?? 'LOW',
    cbam: {
      status: safeReport.cbam?.status ?? 'NOT_APPLICABLE',
      reported_emissions_tCO2: safeReport.cbam?.reported_emissions_tCO2 ?? 0,
      default_value_triggered: safeReport.cbam?.default_value_triggered ?? false,
      non_compliance_reasons: Array.isArray(safeReport.cbam?.non_compliance_reasons)
        ? safeReport.cbam?.non_compliance_reasons
        : [],
      scope1_tCO2: safeReport.cbam?.scope1_tCO2 ?? 0,
      scope2_tCO2: safeReport.cbam?.scope2_tCO2 ?? 0,
      installation_count: safeReport.cbam?.installation_count ?? 0,
      evidence_document_count: safeReport.cbam?.evidence_document_count ?? 0,
    },
    eudr: {
      status: safeReport.eudr?.status ?? 'NOT_APPLICABLE',
      geolocation_provided: safeReport.eudr?.geolocation_provided ?? false,
      deforestation_cutoff_verified: safeReport.eudr?.deforestation_cutoff_verified ?? false,
      non_compliance_reasons: Array.isArray(safeReport.eudr?.non_compliance_reasons)
        ? safeReport.eudr?.non_compliance_reasons
        : [],
      dds_ready: safeReport.eudr?.dds_ready ?? false,
      plot_count: safeReport.eudr?.plot_count ?? 0,
    },
  };
};

const withShipmentDefaults = (shipment: ShipmentRecord): ShipmentRecord => ({
  ...shipment,
  exporterReferenceId: shipment.exporterReferenceId ?? '',
  verifierId: shipment.verifierId ?? '',
  verifierName: shipment.verifierName ?? '',
  importerId: shipment.importerId ?? '',
  importerName: shipment.importerName ?? '',
  invoiceId: shipment.invoiceId ?? '',
  product: shipment.product ?? '',
  productCategory: shipment.productCategory ?? '',
  hsCode: shipment.hsCode ?? '',
  destinationCountry: shipment.destinationCountry ?? '',
  quantity: shipment.quantity ?? '',
  unit: shipment.unit ?? '',
  supplierIds: Array.isArray(shipment.supplierIds) ? shipment.supplierIds : [],
  plotIds: Array.isArray(shipment.plotIds) ? shipment.plotIds : [],
  documentIds: Array.isArray(shipment.documentIds) ? shipment.documentIds : [],
  facilityIds: Array.isArray(shipment.facilityIds) ? shipment.facilityIds : [],
  installationIds: Array.isArray(shipment.installationIds) ? shipment.installationIds : [],
  batchIds: Array.isArray(shipment.batchIds) ? shipment.batchIds : [],
  energyNotes: shipment.energyNotes ?? '',
  additionalNotes: shipment.additionalNotes ?? '',
  status: shipment.status ?? 'DRAFT',
  report: withComplianceReportDefaults(shipment.report ?? null),
});

const getShipmentReadiness = (
  shipment: ShipmentRecord,
  plots: PlotRecord[],
  documents: DocumentRecord[],
  installations: InstallationRecord[],
  batches: ProductionBatchRecord[],
  extractions: ExtractionRecord[],
) => {
  const issues: string[] = [];
  const linkedPlots = getLinkedPlots(shipment, plots);
  const linkedDocuments = getLinkedDocuments(shipment, documents);
  const linkedBatches = batches.filter((batch) => (shipment.batchIds ?? []).includes(batch.id) || batch.shipmentId === shipment.id);
  const linkedInstallations = installations.filter(
    (installation) =>
      (shipment.installationIds ?? []).includes(installation.id) ||
      linkedBatches.some((batch) => batch.installationId === installation.id),
  );
  const reviewedExtractions = linkedDocuments.filter((document) => extractions.some((extraction) => extraction.documentId === document.id && extraction.status === 'REVIEWED'));

  if (!shipment.invoiceId.trim()) issues.push('Add the shipment invoice ID.');
  if (!shipment.product.trim()) issues.push('Add the shipment product name.');
  if (!shipment.productCategory.trim()) issues.push('Select the shipment product category.');
  if (!shipment.hsCode.trim()) issues.push('Add the HS code for export classification.');
  if (!shipment.destinationCountry.trim()) issues.push('Select the EU destination country.');
  if (!shipment.quantity.trim()) issues.push('Add the shipment quantity.');
  if (!shipment.supplierIds.length) issues.push('At least one supplier must be linked.');
  if (!linkedDocuments.length) issues.push('At least one supporting document must be attached.');
  if (!reviewedExtractions.length) issues.push('Review at least one linked document extraction.');
  if (requiresEudrCoverage(shipment) && !shipment.plotIds.length) issues.push('At least one plot must be linked for EUDR traceability.');
  if (requiresEudrCoverage(shipment) && !linkedPlots.some((plot) => plot.analysis?.status === 'COMPLIANT')) issues.push('Run a compliant EUDR analysis on at least one linked plot.');
  if (requiresCbamCoverage(shipment) && !linkedInstallations.length) issues.push('Link at least one installation for CBAM reporting.');
  if (requiresCbamCoverage(shipment) && !linkedBatches.length) issues.push('Link at least one production batch for CBAM reporting.');
  if (!shipment.report) issues.push('Save the shipment once to generate the compliance report.');

  return {
    isReady: issues.length === 0,
    issues,
  };
};

const buildReport = async (
  shipment: ShipmentRecord,
  plots: PlotRecord[],
  batches: ProductionBatchRecord[],
  installations: InstallationRecord[],
  factors: EmissionFactorRecord[],
  documents: DocumentRecord[],
): Promise<ComplianceReport> => buildComplianceReport(shipment, plots, batches, installations, factors, documents);

const App: React.FC = () => {
  const [route, navigate] = useRoute();
  const [themeMode, setThemeMode] = useState<ThemeMode>(resolveInitialTheme);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [mobileSessionBooting, setMobileSessionBooting] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has(MOBILE_SESSION_QUERY_KEY),
  );
  const [userDirectory, setUserDirectory] = useState<SessionUser[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [plots, setPlots] = useState<PlotRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [shipmentSnapshots, setShipmentSnapshots] = useState<ShipmentSnapshot[]>([]);
  const [reviews, setReviews] = useState<VerificationCase[]>([]);
  const [notificationFeed, setNotificationFeed] = useState<NotificationRecord[]>([]);
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [installations, setInstallations] = useState<InstallationRecord[]>([]);
  const [batches, setBatches] = useState<ProductionBatchRecord[]>([]);
  const [extractions, setExtractions] = useState<ExtractionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [factors, setFactors] = useState<EmissionFactorRecord[]>([]);
  const [activePlotId, setActivePlotId] = useState('');
  const [activeShipmentId, setActiveShipmentId] = useState('');
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [authRole, setAuthRole] = useState<UserRole>('exporter');
  const [authError, setAuthError] = useState('');
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [showDemoWalkthrough, setShowDemoWalkthrough] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceNotice, setWorkspaceNotice] = useState<{
    tone: WorkspaceNoticeTone;
    title: string;
    message: string;
  } | null>(null);
  const [billingState, setBillingState] = useState<BillingState>(() => createInitialBillingState('exporter'));
  const [profileForm, setProfileForm] = useState({
    legalEntityName: '',
    tradeName: '',
    gst: '',
    udyam: '',
    eori: '',
    registeredAddress: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    exportCommodities: '',
    destinationCountries: '',
  });
  const [supplierForm, setSupplierForm] = useState({
    id: '',
    name: '',
    type: '',
    commodity: '',
    country: '',
    region: '',
  });
  const [plotForm, setPlotForm] = useState({
    id: '',
    name: '',
    supplierId: '',
    commodity: '',
    countryOfProduction: '',
    geometryType: 'point' as 'point' | 'polygon',
    areaHectares: '',
    coordinates: '',
    geojsonText: '',
  });
  const [plotDraftCoordinates, setPlotDraftCoordinates] = useState<number[][]>([]);
  const [shipmentForm, setShipmentForm] = useState({
    id: '',
    invoiceId: '',
    product: '',
    productCategory: '',
    hsCode: '',
    destinationCountry: '',
    quantity: '',
    unit: 'kg',
    supplierIds: [] as string[],
    plotIds: [] as string[],
    documentIds: [] as string[],
    facilityIds: [] as string[],
    installationIds: [] as string[],
    batchIds: [] as string[],
    verifierId: '',
    verifierName: '',
    importerId: '',
    importerName: '',
    energyNotes: '',
    additionalNotes: '',
  });

  useEffect(() => {
    document.body.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const toggleThemeMode = () => setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'));
  const showWorkspaceNotice = (title: string, message: string, tone: WorkspaceNoticeTone = 'error') =>
    setWorkspaceNotice({ title, message, tone });
  const showChecklistNotice = (title: string, items: string[], tone: WorkspaceNoticeTone = 'warn') =>
    showWorkspaceNotice(title, toFriendlyChecklist('Fix these items first:', items), tone);

  useEffect(() => subscribeToSession(setSession), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (session) {
      if (mobileSessionBooting) {
        const params = new URLSearchParams(window.location.search);
        if (params.has(MOBILE_SESSION_QUERY_KEY) || params.has('mobileApp')) {
          params.delete(MOBILE_SESSION_QUERY_KEY);
          params.delete('mobileApp');
          const nextSearch = params.toString();
          window.history.replaceState(
            {},
            '',
            `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`,
          );
        }
        setMobileSessionBooting(false);
      }
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const mobileSessionToken = params.get(MOBILE_SESSION_QUERY_KEY);
    if (!mobileSessionToken) return;

    let cancelled = false;
    setMobileSessionBooting(true);
    setAuthError(null);

    const complete = async () => {
      try {
        await loginWithMobileSessionToken(mobileSessionToken);
      } catch (error) {
        if (cancelled) return;
        setAuthError(
          toFriendlyMessage(
            error,
            'The secure mobile sign-in link expired. Open the workspace from the app again.',
          ),
        );
        void reportWebError({
          source: 'mobile-session-token',
          error: error instanceof Error ? error : new Error(String(error)),
          context: { route: window.location.pathname },
        });
      } finally {
        params.delete(MOBILE_SESSION_QUERY_KEY);
        params.delete('mobileApp');
        const nextSearch = params.toString();
        window.history.replaceState(
          {},
          '',
          `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`,
        );
        if (!cancelled) setMobileSessionBooting(false);
      }
    };

    void complete();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!workspaceNotice) return;
    const timeout = window.setTimeout(() => setWorkspaceNotice((current) => (current === workspaceNotice ? null : current)), 5200);
    return () => window.clearTimeout(timeout);
  }, [workspaceNotice]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [route]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1100) {
        setMobileNavOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen || window.innerWidth > 1100) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!session) return;
    setBillingState(readBillingState(session.id, session.role));
  }, [session]);

  useEffect(() => {
    void flushWebMonitoringQueue();

    const handleWindowError = (event: ErrorEvent) => {
      void reportWebError({
        source: 'window-error',
        error: event.error ?? new Error(event.message),
        context: {
          route: window.location.pathname,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      void reportWebError({
        source: 'window-unhandled-rejection',
        error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        context: { route: window.location.pathname },
      });
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const fetchWorkspaceData = async (requestedNeeds: WorkspaceDataNeeds) => {
    if (!session) return null;
    const isExporter = session.role === 'exporter';
    const isVerifier = session.role === 'verifier';
    const needs = mergeNeeds(requestedNeeds);

    const [
      loadedProfile,
      loadedProfiles,
      loadedReviews,
      loadedFactors,
      loadedNotifications,
      loadedUsers,
      loadedSuppliers,
      loadedPlots,
      loadedDocuments,
      loadedShipments,
      loadedSnapshots,
      loadedFacilities,
      loadedInstallations,
      loadedBatches,
      loadedExtractions,
      loadedAuditLogs,
    ] = await Promise.all([
      needs.profile ? fetchCompanyProfile(session.id) : Promise.resolve(undefined),
      needs.companyProfiles ? fetchAllCompanyProfiles() : Promise.resolve(undefined),
      needs.reviews && isVerifier ? fetchVerificationCases() : Promise.resolve(undefined),
      needs.factors && session.role !== 'importer' ? fetchEmissionFactors() : Promise.resolve(undefined),
      needs.notifications ? fetchNotificationsForSession(session.id, session.role) : Promise.resolve(undefined),
      needs.users ? fetchAllUsers() : Promise.resolve(undefined),
      needs.suppliers ? (isExporter ? fetchSuppliers(session.id) : fetchAllSuppliers()) : Promise.resolve(undefined),
      needs.plots ? (isExporter ? fetchPlots(session.id) : fetchAllPlots()) : Promise.resolve(undefined),
      needs.documents ? (isExporter ? fetchDocuments(session.id) : fetchAllDocuments()) : Promise.resolve(undefined),
      needs.shipments ? (isExporter ? fetchShipments(session.id) : fetchAllShipments()) : Promise.resolve(undefined),
      needs.shipmentSnapshots ? (isExporter ? fetchShipmentSnapshots(session.id) : fetchShipmentSnapshots()) : Promise.resolve(undefined),
      needs.facilities ? (isExporter ? fetchFacilities(session.id) : fetchAllFacilities()) : Promise.resolve(undefined),
      needs.installations ? (isExporter ? fetchInstallations(session.id) : fetchAllInstallations()) : Promise.resolve(undefined),
      needs.batches ? (isExporter ? fetchProductionBatches(session.id) : fetchAllProductionBatches()) : Promise.resolve(undefined),
      needs.extractions ? (isExporter ? fetchExtractionRecords(session.id) : fetchAllExtractionRecords()) : Promise.resolve(undefined),
      needs.auditLogs ? (isExporter ? fetchAuditLogs(session.id) : fetchAuditLogs()) : Promise.resolve(undefined),
    ]);

    return {
      needs,
      profile: loadedProfile,
      companyProfiles: loadedProfiles,
      reviews: loadedReviews,
      factors: loadedFactors,
      notifications: loadedNotifications,
      users: loadedUsers,
      suppliers: loadedSuppliers,
      plots: loadedPlots,
      documents: loadedDocuments,
      shipments: loadedShipments,
      shipmentSnapshots: loadedSnapshots,
      facilities: loadedFacilities,
      installations: loadedInstallations,
      batches: loadedBatches,
      extractions: loadedExtractions,
      auditLogs: loadedAuditLogs,
    };
  };

  const applyWorkspaceData = (loaded: NonNullable<Awaited<ReturnType<typeof fetchWorkspaceData>>>) => {
    const { needs } = loaded;

    if (needs.profile) {
      setProfile((loaded.profile as CompanyProfile | null | undefined) ?? null);
      if (loaded.profile) {
        setProfileForm({
          legalEntityName: loaded.profile.legalEntityName,
          tradeName: loaded.profile.tradeName,
          gst: loaded.profile.gst,
          udyam: loaded.profile.udyam,
          eori: loaded.profile.eori,
          registeredAddress: loaded.profile.registeredAddress,
          contactName: loaded.profile.contactName,
          contactEmail: loaded.profile.contactEmail,
          contactPhone: loaded.profile.contactPhone,
          exportCommodities: loaded.profile.exportCommodities,
          destinationCountries: loaded.profile.destinationCountries,
        });
      }
    }
    if (needs.companyProfiles) setCompanyProfiles((loaded.companyProfiles as CompanyProfile[] | undefined) ?? []);
    if (needs.reviews) setReviews((loaded.reviews as VerificationCase[] | undefined) ?? []);
    if (needs.factors) setFactors((loaded.factors as EmissionFactorRecord[] | undefined) ?? []);
    if (needs.notifications) setNotificationFeed((loaded.notifications as NotificationRecord[] | undefined) ?? []);
    if (needs.users) setUserDirectory((loaded.users as SessionUser[] | undefined) ?? []);
    if (needs.suppliers) setSuppliers((loaded.suppliers as Supplier[] | undefined) ?? []);
    if (needs.plots) setPlots((loaded.plots as PlotRecord[] | undefined) ?? []);
    if (needs.documents) setDocuments((loaded.documents as DocumentRecord[] | undefined) ?? []);
    if (needs.shipments && loaded.shipments) setShipments(filterShipmentsForSession(loaded.shipments as ShipmentRecord[], session as SessionUser));
    if (needs.shipmentSnapshots) setShipmentSnapshots((loaded.shipmentSnapshots as ShipmentSnapshot[] | undefined) ?? []);
    if (needs.facilities) setFacilities((loaded.facilities as FacilityRecord[] | undefined) ?? []);
    if (needs.installations) setInstallations((loaded.installations as InstallationRecord[] | undefined) ?? []);
    if (needs.batches) setBatches((loaded.batches as ProductionBatchRecord[] | undefined) ?? []);
    if (needs.extractions) setExtractions((loaded.extractions as ExtractionRecord[] | undefined) ?? []);
    if (needs.auditLogs) setAuditLogs((loaded.auditLogs as AuditLogEntry[] | undefined) ?? []);
  };

  useEffect(() => {
    if (!session) {
      if (mobileSessionBooting) return;
      if (route.startsWith('/app/')) navigate('/');
      return;
    }
    let cancelled = false;
    const load = async () => {
      setWorkspaceLoading(true);
      try {
        const loaded = await fetchWorkspaceData(getWorkspaceDataNeeds(route, session.role));
        if (!loaded || cancelled) return;
        if (cancelled) return;
        applyWorkspaceData(loaded);
      } catch (error) {
        if (cancelled) return;
        showWorkspaceNotice(
          'Workspace unavailable',
          toFriendlyMessage(error, 'The workspace could not finish loading. Refresh once and try again.'),
        );
        void reportWebError({
          source: 'workspace-initial-load',
          error: error instanceof Error ? error : new Error(String(error)),
          context: { sessionRole: session.role, route: window.location.pathname },
        });
      } finally {
        if (!cancelled) setWorkspaceLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [session, route, mobileSessionBooting]);

  useEffect(() => {
    if (!session) return;
    if (route === '/' || route === '/login' || route === '/signup' || route === '/pricing') {
      navigate(DEFAULT_ROUTE_BY_ROLE[session.role]);
    }
  }, [session, route]);

  const shipmentSnapshotsByShipmentId = useMemo(() => {
    const entries = new Map<string, ShipmentSnapshot>();
    shipmentSnapshots.forEach((snapshot) => {
      const current = entries.get(snapshot.shipmentId);
      if (!current || snapshot.version > current.version) entries.set(snapshot.shipmentId, snapshot);
    });
    return entries;
  }, [shipmentSnapshots]);
  const resolvedShipments = useMemo(
    () =>
      shipments.map((shipment) => {
        const snapshot = shipmentSnapshotsByShipmentId.get(shipment.id);
        const baseShipment = withShipmentDefaults(shipment);
        if (!snapshot) return baseShipment;
        return withShipmentDefaults({
          ...baseShipment,
          report: snapshot.report,
          approvalVersion: snapshot.version,
          approvedSnapshotId: snapshot.id,
          approvedAt: snapshot.approvedAt,
          approvedBy: snapshot.approvedByName,
        });
      }),
    [shipments, shipmentSnapshotsByShipmentId],
  );
  const approvedShipments = useMemo(
    () => resolvedShipments.filter((s) => s.status === 'APPROVED' && s.report),
    [resolvedShipments],
  );
  const hasEnterpriseDemo = useMemo(
    () => resolvedShipments.some((shipment) => DEMO_INVOICE_IDS.includes(shipment.invoiceId)),
    [resolvedShipments],
  );
  const notifications = useMemo<NotificationRecord[]>(
    () =>
      [...notificationFeed].sort((left, right) =>
        notificationDateValue(right.createdAt).localeCompare(notificationDateValue(left.createdAt)),
      ),
    [notificationFeed],
  );
  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );
  const activePlot = plots.find((p) => p.id === activePlotId) ?? plots[0] ?? null;
  const activeShipment = resolvedShipments.find((s) => s.id === activeShipmentId) ?? resolvedShipments[0] ?? null;
  const typedDocuments = useMemo(
    () => (documents as DocumentRecord[]).map((document) => ({ ...document, previewUrl: resolveDocumentPreviewUrl(document) })),
    [documents],
  );
  const extractionBacklogCount = useMemo(
    () =>
      typedDocuments.filter(
        (document) => !extractions.some((extraction) => extraction.documentId === document.id && extraction.status === 'REVIEWED'),
      ).length,
    [typedDocuments, extractions],
  );
  const pendingVerifierCount = useMemo(
    () => resolvedShipments.filter((shipment) => ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED'].includes(shipment.status)).length,
    [resolvedShipments],
  );
  const compliantPlotCount = useMemo(
    () => plots.filter((plot) => plot.analysis?.status === 'COMPLIANT').length,
    [plots],
  );
  const readyShipmentCount = useMemo(
    () =>
      resolvedShipments.filter((shipment) =>
        getShipmentReadiness(shipment, plots, typedDocuments, installations, batches, extractions).isReady,
      ).length,
    [resolvedShipments, plots, typedDocuments, installations, batches, extractions],
  );
  const averageApprovalLagDays = useMemo(() => {
    if (!approvedShipments.length) return 0;
    const totalDays = approvedShipments.reduce((sum, shipment) => {
      const approvedAt = shipment.approvedAt ? new Date(shipment.approvedAt).getTime() : 0;
      const createdAt = shipment.createdAt ? new Date(shipment.createdAt).getTime() : 0;
      if (!approvedAt || !createdAt) return sum;
      return sum + Math.max(0, (approvedAt - createdAt) / (1000 * 60 * 60 * 24));
    }, 0);
    return Math.round((totalDays / Math.max(approvedShipments.length, 1)) * 10) / 10;
  }, [approvedShipments]);
  const getShipmentSnapshot = (shipmentId?: string) =>
    shipmentId ? shipmentSnapshotsByShipmentId.get(shipmentId) : undefined;
  const profileForShipment = (shipment: ShipmentRecord) => companyProfiles.find((candidate) => candidate.id === shipment.ownerId) ?? profile;

  const persistBillingState = (nextState: BillingState) => {
    setBillingState(nextState);
    if (session) saveBillingState(session.id, nextState);
  };

  const changeBillingState = (nextState: BillingState) => {
    persistBillingState(nextState);
  };

  const openBillingRoute = () => {
    if (!session) return navigate('/pricing');
    navigate(`/app/${session.role}/billing` as Route);
  };

  const consumeCredit = (kind: BillingUsageKind, label: string, amount = 1) => {
    if (!session) return true;
    const result = consumeBillingAction(billingState, kind, amount, label);
    if (!result.ok) {
      showWorkspaceNotice(
        'Usage limit reached',
        `All ${kind} credits on the ${result.plan.name} plan are already used. Open Billing to switch plans or reset demo credits.`,
        'warn',
      );
      openBillingRoute();
      return false;
    }
    persistBillingState(result.state);
    return true;
  };

  const downloadShipmentJson = (shipment: ShipmentRecord) => {
    if (session?.role === 'exporter' && !consumeCredit('report', `JSON export / ${shipment.invoiceId}`)) return;
    if (session?.role === 'importer' && !consumeCredit('importerDownload', `JSON package / ${shipment.invoiceId}`)) return;
    downloadFile(
      `${shipment.invoiceId}.json`,
      JSON.stringify(getShipmentSnapshot(shipment.id)?.report ?? shipment.report, null, 2),
      'application/json',
    );
  };

  const downloadShipmentXml = (shipment: ShipmentRecord) => {
    if (session?.role === 'exporter' && !consumeCredit('report', `TRACES XML / ${shipment.invoiceId}`)) return;
    if (session?.role === 'importer' && !consumeCredit('importerDownload', `TRACES XML / ${shipment.invoiceId}`)) return;
    downloadFile(
      `${shipment.invoiceId}-traces.xml`,
      getShipmentSnapshot(shipment.id)?.tracesXml ??
        buildTracesXml(shipment, profileForShipment(shipment), suppliers, plots),
      'application/xml',
    );
  };

  const downloadShipmentDds = (shipment: ShipmentRecord) => {
    if (session?.role === 'exporter' && !consumeCredit('report', `DDS export / ${shipment.invoiceId}`)) return;
    if (session?.role === 'importer' && !consumeCredit('importerDownload', `DDS package / ${shipment.invoiceId}`)) return;
    downloadFile(
      `${shipment.invoiceId}-dds.json`,
      JSON.stringify(
        serializeEudrDdsPayload(
          getShipmentSnapshot(shipment.id)?.ddsPayload ??
            buildEudrDdsPayload(shipment, profileForShipment(shipment), suppliers, plots),
        ),
        null,
        2,
      ),
      'application/json',
    );
  };

  const downloadShipmentCbamCsv = (shipment: ShipmentRecord) => {
    if (!shipment.report) return;
    if (session?.role === 'exporter' && !consumeCredit('report', `CBAM CSV / ${shipment.invoiceId}`)) return;
    if (session?.role === 'importer' && !consumeCredit('importerDownload', `CBAM CSV / ${shipment.invoiceId}`)) return;
    downloadFile(
      `${shipment.invoiceId}-cbam.csv`,
      getShipmentSnapshot(shipment.id)?.cbamCsv ??
        buildCbamRegistryCsv(shipment, shipment.report, batches, installations, facilities),
      'text/csv',
    );
  };

  const downloadShipmentPackage = (shipment: ShipmentRecord) => {
    if (session?.role === 'exporter' && !consumeCredit('report', `Full package / ${shipment.invoiceId}`)) return;
    if (session?.role === 'importer' && !consumeCredit('importerDownload', `Full package / ${shipment.invoiceId}`)) return;
    downloadFile(
      `${shipment.invoiceId}-package.json`,
      getShipmentSnapshot(shipment.id)?.packageJson ??
        buildOperationalShipmentPackage(
          shipment,
          shipment.report ?? null,
          profileForShipment(shipment),
          suppliers,
          plots,
          typedDocuments,
          facilities,
          installations,
          batches,
          extractions,
        ),
      'application/json',
    );
  };

  const downloadShipmentPdf = (shipment: ShipmentRecord) => {
    if (session?.role === 'exporter' && !consumeCredit('report', `PDF report / ${shipment.invoiceId}`)) return;
    if (session?.role === 'importer' && !consumeCredit('importerDownload', `PDF package / ${shipment.invoiceId}`)) return;
    void loadPdfExports()
      .then(({ downloadShipmentReportPdf }) =>
        downloadShipmentReportPdf({
          shipment,
          report: getShipmentSnapshot(shipment.id)?.report ?? shipment.report ?? null,
          companyProfile: profileForShipment(shipment),
          suppliers,
          plots,
          documents: typedDocuments,
          facilities,
          installations,
          batches,
          extractions,
        }),
      )
      .catch((error) =>
        showWorkspaceNotice('PDF export unavailable', toFriendlyMessage(error, 'The PDF package could not be generated right now.')),
      );
  };

  const downloadDocumentPdf = (document: DocumentRecord) =>
    void loadPdfExports()
      .then(({ downloadDocumentEvidencePdf }) =>
        downloadDocumentEvidencePdf(
          document,
          extractions.find((extraction) => extraction.documentId === document.id) ?? null,
        ),
      )
      .catch((error) =>
        showWorkspaceNotice('Evidence PDF unavailable', toFriendlyMessage(error, 'The evidence PDF could not be prepared right now.')),
      );

  const downloadPlotGeoJson = (plot: PlotRecord) =>
    downloadFile(
      `${plot.name.replace(/\s+/g, '-').toLowerCase()}.geojson`,
      JSON.stringify(buildPlotGeoJson(plot), null, 2),
      'application/geo+json',
    );

    const refreshAll = async (overrideNeeds?: WorkspaceDataNeeds) => {
      if (!session) return;
      const loaded = await fetchWorkspaceData(mergeNeeds(getWorkspaceDataNeeds(route, session.role), overrideNeeds ?? {}));
      if (!loaded) return;
      applyWorkspaceData(loaded);
    };

  const logAudit = async (ownerId: string | undefined, action: string, entityType: string, entityId: string, summary: string, details: string) => {
    if (!session) return;
    await saveAuditLog(ownerId ?? session.id, {
      actorId: session.id,
      actorName: session.name,
      action,
      entityType,
      entityId,
      summary,
      details,
    });
  };

  const pushNotification = async (
    payload: Omit<NotificationRecord, 'id' | 'createdAt' | 'read'>,
  ) => {
    await saveNotificationToFirebase({
      ...payload,
      actorName: payload.actorName ?? session?.name ?? 'CarbonTrace AI',
    });
  };

  const openNotification = async (notification: NotificationRecord) => {
    if (!notification.read) {
      await markNotificationReadInFirebase(notification.id, true);
      setNotificationFeed((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, read: true, readAt: new Date().toISOString() }
            : item,
        ),
      );
    }
    navigate(notification.route as Route);
  };

  const getUserById = (userId?: string) =>
    userDirectory.find((user) => user.id === userId || getUserWorkspaceId(user) === userId);

  const getUsersByRole = (role: UserRole) => userDirectory.filter((user) => user.role === role && user.email);

  const buildEmailSummaryItems = (
    items: Array<{ label: string; value?: string | number | null }>,
  ): WorkflowEmailSummaryItem[] =>
    items
      .filter((item) => item.value !== undefined && item.value !== null && String(item.value).trim())
      .map((item) => ({
        label: item.label,
        value: String(item.value).trim(),
      }));

  const formatShipmentQuantity = (shipment?: { quantity?: string; unit?: string }) =>
    [shipment?.quantity, shipment?.unit].filter(Boolean).join(' ').trim() || 'Not set';

  const bytesToBase64 = (bytes: Uint8Array) => {
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, Math.min(index + chunkSize, bytes.length));
      binary += String.fromCharCode(...chunk);
    }
    return window.btoa(binary);
  };

  const textToBase64 = (value: string) => bytesToBase64(new TextEncoder().encode(value));

  const buildApprovedPackageEmailAttachments = async (
    shipment: ShipmentRecord,
    snapshot: ShipmentSnapshot,
  ): Promise<WorkflowEmailAttachment[]> => {
    const { buildShipmentReportPdfAttachment } = await loadPdfExports();
    const versionLabel = `v${snapshot.version}`;
    const prefix = `${shipment.invoiceId || shipment.id}-${versionLabel}`;
    const attachments: WorkflowEmailAttachment[] = [
      {
        ...buildShipmentReportPdfAttachment({
          shipment: {
            ...shipment,
            status: 'APPROVED',
            report: snapshot.report,
          },
          report: snapshot.report,
          companyProfile: profileForShipment(shipment),
          suppliers,
          plots,
          documents: typedDocuments,
          facilities,
          installations,
          batches,
          extractions,
        }),
        fileName: `${prefix}-compliance-report.pdf`,
      },
      {
        fileName: `${prefix}-dds.json`,
        contentBase64: textToBase64(JSON.stringify(serializeEudrDdsPayload(snapshot.ddsPayload), null, 2)),
        contentType: 'application/json',
      },
      {
        fileName: `${prefix}-traces.xml`,
        contentBase64: textToBase64(snapshot.tracesXml),
        contentType: 'application/xml',
      },
      {
        fileName: `${prefix}-package.json`,
        contentBase64: textToBase64(snapshot.packageJson),
        contentType: 'application/json',
      },
    ];

    if (requiresCbamCoverage(shipment) && snapshot.cbamCsv.trim()) {
      attachments.push({
        fileName: `${prefix}-cbam.csv`,
        contentBase64: textToBase64(snapshot.cbamCsv),
        contentType: 'text/csv',
      });
    }

    return attachments;
  };

  const sendWorkflowEmailsSafely = async (
    payload: Omit<WorkflowEmailPayload, 'to'> & { recipients: EmailRecipient[] },
  ) => {
    const subject = payload.subject.startsWith('[CarbonTrace AI]')
      ? payload.subject
      : `[CarbonTrace AI] ${payload.subject}`;
    try {
      await sendWorkflowEmail({
        to: payload.recipients,
        subject,
        title: payload.title,
        message: payload.message,
        route: payload.route,
        secondaryLines: payload.secondaryLines,
        overline: payload.overline,
        badge: payload.badge,
        referenceId: payload.referenceId,
        summaryItems: payload.summaryItems,
        actionLabel: payload.actionLabel,
        footerNote: payload.footerNote,
        attachments: payload.attachments,
      });
    } catch (error) {
      console.warn('Email delivery skipped or failed.', error);
    }
  };

  const loadEnterpriseDemoPack = async () => {
    if (!session || session.role !== 'exporter') return;

    if (hasEnterpriseDemo) {
      navigate('/app/exporter/reports');
      return;
    }

    setDemoBusy(true);

    try {
      const ownerId = session.id;
      const timestamp = new Date().toISOString();
      const emissionFactors = factors.length ? factors : await fetchEmissionFactors();
      const routingUsers = userDirectory.length ? userDirectory : await fetchAllUsers();
      if (!userDirectory.length) {
        setUserDirectory(routingUsers);
      }
      const seededProfile = await saveCompanyProfileToFirebase(ownerId, {
        legalEntityName: 'Malnad CarbonTrace Exports Pvt Ltd',
        tradeName: 'CarbonTrace Operations Demo',
        gst: '29AAECM2026K1Z8',
        udyam: 'UDYAM-KA-03-0020246',
        eori: 'INMCTEUDRCBAM26',
        registeredAddress: '214 Export District, Bengaluru, Karnataka, India',
        contactName: 'Ananya Rao',
        contactEmail: session.email,
        contactPhone: '+91-98450-22041',
        exportCommodities: 'Coffee Arabica Beans, Steel Billets',
        destinationCountries: 'Germany, Netherlands, Belgium',
      });
      const demoVerifier = routingUsers.find((user) => user.role === 'verifier');
      const demoImporter = routingUsers.find((user) => user.role === 'importer');
      const demoVerifierId = demoVerifier ? getUserWorkspaceId(demoVerifier) : 'VER-DEMO-01';
      const demoImporterId = demoImporter ? getUserWorkspaceId(demoImporter) : 'IMP-DEMO-01';
      const demoExporterReferenceId = seededProfile?.gst || getExporterReferenceId(seededProfile, session);

      const coffeeSupplierId = await saveSupplierToFirebase(ownerId, {
        name: 'Malnad Highlands Farmer Producer Company',
        type: 'Farmer Group',
        commodity: 'Coffee',
        country: 'India',
        region: 'Chikkamagaluru, Karnataka',
      });
      const metalsSupplierId = await saveSupplierToFirebase(ownerId, {
        name: 'Shakti Recycled Metals LLP',
        type: 'Industrial Feedstock Supplier',
        commodity: 'Steel',
        country: 'India',
        region: 'Pune, Maharashtra',
      });

      const plotAlphaCoordinates = closeRing([
        [13.180621, 75.745218],
        [13.181248, 75.746108],
        [13.180579, 75.747194],
        [13.179822, 75.746322],
      ]);
      const plotBetaCoordinates = closeRing([
        [13.176422, 75.752203],
        [13.177092, 75.753111],
        [13.176398, 75.754202],
        [13.175741, 75.753208],
      ]);

      const buildPolygonGeoJson = (coordinates: number[][], name: string, commodity: string, areaHectares: string) =>
        JSON.stringify(
          {
            type: 'Feature',
            properties: {
              name,
              commodity,
              areaHectares,
            },
            geometry: {
              type: 'Polygon',
              coordinates: [coordinates.map(([lat, lng]) => [lng, lat])],
            },
          },
          null,
          2,
        );

      const plotAlphaId = await savePlotToFirebase(ownerId, {
        name: 'Plot Alpha / Hassan Cluster',
        supplierId: coffeeSupplierId,
        commodity: 'Coffee',
        countryOfProduction: 'India',
        geometryType: 'polygon',
        coordinates: toStoredCoordinates(plotAlphaCoordinates),
        geojsonText: buildPolygonGeoJson(plotAlphaCoordinates, 'Plot Alpha / Hassan Cluster', 'Coffee', '2.8'),
        areaHectares: '2.8',
        analysis: {
          status: 'COMPLIANT',
          deforested_area_m2: 0,
          satellite_source: 'Hansen GFC via Google Earth Engine',
          analysis_timestamp: timestamp,
          note: 'No post-2020 loss detected in the seeded due diligence record.',
        },
      });
      const plotBetaId = await savePlotToFirebase(ownerId, {
        name: 'Plot Beta / Balehonnur Lot',
        supplierId: coffeeSupplierId,
        commodity: 'Coffee',
        countryOfProduction: 'India',
        geometryType: 'polygon',
        coordinates: toStoredCoordinates(plotBetaCoordinates),
        geojsonText: buildPolygonGeoJson(plotBetaCoordinates, 'Plot Beta / Balehonnur Lot', 'Coffee', '1.9'),
        areaHectares: '1.9',
        analysis: {
          status: 'COMPLIANT',
          deforested_area_m2: 0,
          satellite_source: 'Hansen GFC via Google Earth Engine',
          analysis_timestamp: timestamp,
          note: 'Compliant polygon seeded for importer and verifier walkthrough.',
        },
      });

      const steelFacilityId = await saveFacilityToFirebase(ownerId, {
        name: 'Pune Green Steel Works',
        address: 'MIDC Chakan Industrial Area, Pune, Maharashtra, India',
        country: 'India',
        region: 'Maharashtra',
        productLines: ['Steel Billets'],
      });
      const steelInstallationId = await saveInstallationToFirebase(ownerId, {
        facilityId: steelFacilityId,
        name: 'Electric Arc Furnace Line 02',
        processType: 'Steel billet melting and casting',
        fuelTypes: ['Diesel', 'Natural Gas'],
        electricitySource: 'India Grid',
        coveredProducts: ['Steel Billets'],
        annualCapacity: '65000',
      });

      const documentSpecs = [
        { key: 'land', fileName: 'land-record-hassan-cluster.pdf', documentType: 'Land Record', notes: '7/12 extract for Plot Alpha and Plot Beta.', previewUrl: DEMO_PREVIEW_URLS.land },
        { key: 'declaration', fileName: 'supplier-declaration-coffee-apr2026.pdf', documentType: 'Supplier Declaration', notes: 'Farmer group declaration for deforestation-free coffee lots.', previewUrl: DEMO_PREVIEW_URLS.declaration },
        { key: 'coffeeShipment', fileName: 'commercial-invoice-ct-eudr-2026-041.pdf', documentType: 'Shipment Document', notes: 'Coffee shipment commercial invoice and packing list.', previewUrl: DEMO_PREVIEW_URLS.coffeeShipment },
        { key: 'electricity', fileName: 'electricity-bill-pune-plant-mar2026.pdf', documentType: 'Electricity Bill', notes: 'Measured grid electricity for EAF line.', previewUrl: DEMO_PREVIEW_URLS.electricity },
        { key: 'diesel', fileName: 'diesel-invoice-eaf-support-mar2026.pdf', documentType: 'Fuel Invoice', notes: 'Diesel for forklifts and ladle transfer support.', previewUrl: DEMO_PREVIEW_URLS.diesel },
        { key: 'production', fileName: 'production-log-batch-sb-2026-117.pdf', documentType: 'Production Log', notes: 'Shift production log for steel billet batch SB-2026-117.', previewUrl: DEMO_PREVIEW_URLS.production },
        { key: 'po', fileName: 'purchase-order-netherlands-buyer.pdf', documentType: 'Purchase Order', notes: 'Buyer purchase order for steel billets to Rotterdam.', previewUrl: DEMO_PREVIEW_URLS.po },
      ] as const;

      const documentIdMap = new Map<string, string>();
      for (const documentSpec of documentSpecs) {
        const id = await saveDocumentRecordToFirebase(ownerId, {
          fileName: documentSpec.fileName,
          documentType: documentSpec.documentType,
          notes: documentSpec.notes,
          linkedShipmentId: '',
          linkedFacilityId: '',
          linkedBatchId: '',
          previewUrl: documentSpec.previewUrl,
          ocrStatus: 'PENDING',
        });
        documentIdMap.set(documentSpec.key, id);
      }

      const steelBatchBase = {
        shipmentId: '',
        facilityId: steelFacilityId,
        installationId: steelInstallationId,
        batchCode: 'SB-2026-117-A',
        product: 'Steel Billets',
        quantity: '125',
        unit: 't',
        fuelType: 'Diesel',
        fuelAmount: '420',
        fuelUnit: 'litre',
        electricityKwh: '18250',
        documentIds: [
          documentIdMap.get('electricity')!,
          documentIdMap.get('diesel')!,
          documentIdMap.get('production')!,
        ],
        notes: 'Measured production batch for CBAM demonstration.',
      };
      const steelBatchId = await saveProductionBatchToFirebase(ownerId, steelBatchBase);

      const coffeeShipmentBase: Omit<ShipmentRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        exporterReferenceId: demoExporterReferenceId,
        verifierId: demoVerifierId,
        verifierName: demoVerifier?.name ?? 'Assigned Verifier',
        importerId: demoImporterId,
        importerName: demoImporter?.name ?? 'Assigned Importer',
        invoiceId: 'CT-EUDR-2026-041',
        product: 'Coffee Arabica Beans',
        productCategory: 'coffee',
        hsCode: '090111',
        destinationCountry: 'Germany',
        quantity: '18.5',
        unit: 't',
        supplierIds: [coffeeSupplierId],
        plotIds: [plotAlphaId, plotBetaId],
        documentIds: [
          documentIdMap.get('land')!,
          documentIdMap.get('declaration')!,
          documentIdMap.get('coffeeShipment')!,
        ],
        facilityIds: [],
        installationIds: [],
        batchIds: [],
        energyNotes: 'Coffee shipment uses farm traceability and origin declarations.',
        additionalNotes: 'Approved exporter pack seeded for importer handoff.',
        status: 'SUBMITTED',
        report: null,
      };

      const steelShipmentBase: Omit<ShipmentRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        exporterReferenceId: demoExporterReferenceId,
        verifierId: demoVerifierId,
        verifierName: demoVerifier?.name ?? 'Assigned Verifier',
        importerId: demoImporterId,
        importerName: demoImporter?.name ?? 'Assigned Importer',
        invoiceId: 'CT-CBAM-2026-117',
        product: 'Steel Billets',
        productCategory: 'steel',
        hsCode: '720720',
        destinationCountry: 'Netherlands',
        quantity: '125',
        unit: 't',
        supplierIds: [metalsSupplierId],
        plotIds: [],
        documentIds: [
          documentIdMap.get('electricity')!,
          documentIdMap.get('diesel')!,
          documentIdMap.get('production')!,
          documentIdMap.get('po')!,
        ],
        facilityIds: [steelFacilityId],
        installationIds: [steelInstallationId],
        batchIds: [steelBatchId],
        energyNotes: 'Measured energy values collected from March utility and diesel invoices.',
        additionalNotes: 'Submitted industrial shipment ready for verifier walkthrough.',
        status: 'SUBMITTED',
        report: null,
      };

      const coffeeShipmentId = await saveShipmentToFirebase(ownerId, coffeeShipmentBase);
      const steelShipmentId = await saveShipmentToFirebase(ownerId, steelShipmentBase);

      await updateProductionBatchInFirebase(steelBatchId, {
        ...steelBatchBase,
        shipmentId: steelShipmentId,
      });

      const seededDocuments: DocumentRecord[] = documentSpecs.map((documentSpec) => ({
        id: documentIdMap.get(documentSpec.key)!,
        ownerId,
        fileName: documentSpec.fileName,
        documentType: documentSpec.documentType,
        notes: documentSpec.notes,
        linkedShipmentId:
          documentSpec.key === 'land' || documentSpec.key === 'declaration' || documentSpec.key === 'coffeeShipment'
            ? coffeeShipmentId
            : steelShipmentId,
        linkedFacilityId:
          documentSpec.key === 'electricity' || documentSpec.key === 'diesel' || documentSpec.key === 'production' || documentSpec.key === 'po'
            ? steelFacilityId
            : '',
        linkedBatchId:
          documentSpec.key === 'electricity' || documentSpec.key === 'diesel' || documentSpec.key === 'production'
            ? steelBatchId
            : '',
        previewUrl: documentSpec.previewUrl,
        ocrStatus: 'REVIEWED',
        createdAt: timestamp,
        updatedAt: timestamp,
      }));

      for (const document of seededDocuments) {
        await updateDocumentInFirebase(document.id, {
          linkedShipmentId: document.linkedShipmentId,
          linkedFacilityId: document.linkedFacilityId,
          linkedBatchId: document.linkedBatchId,
          ocrStatus: 'REVIEWED',
        });
      }

      const createReviewedExtraction = async (document: DocumentRecord, rawText: string, reviewerNotes: string) => {
        const extracted = deriveExtractionFromDocument(document, rawText, {
          provider: 'document-ai',
          providerModel: 'document-ai:us:409ed4fb6ad205e5',
          baseConfidence: 0.96,
          detectedDocumentType: document.documentType,
          warnings: [],
          sourceMimeType: 'application/pdf',
          pageCount: 1,
        });

        await upsertExtractionRecord(ownerId, document.id, {
          ...extracted,
          status: 'REVIEWED',
          reviewerNotes,
          confidence: Math.max(extracted.confidence, 0.96),
          reviewRequired: false,
        });
      };

      const documentByKey = Object.fromEntries(seededDocuments.map((document, index) => [documentSpecs[index].key, document])) as Record<string, DocumentRecord>;

      await createReviewedExtraction(
        documentByKey.land,
        'Land Record\nOwner Name: Kaveri Hegde\nSurvey Number: 24/2B\nVillage: Balehonnur\nLatitude: 13.180621\nLongitude: 75.745218\nPolygon Reference: Present',
        'Land parcel references matched the seeded polygon geometry.',
      );
      await createReviewedExtraction(
        documentByKey.declaration,
        'Supplier Declaration\nSupplier Name: Malnad Highlands Farmer Producer Company\nDeclaration Date: 02/04/2026\nCommodity: Coffee Arabica Beans\nOrigin Country: India\nPlot Number: 24/2B',
        'Declaration confirmed commodity, origin, and supplier identity.',
      );
      await createReviewedExtraction(
        documentByKey.coffeeShipment,
        'Shipment Document\nInvoice Number: CT-EUDR-2026-041\nSupplier: Malnad Highlands Farmer Producer Company\nHS Code: 090111\nDestination: Germany\nShipment Date: 03/04/2026\nQuantity: 18.5 t',
        'Commercial invoice and shipment reference reviewed.',
      );
      await createReviewedExtraction(
        documentByKey.electricity,
        'Electricity Bill\nInvoice Number: ELEC-032026-7781\nProvider: MSEDCL\nConsumer Number: 99887711\nMeter Number: MTR-4402\nBilling Date: 28/03/2026\n18250 kWh\nGrand Total: 154220',
        'Utility data confirmed for EAF line allocation.',
      );
      await createReviewedExtraction(
        documentByKey.diesel,
        'Fuel Invoice\nInvoice Number: DSL-2026-0312\nSupplier: Bharat Petroleum Industrial Fuels\nInvoice Date: 29/03/2026\nDiesel\n420 litre\nAmount: 38220',
        'Diesel support consumption reviewed against batch support logs.',
      );
      await createReviewedExtraction(
        documentByKey.production,
        'Production Log\nBatch Code: SB-2026-117-A\nInstallation Name: Electric Arc Furnace Line 02\nProduct: Steel Billets\nProduction Date: 30/03/2026\n125 t\n450 kWh',
        'Batch output and energy references checked against operations log.',
      );
      await createReviewedExtraction(
        documentByKey.po,
        'Purchase Order\nPO Number: NL-PO-88421\nSupplier Name: Shakti Recycled Metals LLP\nOrder Date: 01/04/2026\nQuantity: 125 t\nAmount: 7980000',
        'Buyer purchase order reviewed for shipment alignment.',
      );

      const seededPlots: PlotRecord[] = [
        {
          id: plotAlphaId,
          ownerId,
          name: 'Plot Alpha / Hassan Cluster',
          supplierId: coffeeSupplierId,
          commodity: 'Coffee',
          countryOfProduction: 'India',
          geometryType: 'polygon',
          coordinates: toStoredCoordinates(plotAlphaCoordinates),
          geojsonText: buildPolygonGeoJson(plotAlphaCoordinates, 'Plot Alpha / Hassan Cluster', 'Coffee', '2.8'),
          areaHectares: '2.8',
          analysis: {
            status: 'COMPLIANT',
            deforested_area_m2: 0,
            satellite_source: 'Hansen GFC via Google Earth Engine',
            analysis_timestamp: timestamp,
            note: 'No post-2020 loss detected in the seeded due diligence record.',
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: plotBetaId,
          ownerId,
          name: 'Plot Beta / Balehonnur Lot',
          supplierId: coffeeSupplierId,
          commodity: 'Coffee',
          countryOfProduction: 'India',
          geometryType: 'polygon',
          coordinates: toStoredCoordinates(plotBetaCoordinates),
          geojsonText: buildPolygonGeoJson(plotBetaCoordinates, 'Plot Beta / Balehonnur Lot', 'Coffee', '1.9'),
          areaHectares: '1.9',
          analysis: {
            status: 'COMPLIANT',
            deforested_area_m2: 0,
            satellite_source: 'Hansen GFC via Google Earth Engine',
            analysis_timestamp: timestamp,
            note: 'Compliant polygon seeded for importer and verifier walkthrough.',
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ];

      const seededFacilities: FacilityRecord[] = [{
        id: steelFacilityId,
        ownerId,
        name: 'Pune Green Steel Works',
        address: 'MIDC Chakan Industrial Area, Pune, Maharashtra, India',
        country: 'India',
        region: 'Maharashtra',
        productLines: ['Steel Billets'],
        createdAt: timestamp,
        updatedAt: timestamp,
      }];
      const seededInstallations: InstallationRecord[] = [{
        id: steelInstallationId,
        ownerId,
        facilityId: steelFacilityId,
        name: 'Electric Arc Furnace Line 02',
        processType: 'Steel billet melting and casting',
        fuelTypes: ['Diesel', 'Natural Gas'],
        electricitySource: 'India Grid',
        coveredProducts: ['Steel Billets'],
        annualCapacity: '65000',
        createdAt: timestamp,
        updatedAt: timestamp,
      }];
      const seededBatches: ProductionBatchRecord[] = [{
        id: steelBatchId,
        ownerId,
        ...steelBatchBase,
        shipmentId: steelShipmentId,
        createdAt: timestamp,
        updatedAt: timestamp,
      }];

      const coffeeShipmentSeeded: ShipmentRecord = {
        id: coffeeShipmentId,
        ownerId,
        ...coffeeShipmentBase,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const steelShipmentSeeded: ShipmentRecord = {
        id: steelShipmentId,
        ownerId,
        ...steelShipmentBase,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const coffeeReport = await buildReport(
        coffeeShipmentSeeded,
        seededPlots,
        seededBatches,
        seededInstallations,
        emissionFactors,
        seededDocuments,
      );
      const steelReport = await buildReport(
        steelShipmentSeeded,
        seededPlots,
        seededBatches,
        seededInstallations,
        emissionFactors,
        seededDocuments,
      );

      await updateShipmentInFirebase(coffeeShipmentId, {
        ...coffeeShipmentBase,
        report: coffeeReport,
        status: 'APPROVED',
        approvalVersion: 1,
        approvedAt: timestamp,
        approvedBy: session.name,
      });
      await attachReportToShipment(steelShipmentId, steelReport);

      await upsertVerificationCase(coffeeShipmentId, 'Approved with complete plot, shipment, and supplier evidence.', 'APPROVED');
      await upsertVerificationCase(steelShipmentId, 'Industrial package submitted with reviewed energy evidence and production batch links.', 'UNDER_REVIEW');

      await logAudit(ownerId, 'DEMO_PACK_CREATED', 'workspace', ownerId, 'Enterprise demo workspace loaded.', 'Created profile, suppliers, plots, facilities, documents, reviewed extractions, production, and shipments.');
      await logAudit(ownerId, 'PLOT_ANALYZED', 'plot', plotAlphaId, 'Seeded compliant EUDR analysis.', 'Plot Alpha loaded with compliant Google Earth Engine outcome.');
      await logAudit(ownerId, 'PLOT_ANALYZED', 'plot', plotBetaId, 'Seeded compliant EUDR analysis.', 'Plot Beta loaded with compliant Google Earth Engine outcome.');
      await logAudit(ownerId, 'SHIPMENT_APPROVED', 'shipment', coffeeShipmentId, 'Coffee shipment approved for importer handoff.', 'Approved exporter demo package prepared for importer handoff.');
      await logAudit(ownerId, 'SHIPMENT_SUBMITTED', 'shipment', steelShipmentId, 'Steel shipment submitted for verifier review.', 'CBAM evidence chain ready for walkthrough.');

      await pushNotification({
        recipientUserId: ownerId,
        title: 'Enterprise demo pack loaded',
        message: 'A realistic exporter workspace with approved and in-review shipments is now available in your account.',
        level: 'success',
        route: '/app/exporter/reports',
        entityType: 'shipment',
        entityId: coffeeShipmentId,
        type: 'DEMO_PACK_READY',
      });
      await pushNotification({
        recipientRole: 'verifier',
        title: 'Demo verification case ready',
        message: 'CT-CBAM-2026-117 is available in the verifier queue with linked industrial evidence.',
        level: 'warning',
        route: '/app/verifier/queue',
        entityType: 'shipment',
        entityId: steelShipmentId,
        type: 'VERIFICATION_REQUESTED',
      });
      await pushNotification({
        recipientRole: 'importer',
        title: 'Importer demo package ready',
        message: 'CT-EUDR-2026-041 is approved and available in the importer handoff workspace.',
        level: 'success',
        route: '/app/importer/shipments',
        entityType: 'shipment',
        entityId: coffeeShipmentId,
        type: 'IMPORTER_PACKAGE_READY',
      });

      await refreshAll();
      navigate(
        session.role === 'verifier'
          ? '/app/verifier/queue'
          : session.role === 'importer'
            ? '/app/importer/shipments'
            : '/app/exporter/reports',
      );
    } catch (error) {
      showWorkspaceNotice(
        'Demo pack unavailable',
        toFriendlyMessage(error, 'The enterprise demo workspace could not be loaded right now.'),
      );
    } finally {
      setDemoBusy(false);
    }
  };

  const handlePlotBuilderAdd = (coordinate: [number, number]) => {
    const nextCoordinates = plotForm.geometryType === 'point' ? [coordinate] : [...plotDraftCoordinates, coordinate];
    setPlotDraftCoordinates(nextCoordinates);
    setPlotForm((current) => ({
      ...current,
      coordinates: formatCoordinates(nextCoordinates, current.geometryType),
      geojsonText: '',
    }));
  };

  const handlePlotBuilderMove = (index: number, coordinate: [number, number]) => {
    const nextCoordinates =
      plotForm.geometryType === 'point'
        ? [coordinate]
        : plotDraftCoordinates.map((existing, existingIndex) => (existingIndex === index ? coordinate : existing));
    setPlotDraftCoordinates(nextCoordinates);
    setPlotForm((current) => ({
      ...current,
      coordinates: formatCoordinates(nextCoordinates, current.geometryType),
      geojsonText: '',
    }));
  };

  const handlePlotBuilderRemove = (index: number) => {
    const nextCoordinates =
      plotForm.geometryType === 'point'
        ? []
        : plotDraftCoordinates.filter((_, existingIndex) => existingIndex !== index);
    setPlotDraftCoordinates(nextCoordinates);
    setPlotForm((current) => ({
      ...current,
      coordinates: formatCoordinates(nextCoordinates, current.geometryType),
      geojsonText: '',
    }));
  };

  const handlePlotBuilderUndo = () => {
    const nextCoordinates =
      plotForm.geometryType === 'point'
        ? []
        : plotDraftCoordinates.slice(0, Math.max(0, plotDraftCoordinates.length - 1));
    setPlotDraftCoordinates(nextCoordinates);
    setPlotForm((current) => ({
      ...current,
      coordinates: formatCoordinates(nextCoordinates, current.geometryType),
      geojsonText: '',
    }));
  };

  const clearPlotBuilder = () => {
    setPlotDraftCoordinates([]);
    setPlotForm((current) => ({
      ...current,
      coordinates: '',
      geojsonText: '',
    }));
  };

  const resetPlotForm = () => {
    setPlotForm({
      id: '',
      name: '',
      supplierId: '',
      commodity: '',
      countryOfProduction: '',
      geometryType: 'point',
      areaHectares: '',
      coordinates: '',
      geojsonText: '',
    });
    setPlotDraftCoordinates([]);
  };

  const resetShipmentForm = () => {
    setShipmentForm({
      id: '',
      invoiceId: '',
      product: '',
      productCategory: '',
      hsCode: '',
      destinationCountry: '',
      quantity: '',
      unit: 'kg',
      supplierIds: [],
      plotIds: [],
      documentIds: [],
      facilityIds: [],
      installationIds: [],
      batchIds: [],
      verifierId: '',
      verifierName: '',
      importerId: '',
      importerName: '',
      energyNotes: '',
      additionalNotes: '',
    });
  };

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      if (route === '/signup') await signupWithEmail(String(form.get('email')), String(form.get('password')), authRole, String(form.get('name') || 'CarbonTrace User'));
      else await loginWithEmail(String(form.get('email')), String(form.get('password')));
    } catch (error) {
      setAuthError(toFriendlyMessage(error, 'Authentication could not be completed right now.'));
    } finally {
      setBusy(false);
    }
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const savedProfile = await saveCompanyProfileToFirebase(session.id, profileForm);
    setProfile(savedProfile);
    if (savedProfile) {
      setProfileForm({
        legalEntityName: savedProfile.legalEntityName,
        tradeName: savedProfile.tradeName,
        gst: savedProfile.gst,
        udyam: savedProfile.udyam,
        eori: savedProfile.eori,
        registeredAddress: savedProfile.registeredAddress,
        contactName: savedProfile.contactName,
        contactEmail: savedProfile.contactEmail,
        contactPhone: savedProfile.contactPhone,
        exportCommodities: savedProfile.exportCommodities,
        destinationCountries: savedProfile.destinationCountries,
      });
    }
  };

  const handleSupplierSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      name: supplierForm.name.trim(),
      type: supplierForm.type,
      commodity: supplierForm.commodity,
      country: supplierForm.country.trim(),
      region: supplierForm.region.trim(),
    };
    if (!payload.name || !payload.type || !payload.commodity) {
      showChecklistNotice('Supplier record incomplete', ['Supplier name', 'Supplier type', 'Commodity']);
      return;
    }
    if (supplierForm.id) await updateSupplierInFirebase(supplierForm.id, payload);
    else await saveSupplierToFirebase(session.id, payload);
    setSuppliers(await fetchSuppliers(session.id));
    setSupplierForm({ id: '', name: '', type: '', commodity: '', country: '', region: '' });
  };

  const handlePlotEdit = (plot: PlotRecord) => {
    const draftCoordinates = toCoordinatePairs(plot.coordinates);
    setPlotForm({
      id: plot.id,
      name: plot.name,
      supplierId: plot.supplierId,
      commodity: plot.commodity,
      countryOfProduction: plot.countryOfProduction,
      geometryType: plot.geometryType === 'geojson' ? 'polygon' : plot.geometryType,
      areaHectares: plot.areaHectares,
      coordinates: formatCoordinates(
        plot.geometryType === 'point' ? [draftCoordinates[0]] : draftCoordinates,
        plot.geometryType === 'point' ? 'point' : 'polygon',
      ),
      geojsonText: plot.geojsonText || '',
    });
    setPlotDraftCoordinates(
      plot.geometryType === 'point'
        ? [draftCoordinates[0]]
        : draftCoordinates.filter((_, index, arr) => index !== arr.length - 1 || arr.length === 1),
    );
  };

  const handlePlotSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const parsedGeoJson = parseGeoJsonText(plotForm.geojsonText);
      const geometryType = parsedGeoJson?.geometryType ?? plotForm.geometryType;
      const coordinates = parsedGeoJson?.coordinates ?? (plotDraftCoordinates.length ? plotDraftCoordinates : parseCoordinateText(plotForm.coordinates, geometryType === 'geojson' ? 'polygon' : geometryType));
      if (!plotForm.name.trim()) throw new Error('Plot name is required.');
      if (!plotForm.supplierId) throw new Error('Supplier is required.');
      if (!plotForm.commodity) throw new Error('Commodity is required.');
      if (!coordinates.length) throw new Error('Please provide valid coordinates or valid GeoJSON for the plot.');
      if (geometryType !== 'point' && coordinates.length < 3) throw new Error('Polygon plots need at least three coordinate points.');
      const payload = {
        name: plotForm.name.trim(),
        supplierId: plotForm.supplierId,
        commodity: plotForm.commodity,
        countryOfProduction: plotForm.countryOfProduction.trim(),
        geometryType,
        coordinates: toStoredCoordinates(geometryType === 'point' ? [coordinates[0]] : closeRing(coordinates)),
        geojsonText: parsedGeoJson?.normalizedText ?? plotForm.geojsonText.trim(),
        areaHectares: plotForm.areaHectares.trim(),
        analysis: plotForm.id ? plots.find((plot) => plot.id === plotForm.id)?.analysis ?? null : null,
      };
      if (plotForm.id) await updatePlotInFirebase(plotForm.id, payload);
      else await savePlotToFirebase(session.id, payload);
      const next = await fetchPlots(session.id);
      setPlots(next);
      setActivePlotId(next[0]?.id ?? '');
      resetPlotForm();
    } catch (error) {
      showWorkspaceNotice('Plot could not be saved', toFriendlyMessage(error, 'The plot could not be saved right now.'));
    }
  };

  const handlePlotAnalysis = async () => {
    if (!activePlot) return;
    try {
      setBusy(true);
      const coordinates = toCoordinatePairs(activePlot.coordinates);
      if (!coordinates.length) throw new Error('Save a valid plot geometry before running EUDR analysis.');
      if (activePlot.geometryType !== 'point' && coordinates.length < 3) throw new Error('Polygon plots need at least three points before EUDR analysis.');
      if (!consumeCredit('eudr', `EUDR screening / ${activePlot.name}`)) return;

      const result = await runGEEPipeline(coordinates, activePlot.areaHectares);
      await updatePlotAnalysisInFirebase(activePlot.id, {
        status: result.status,
        deforested_area_m2: result.forest_loss_m2,
        satellite_source: result.satellite_source,
        analysis_timestamp: result.analysis_timestamp,
        note: result.status === 'NON_COMPLIANT' ? 'Post-cutoff loss signal detected.' : 'No post-cutoff loss detected.',
      });
      await pushNotification({
        recipientUserId: session.id,
        title: result.status === 'NON_COMPLIANT' ? 'Plot flagged for EUDR review' : 'Plot analysis completed',
        message: result.status === 'NON_COMPLIANT'
          ? `${activePlot.name} shows a post-cutoff loss signal and should be reviewed before shipment reliance.`
          : `${activePlot.name} completed screening with a compliant outcome.`,
        level: result.status === 'NON_COMPLIANT' ? 'warning' : 'success',
        route: '/app/exporter/plots',
        entityType: 'plot',
        entityId: activePlot.id,
        type: 'PLOT_ANALYZED',
      });
      if (session.email) {
        await sendWorkflowEmailsSafely({
          recipients: [{ email: session.email, name: session.name }],
          subject: result.status === 'NON_COMPLIANT' ? `EUDR alert for ${activePlot.name}` : `EUDR analysis completed for ${activePlot.name}`,
          overline: 'Plot screening update',
          badge: result.status === 'NON_COMPLIANT' ? 'Action needed' : 'Compliant',
          referenceId: activePlot.name,
          title: result.status === 'NON_COMPLIANT' ? 'Plot flagged during EUDR screening' : 'Plot screening completed',
          message: result.status === 'NON_COMPLIANT'
            ? `${activePlot.name} triggered a post-cutoff loss alert and should be reviewed before shipment submission.`
            : `${activePlot.name} completed EUDR screening with a compliant outcome.`,
          route: '/app/exporter/plots',
          actionLabel: 'Open plot workspace',
          summaryItems: buildEmailSummaryItems([
            { label: 'Commodity', value: activePlot.commodity },
            { label: 'Country', value: activePlot.country },
            { label: 'Screening result', value: result.status },
            { label: 'Deforested area', value: `${result.forest_loss_m2} m2` },
            { label: 'Satellite source', value: result.satellite_source },
          ]),
          secondaryLines: [
            'Review the boundary and supporting evidence before linking this plot to a shipment package.',
            result.status === 'NON_COMPLIANT'
              ? 'The plot should not move into verifier handoff until the flagged risk is resolved.'
              : 'This plot is ready to be linked into downstream shipment evidence.',
          ],
          footerNote: 'Plot screening emails are sent when Earth Engine analysis finishes inside the exporter workspace.',
        });
      }
      setPlots(await fetchPlots(session.id));
      setNotificationFeed(await fetchNotificationsForSession(session.id, session.role));
    } catch (error) {
      showWorkspaceNotice(
        'EUDR screening could not run',
        toFriendlyMessage(error, 'The plot screening could not finish right now. Check the boundary and try again.'),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleUploadSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get('file') as File | null;
    const notes = String(form.get('notes') || '');
    const selectedType = String(form.get('documentType') || '');
    const inferredType = inferDocumentTypeFromSource({
      fileName: file?.name || '',
      documentType: selectedType,
      notes,
    });
    const documentId = await uploadDocumentToFirebase(session.id, file, inferredType, notes);
    const uploadedDocuments = await fetchDocuments(session.id);
    const uploadedDocument = uploadedDocuments.find((document) => document.id === documentId);

    if (uploadedDocument) {
      const { extractDocumentIntelligence } = await loadDocumentIntelligence();
      const extracted = await extractDocumentIntelligence(uploadedDocument);
      const finalType = extracted.detectedDocumentType || inferredType;
      await upsertExtractionRecord(session.id, documentId, extracted);
      await updateDocumentInFirebase(documentId, {
        documentType: finalType,
        ocrStatus: 'EXTRACTED',
      });
    }

    await pushNotification({
      recipientUserId: session.id,
      title: 'Document uploaded',
      message: `${file?.name || 'Manual note'} was added to the evidence library as ${inferredType}.`,
      level: 'info',
      route: '/app/exporter/uploads',
      entityType: 'document',
      entityId: documentId,
      type: 'DOCUMENT_UPLOADED',
    });
    setDocuments(await fetchDocuments(session.id));
    setExtractions(await fetchExtractionRecords(session.id));
    setNotificationFeed(await fetchNotificationsForSession(session.id, session.role));
    event.currentTarget.reset();
  };

  const handleShipmentEdit = (shipment: ShipmentRecord) => {
    if (shipment.status === 'APPROVED') {
      showWorkspaceNotice(
        'Approved package locked',
        'Approved shipments stay locked to preserve the released evidence package. Create a new version if changes are required.',
        'warn',
      );
      return;
    }
    setShipmentForm({
      id: shipment.id,
      invoiceId: shipment.invoiceId,
      product: shipment.product,
      productCategory: shipment.productCategory,
      hsCode: shipment.hsCode,
      destinationCountry: shipment.destinationCountry,
      quantity: shipment.quantity,
      unit: shipment.unit,
      supplierIds: shipment.supplierIds,
      plotIds: shipment.plotIds,
      documentIds: shipment.documentIds,
      facilityIds: shipment.facilityIds ?? [],
      installationIds: shipment.installationIds ?? [],
      batchIds: shipment.batchIds ?? [],
      verifierId: shipment.verifierId ?? '',
      verifierName: shipment.verifierName ?? '',
      importerId: shipment.importerId ?? '',
      importerName: shipment.importerName ?? '',
      energyNotes: shipment.energyNotes,
      additionalNotes: shipment.additionalNotes,
    });
  };

  const handleShipmentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const existingShipment = shipmentForm.id ? shipments.find((shipment) => shipment.id === shipmentForm.id) : undefined;
    const selectedVerifier = findUserByRoutingId(userDirectory, shipmentForm.verifierId, 'verifier');
    const selectedImporter = findUserByRoutingId(userDirectory, shipmentForm.importerId, 'importer');
    const base: Omit<ShipmentRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      exporterReferenceId: getExporterReferenceId(profile, session),
      verifierId: shipmentForm.verifierId.trim(),
      verifierName: selectedVerifier?.name ?? shipmentForm.verifierName.trim(),
      importerId: shipmentForm.importerId.trim(),
      importerName: selectedImporter?.name ?? shipmentForm.importerName.trim(),
      invoiceId: shipmentForm.invoiceId.trim(),
      product: shipmentForm.product.trim(),
      productCategory: shipmentForm.productCategory,
      hsCode: shipmentForm.hsCode.trim(),
      destinationCountry: shipmentForm.destinationCountry,
      quantity: shipmentForm.quantity.trim(),
      unit: shipmentForm.unit.trim() || 'kg',
      supplierIds: shipmentForm.supplierIds,
      plotIds: shipmentForm.plotIds,
      documentIds: shipmentForm.documentIds,
      facilityIds: shipmentForm.facilityIds,
      installationIds: shipmentForm.installationIds,
      batchIds: shipmentForm.batchIds,
      energyNotes: shipmentForm.energyNotes.trim(),
      additionalNotes: shipmentForm.additionalNotes.trim(),
      status: existingShipment?.status ?? 'DRAFT',
      report: existingShipment?.report ?? null,
    };
    const shipmentSaveErrors = [
      !base.exporterReferenceId ? 'Exporter ID/GSTIN is missing.' : '',
      !base.verifierId ? 'Verifier ID is missing.' : '',
      !base.importerId ? 'Importer ID is missing.' : '',
      !base.invoiceId ? 'Invoice ID is missing.' : '',
      !base.product ? 'Product name is missing.' : '',
      !base.productCategory ? 'Product category is missing.' : '',
      !base.hsCode ? 'HS code is missing.' : '',
      !base.destinationCountry ? 'EU destination country is missing.' : '',
      !base.quantity ? 'Shipment quantity is missing.' : '',
    ].filter(Boolean);
    if (shipmentSaveErrors.length) {
      showChecklistNotice('Shipment is not ready to save', shipmentSaveErrors);
      return;
    }
    if (shipmentForm.id) {
      await updateShipmentInFirebase(shipmentForm.id, base);
      await attachReportToShipment(shipmentForm.id, await buildReport({ ...(existingShipment as ShipmentRecord), ...base }, plots, batches, installations, factors, typedDocuments));
    } else {
      const createdId = await saveShipmentToFirebase(session.id, base);
      const next = await fetchShipments(session.id);
      const created = next.find((shipment) => shipment.id === createdId);
      if (created) await attachReportToShipment(created.id, await buildReport(created, plots, batches, installations, factors, typedDocuments));
    }
    await pushNotification({
      recipientUserId: session.id,
      title: shipmentForm.id ? 'Shipment updated' : 'Shipment created',
      message: `${base.invoiceId} was saved and the compliance report was refreshed.`,
      level: 'success',
      route: '/app/exporter/shipments',
      entityType: 'shipment',
      entityId: shipmentForm.id || base.invoiceId,
      type: shipmentForm.id ? 'SHIPMENT_UPDATED' : 'SHIPMENT_CREATED',
    });
    const refreshed = await fetchShipments(session.id);
    setShipments(refreshed);
    setNotificationFeed(await fetchNotificationsForSession(session.id, session.role));
    setActiveShipmentId(refreshed[0]?.id ?? '');
    resetShipmentForm();
  };

  const handleShipmentVerificationSubmit = async (shipment: ShipmentRecord) => {
    if (!consumeCredit('verifierReview', `Verifier submission / ${shipment.invoiceId}`)) return;
    const readiness = getShipmentReadiness(shipment, plots, typedDocuments, installations, batches, extractions);
    if (!readiness.isReady) {
      showChecklistNotice('Shipment is not ready for verifier review', readiness.issues);
      return;
    }
    const verifierRecipient = findUserByRoutingId(userDirectory, shipment.verifierId, 'verifier');
    await updateShipmentStatusInFirebase(shipment.id, 'SUBMITTED');
    await upsertVerificationCase(shipment.id, '', '', {
      verifierId: shipment.verifierId,
      verifierName: verifierRecipient?.name ?? shipment.verifierName,
      importerId: shipment.importerId,
      importerName: shipment.importerName,
    });
    const exporterRecipient = getUserById(shipment.ownerId ?? session.id) ?? session;
    const verifierRecipients = verifierRecipient?.email ? [verifierRecipient] : getUsersByRole('verifier');
    await pushNotification({
      recipientUserId: shipment.ownerId ?? session.id,
      title: 'Shipment submitted for verification',
      message: `${shipment.invoiceId} has been sent to ${shipment.verifierId || 'the verifier queue'}.`,
      level: 'info',
      route: '/app/exporter/shipments',
      entityType: 'shipment',
      entityId: shipment.id,
      type: 'SHIPMENT_SUBMITTED',
    });
    await pushNotification({
      recipientUserId: verifierRecipient?.id,
      recipientRole: verifierRecipient ? undefined : 'verifier',
      title: 'New shipment awaiting review',
      message: `${shipment.invoiceId} is assigned to ${shipment.verifierId || 'your verifier queue'}. Importer release target: ${shipment.importerId || 'not set'}.`,
      level: 'warning',
      route: '/app/verifier/queue',
      entityType: 'shipment',
      entityId: shipment.id,
      type: 'VERIFICATION_REQUESTED',
    });
    await sendWorkflowEmailsSafely({
      recipients: verifierRecipients.map((user) => ({ email: user.email, name: user.name })),
      subject: `Verification requested for ${shipment.invoiceId}`,
      overline: 'Verifier queue update',
      badge: 'Awaiting review',
      referenceId: shipment.invoiceId,
      title: 'New shipment awaiting verifier review',
      message: `${shipment.invoiceId} has been submitted and is ready for evidence review.`,
      route: '/app/verifier/queue',
      actionLabel: 'Open verifier queue',
      summaryItems: buildEmailSummaryItems([
        { label: 'Shipment ID', value: shipment.invoiceId },
        { label: 'Product', value: shipment.product },
        { label: 'Quantity', value: formatShipmentQuantity(shipment) },
        { label: 'Destination', value: shipment.destinationCountry },
        { label: 'Verifier ID', value: shipment.verifierId || 'Unassigned' },
        { label: 'Importer ID', value: shipment.importerId || 'Unassigned' },
        { label: 'Exporter ID', value: shipment.exporterReferenceId || getExporterReferenceId(profile, exporterRecipient) },
      ]),
      secondaryLines: [
        `Submitted by ${exporterRecipient.name}.`,
        'Open the case to review linked plots, documents, and the generated compliance package.',
        'Only approved shipments will be released into the importer workspace.',
      ],
      footerNote: 'Verifier emails are triggered when an exporter explicitly submits a shipment for review.',
    });
    if (exporterRecipient.email) {
      await sendWorkflowEmailsSafely({
        recipients: [{ email: exporterRecipient.email, name: exporterRecipient.name }],
        subject: `Shipment submitted: ${shipment.invoiceId}`,
        overline: 'Exporter submission receipt',
        badge: 'Submitted',
        referenceId: shipment.invoiceId,
        title: 'Your shipment has entered verifier review',
        message: `${shipment.invoiceId} has been submitted successfully and is now in the verifier queue.`,
        route: '/app/exporter/shipments',
        actionLabel: 'Open shipment workspace',
        summaryItems: buildEmailSummaryItems([
          { label: 'Shipment ID', value: shipment.invoiceId },
          { label: 'Product', value: shipment.product },
          { label: 'Quantity', value: formatShipmentQuantity(shipment) },
          { label: 'Destination', value: shipment.destinationCountry },
          { label: 'Verifier ID', value: shipment.verifierId || 'Unassigned' },
          { label: 'Importer ID', value: shipment.importerId || 'Unassigned' },
        ]),
        secondaryLines: [
          'The shipment is now locked into verifier review until a decision is recorded.',
          'You will receive a follow-up email when the verifier approves, rejects, or requests clarification.',
        ],
        footerNote: 'This receipt confirms that the shipment handoff left the exporter draft stage and entered verifier review.',
      });
    }
    setShipments(await fetchShipments(session.id));
    setReviews(await fetchVerificationCases());
    setNotificationFeed(await fetchNotificationsForSession(session.id, session.role));
  };

  const handleVerifierReview = async (
    shipmentId: string,
    status: 'APPROVED' | 'REJECTED' | 'CLARIFICATION_REQUESTED',
    notes: string,
  ) => {
    const shipment = resolvedShipments.find((item) => item.id === shipmentId);
    if (!consumeCredit('verifierReview', `Verifier decision / ${shipment?.invoiceId ?? shipmentId}`)) return;
    const exporterRecipient = getUserById(shipment?.ownerId);
    const importerRecipient = findUserByRoutingId(userDirectory, shipment?.importerId, 'importer');
    const importerRecipients = importerRecipient?.email ? [importerRecipient] : getUsersByRole('importer');
    let snapshotVersionLabel = '';
    let approvalEmailAttachments: WorkflowEmailAttachment[] | undefined;

    if (status === 'APPROVED') {
      if (!shipment?.ownerId) {
        showWorkspaceNotice(
          'Approval blocked',
          'This shipment is missing its exporter owner record, so approval cannot continue yet.',
        );
        return;
      }

      const approvalMoment = new Date().toISOString();
      const bundle = buildShipmentApprovalBundle(
        shipment,
        profileForShipment(shipment),
        suppliers,
        plots,
        typedDocuments,
        facilities,
        installations,
        batches,
        factors,
        extractions,
        shipment.report ?? null,
      );

      if (!bundle.validation.isValid) {
        showChecklistNotice('Approval blocked', bundle.validation.errors);
        return;
      }

      const snapshot = await createShipmentSnapshotInFirebase({
        shipmentId: shipment.id,
        ownerId: shipment.ownerId,
        approvedAt: approvalMoment,
        approvedById: session.id,
        approvedByName: session.name,
        report: bundle.report,
        ddsPayload: bundle.ddsPayload,
        tracesXml: bundle.tracesXml,
        cbamCsv: bundle.cbamCsv,
        packageJson: bundle.packageJson,
        validationErrors: bundle.validation.errors,
        validationWarnings: bundle.validation.warnings,
      });

      snapshotVersionLabel = `v${snapshot.version}`;
      approvalEmailAttachments = await buildApprovedPackageEmailAttachments(shipment, snapshot);
      await logAudit(
        shipment.ownerId,
        'APPROVAL_SNAPSHOT_CREATED',
        'shipmentSnapshot',
        snapshot.id,
        `Approval snapshot ${snapshotVersionLabel} created for ${shipment.invoiceId}.`,
        bundle.validation.warnings.length
          ? `Warnings carried into snapshot: ${bundle.validation.warnings.join(' | ')}`
          : 'No validation warnings were present.',
      );
    }

    await updateShipmentStatusInFirebase(shipmentId, status);
    await upsertVerificationCase(shipmentId, notes, status, {
      verifierId: shipment?.verifierId || getUserWorkspaceId(session),
      verifierName: shipment?.verifierName || session.name,
      importerId: shipment?.importerId,
      importerName: importerRecipient?.name ?? shipment?.importerName,
    });
    await logAudit(undefined, 'VERIFICATION_DECISION', 'shipment', shipmentId, `Shipment marked ${status}.`, notes || 'No reviewer notes provided.');

    if (shipment?.ownerId) {
      await pushNotification({
        recipientUserId: shipment.ownerId,
        title:
          status === 'APPROVED'
            ? 'Shipment approved'
            : status === 'REJECTED'
              ? 'Shipment rejected'
              : 'Clarification requested',
        message:
          status === 'APPROVED'
            ? `${shipment.invoiceId} has been approved${snapshotVersionLabel ? ` as ${snapshotVersionLabel}` : ''} and released for importer handoff.`
            : status === 'REJECTED'
              ? `${shipment.invoiceId} was rejected. Review verifier notes and resubmit.`
              : `${shipment.invoiceId} needs clarification before approval can continue.`,
        level: status === 'APPROVED' ? 'success' : 'warning',
        route: '/app/exporter/shipments',
        entityType: 'shipment',
        entityId: shipmentId,
        type: 'VERIFICATION_DECISION',
      });
      if (exporterRecipient?.email) {
        await sendWorkflowEmailsSafely({
          recipients: [{ email: exporterRecipient.email, name: exporterRecipient.name }],
          subject:
            status === 'APPROVED'
              ? `Shipment approved: ${shipment.invoiceId}`
              : status === 'REJECTED'
                ? `Shipment rejected: ${shipment.invoiceId}`
                : `Clarification requested: ${shipment.invoiceId}`,
          overline: 'Verifier decision',
          badge:
            status === 'APPROVED'
              ? 'Approved'
              : status === 'REJECTED'
                ? 'Rejected'
                : 'Clarification requested',
          referenceId: shipment.invoiceId,
          title:
            status === 'APPROVED'
              ? 'Shipment approved'
              : status === 'REJECTED'
                ? 'Shipment rejected'
                : 'Clarification requested',
          message:
            status === 'APPROVED'
              ? `${shipment.invoiceId} has been approved${snapshotVersionLabel ? ` as ${snapshotVersionLabel}` : ''} and released for importer handoff.`
              : status === 'REJECTED'
                ? `${shipment.invoiceId} has been rejected. Please review the verifier comments and resubmit.`
                : `${shipment.invoiceId} needs additional clarification before approval can continue.`,
          route: '/app/exporter/shipments',
          actionLabel:
            status === 'APPROVED'
              ? 'Open approved shipment'
              : status === 'REJECTED'
                ? 'Open shipment fixes'
                : 'Open clarification request',
          summaryItems: buildEmailSummaryItems([
            { label: 'Shipment ID', value: shipment.invoiceId },
            { label: 'Decision', value: status.replaceAll('_', ' ') },
            { label: 'Version', value: snapshotVersionLabel || 'Current working version' },
            { label: 'Destination', value: shipment.destinationCountry },
            { label: 'Importer ID', value: shipment.importerId || 'Unassigned' },
            { label: 'Verifier ID', value: shipment.verifierId || getUserWorkspaceId(session) },
          ]),
          secondaryLines: [
            ...(notes ? [`Verifier notes: ${notes}`] : []),
            status === 'APPROVED'
              ? 'The package is now available for importer handoff with the approved snapshot.'
              : status === 'REJECTED'
                ? 'Review the comments, update the linked evidence, and resubmit the shipment when it is ready.'
                : 'Update the requested fields or evidence, then send the shipment back into verifier review.',
          ],
          footerNote:
            status === 'APPROVED'
              ? 'Approval emails confirm that the shipment package passed reviewer sign-off and can move to importer release.'
              : 'Decision emails preserve the latest verifier outcome so the exporter team can act on it quickly.',
          attachments: status === 'APPROVED' ? approvalEmailAttachments : undefined,
        });
      }
    }

    if (status === 'APPROVED') {
      await pushNotification({
        recipientUserId: importerRecipient?.id,
        recipientRole: importerRecipient ? undefined : 'importer',
        title: 'Approved shipment package ready',
        message: `${shipment?.invoiceId ?? shipmentId} is now approved${snapshotVersionLabel ? ` (${snapshotVersionLabel})` : ''} for importer ${shipment?.importerId || 'download'}.`,
        level: 'success',
        route: '/app/importer/shipments',
        entityType: 'shipment',
        entityId: shipmentId,
        type: 'IMPORTER_PACKAGE_READY',
      });
      await sendWorkflowEmailsSafely({
        recipients: importerRecipients.map((user) => ({ email: user.email, name: user.name })),
        subject: `Approved shipment package ready: ${shipment?.invoiceId ?? shipmentId}${snapshotVersionLabel ? ` ${snapshotVersionLabel}` : ''}`,
        overline: 'Importer handoff',
        badge: 'Approved package ready',
        referenceId: `${shipment?.invoiceId ?? shipmentId}${snapshotVersionLabel ? ` ${snapshotVersionLabel}` : ''}`,
        title: 'Approved importer package available',
        message: `${shipment?.invoiceId ?? shipmentId} is approved${snapshotVersionLabel ? ` as ${snapshotVersionLabel}` : ''} and ready for importer download.`,
        route: '/app/importer/shipments',
        actionLabel: 'Open importer package',
        summaryItems: buildEmailSummaryItems([
          { label: 'Shipment ID', value: shipment?.invoiceId ?? shipmentId },
          { label: 'Product', value: shipment?.product ?? 'Shipment package' },
          { label: 'Quantity', value: formatShipmentQuantity(shipment) },
          { label: 'Destination', value: shipment?.destinationCountry ?? 'EU' },
          { label: 'Importer ID', value: shipment?.importerId || 'Unassigned' },
          { label: 'Exporter ID', value: shipment?.exporterReferenceId || undefined },
          { label: 'Release version', value: snapshotVersionLabel || 'Approved package' },
        ]),
        secondaryLines: [
          'The approved package includes the compliance PDF, DDS payload, package JSON, and release-ready evidence bundle.',
          shipment && requiresCbamCoverage(shipment)
            ? 'CBAM package outputs remain available alongside the importer handoff files.'
            : 'CBAM output is not required for this shipment category.',
          'Use the importer workspace to review the exporter identity, key documents, and final package downloads.',
        ],
        footerNote: 'Importer handoff emails are sent only after verifier approval creates the release snapshot.',
        attachments: approvalEmailAttachments,
      });
    }

    await refreshAll();
  };

  if (!session) {
    if (mobileSessionBooting) {
      return (
        <WebErrorBoundary>
          <div className="ct-auth-theme-shell">
            <WorkspaceLoadingState title="Opening mobile workspace" detail="Signing into CarbonTrace from the app." />
          </div>
        </WebErrorBoundary>
      );
    }
    if (route === '/pricing') {
      return (
        <WebErrorBoundary>
          <div className="ct-auth-theme-shell">
            <button className="ct-theme-toggle is-floating" type="button" onClick={toggleThemeMode}>
              {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <PricingPage />
          </div>
        </WebErrorBoundary>
      );
    }
    if (route === '/') {
      return (
        <WebErrorBoundary>
          <div className="ct-auth-theme-shell">
            <button className="ct-theme-toggle is-floating" type="button" onClick={toggleThemeMode}>
              {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <LandingPage onNavigate={(path) => navigate(path)} />
          </div>
        </WebErrorBoundary>
      );
    }
    return (
      <WebErrorBoundary>
        <div className="ct-auth-theme-shell">
          <button className="ct-theme-toggle is-floating" type="button" onClick={toggleThemeMode}>
            {themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <AuthScreen route={route === '/signup' ? '/signup' : '/login'} authRole={authRole} setAuthRole={setAuthRole} authError={authError} busy={busy} onSubmit={handleAuthSubmit} onToggleRoute={() => navigate(route === '/signup' ? '/login' : '/signup')} />
        </div>
      </WebErrorBoundary>
    );
  }

  const nav = NAV[session.role];
  const primaryNav =
    session.role === 'exporter'
      ? nav.filter((item) => EXPORTER_PRIMARY_ROUTES.includes(item.path))
      : nav;
  const secondaryNav =
    session.role === 'exporter'
      ? nav.filter((item) => !EXPORTER_PRIMARY_ROUTES.includes(item.path))
      : [];
  const activeAdvancedRoute = secondaryNav.some((item) => item.path === route);
  const visibleSecondaryNav = showMoreTools || activeAdvancedRoute;
  const workspaceOverline =
    session.role === 'exporter'
      ? 'Exporter'
      : session.role === 'verifier'
        ? 'Verifier'
        : 'Importer';
  const dashboardHeroSummary =
    session.role === 'exporter'
      ? 'Move shipments from evidence to approval.'
      : session.role === 'verifier'
        ? 'Review evidence, resolve gaps, and release approved packages.'
        : 'Access approved supplier packages and export-ready artifacts.';
  const exporterProfileReady = Boolean(
    profile?.legalEntityName &&
      profile.contactEmail &&
      profile.contactPhone &&
      profile.exportCommodities &&
      profile.destinationCountries,
  );
  const exporterHasReviewedEvidence = typedDocuments.length > 0 && extractions.some((entry) => entry.status === 'REVIEWED');
  const exporterHasVerifierReadyShipment = resolvedShipments.some(
    (shipment) =>
      ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(shipment.status) ||
      Boolean(shipment.plotIds.length && shipment.documentIds.length),
  );
  const exporterWorkflowSteps: Array<{
    label: string;
    detail: string;
    ready: boolean;
    route: Route;
    action: string;
  }> = [
    {
      label: 'Profile',
      detail: exporterProfileReady ? 'Exporter identity is ready.' : 'Complete identity, contact, commodities, and EU markets.',
      ready: exporterProfileReady,
      route: '/app/exporter/profile',
      action: exporterProfileReady ? 'Review profile' : 'Complete profile',
    },
    {
      label: 'Suppliers',
      detail: suppliers.length ? `${suppliers.length} supplier record(s) saved.` : 'Add at least one source supplier.',
      ready: suppliers.length > 0,
      route: '/app/exporter/suppliers',
      action: suppliers.length ? 'Open suppliers' : 'Add supplier',
    },
    {
      label: 'Plots & EUDR',
      detail: compliantPlotCount ? `${compliantPlotCount} compliant plot(s) ready.` : 'Map a plot and run EUDR analysis.',
      ready: compliantPlotCount > 0,
      route: '/app/exporter/plots',
      action: compliantPlotCount ? 'Open plots' : 'Run EUDR',
    },
    {
      label: 'Evidence',
      detail: exporterHasReviewedEvidence ? 'Documents have reviewed extraction.' : 'Upload documents and review extracted fields.',
      ready: exporterHasReviewedEvidence,
      route: typedDocuments.length ? '/app/exporter/extractions' : '/app/exporter/uploads',
      action: typedDocuments.length ? 'Review extraction' : 'Upload document',
    },
    {
      label: 'Shipment',
      detail: exporterHasVerifierReadyShipment ? 'A shipment is ready or already in review.' : 'Create a shipment and pass the submit checklist.',
      ready: exporterHasVerifierReadyShipment,
      route: '/app/exporter/shipments',
      action: exporterHasVerifierReadyShipment ? 'Open shipment' : 'Create shipment',
    },
  ];
  const exporterNextStep =
    exporterWorkflowSteps.find((step) => !step.ready) ??
    ({
      label: 'Reports',
      detail: 'The package can move to reports, verifier review, or importer handoff.',
      ready: true,
      route: '/app/exporter/reports' as Route,
      action: 'Open reports',
    });
  const verifierQueueCount = resolvedShipments.filter((shipment) => ['SUBMITTED', 'UNDER_REVIEW'].includes(shipment.status)).length;
  const verifierClarificationCount = resolvedShipments.filter((shipment) => shipment.status === 'CLARIFICATION_REQUESTED').length;
  const importerDocumentTotal = approvedShipments.reduce((total, shipment) => total + shipment.documentIds.length, 0);
  const dashboardRecentActivity =
    notifications[0]?.message ||
    (resolvedShipments[0]?.invoiceId ? `${resolvedShipments[0].invoiceId} updated.` : 'No recent activity yet.');
  const exporterRiskCount = resolvedShipments.filter((shipment) => shipment.report?.overall_shipment_risk && shipment.report.overall_shipment_risk !== 'LOW').length;
  const importerNextShipment = approvedShipments[0] ?? null;
  const dashboardCards =
    session.role === 'exporter'
      ? [
          dashboardCard('Next action', exporterNextStep.label, exporterNextStep.detail, exporterNextStep.action, () => navigate(exporterNextStep.route), exporterNextStep.ready ? 'good' : 'warn'),
          dashboardCard('Risk', exporterRiskCount ? `${exporterRiskCount} watch` : 'Low', exporterRiskCount ? 'Review high or medium risk packages.' : 'No major package risk in view.', 'Open reports', () => navigate('/app/exporter/reports'), exporterRiskCount ? 'warn' : 'good'),
          dashboardCard('Pending work', pendingVerifierCount + extractionBacklogCount, 'Verifier queue and extraction backlog.', 'Open shipments', () => navigate('/app/exporter/shipments'), pendingVerifierCount + extractionBacklogCount ? 'warn' : 'good'),
          dashboardCard('Recent activity', 'Live', dashboardRecentActivity, 'Audit trail', () => navigate('/app/exporter/audit'), 'neutral'),
        ]
      : session.role === 'verifier'
        ? [
            dashboardCard('Next action', verifierQueueCount ? 'Review queue' : 'No open cases', verifierQueueCount ? 'Submitted packages need decision.' : 'Load demo or wait for exporter submission.', 'Open queue', () => navigate('/app/verifier/queue'), verifierQueueCount ? 'warn' : 'good'),
            dashboardCard('Risk', verifierClarificationCount ? `${verifierClarificationCount} clarify` : 'Stable', verifierClarificationCount ? 'Exporter response needed.' : 'No clarification blockers.', 'Open queue', () => navigate('/app/verifier/queue'), verifierClarificationCount ? 'warn' : 'good'),
            dashboardCard('Pending work', verifierQueueCount, 'Cases submitted or under review.', 'Review now', () => navigate('/app/verifier/queue'), verifierQueueCount ? 'warn' : 'good'),
            dashboardCard('Recent activity', 'Live', dashboardRecentActivity, 'Open queue', () => navigate('/app/verifier/queue'), 'neutral'),
          ]
        : [
            dashboardCard('Next action', importerNextShipment ? 'Open package' : 'No package', importerNextShipment ? `${importerNextShipment.invoiceId} is ready to inspect.` : 'Approved packages appear after verifier approval.', 'Packages', () => navigate('/app/importer/shipments'), importerNextShipment ? 'good' : 'warn'),
            dashboardCard('Risk', approvedShipments.some((shipment) => shipment.report?.overall_shipment_risk !== 'LOW') ? 'Watchlist' : 'Low', 'Approved package risk view.', 'Readiness', () => navigate('/app/importer/readiness'), approvedShipments.some((shipment) => shipment.report?.overall_shipment_risk !== 'LOW') ? 'warn' : 'good'),
            dashboardCard('Pending work', approvedShipments.length, 'Approved packages available for handoff.', 'Open', () => navigate('/app/importer/shipments'), approvedShipments.length ? 'good' : 'neutral'),
            dashboardCard('Recent activity', `${importerDocumentTotal} files`, dashboardRecentActivity, 'Packages', () => navigate('/app/importer/shipments'), 'neutral'),
          ];

  return (
    <WebErrorBoundary>
    <div className="ct-shell">
      <aside className={`ct-sidebar ${mobileNavOpen ? 'is-mobile-open' : ''}`} id="ct-workspace-sidebar">
        <div className="ct-sidebar-mobile-head">
          <div className="ct-brand-block">
            <div className="ct-brand-mark" aria-hidden="true">CT</div>
            <div>
              <div className="ct-brand">CarbonTrace AI</div>
              <div className="ct-subbrand">{session.role.toUpperCase()} WORKSPACE</div>
            </div>
          </div>
          <button
            className="ct-sidebar-close"
            type="button"
            aria-label="Close workspace menu"
            onClick={() => setMobileNavOpen(false)}
          >
            Close
          </button>
        </div>
        <nav className="ct-nav">
          {primaryNav.map((item) => (
            <button key={item.path} className={`ct-nav-link ${route === item.path ? 'is-active' : ''}`} onClick={() => navigate(item.path)}>
              {item.label}
            </button>
          ))}
          {secondaryNav.length ? (
            <div className="ct-nav-more">
              <button className={`ct-nav-toggle ${visibleSecondaryNav ? 'is-open' : ''}`} type="button" onClick={() => setShowMoreTools((current) => !current)}>
                {visibleSecondaryNav ? 'Hide extra tools' : 'More tools'}
              </button>
              {visibleSecondaryNav ? (
                <div className="ct-nav-subgrid">
                  {secondaryNav.map((item) => (
                    <button key={item.path} className={`ct-nav-link is-secondary ${route === item.path ? 'is-active' : ''}`} onClick={() => navigate(item.path)}>
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </nav>
        <div className="ct-sidebar-footer">
          <div className="ct-sidebar-meta">Live workspace</div>
          <button className="ct-secondary-button" onClick={() => logoutUser()}>Sign Out</button>
        </div>
      </aside>
      <button
        className={`ct-mobile-sidebar-backdrop ${mobileNavOpen ? 'is-visible' : ''}`}
        type="button"
        aria-label="Close workspace navigation"
        onClick={() => setMobileNavOpen(false)}
      />
      <main className="ct-main">
        <header className="ct-topbar"><div className="ct-topbar-primary"><button className="ct-mobile-menu-button" type="button" aria-expanded={mobileNavOpen} aria-controls="ct-workspace-sidebar" onClick={() => setMobileNavOpen(true)}>Menu</button><div><div className="ct-page-overline">{workspaceOverline}</div><h1>{nav.find((item) => item.path === route)?.label ?? 'Workspace'}</h1></div></div><div className="ct-topbar-actions"><button className="ct-theme-toggle" type="button" onClick={toggleThemeMode}>{themeMode === 'dark' ? 'Light mode' : 'Dark mode'}</button><button className="ct-theme-toggle" type="button" onClick={() => setShowDemoWalkthrough(true)}>Demo mode</button><BillingPlanBadge billing={billingState} onOpenBilling={openBillingRoute} />{unreadNotifications ? <div className="ct-notification-chip has-unread">{unreadNotifications} unread</div> : null}<div className="ct-user-chip">{getUserWorkspaceId(session)}</div><div className="ct-user-chip">{session.name}</div></div></header>
        <WorkspaceNotice notice={workspaceNotice} onDismiss={() => setWorkspaceNotice(null)} />
        {showDemoWalkthrough ? (
          <DemoWalkthrough
            role={session.role}
            onClose={() => setShowDemoWalkthrough(false)}
            onNavigate={navigate}
            onLoadDemo={loadEnterpriseDemoPack}
            demoBusy={demoBusy}
            hasDemo={hasEnterpriseDemo}
          />
        ) : null}
        {workspaceLoading ? (
          <WorkspaceLoadingState />
        ) : (
        <Suspense fallback={<WorkspaceLoadingState title="Loading page" detail="Preparing the next workspace view." />}>
        <div className="ct-stack">
{session.role === 'exporter' && route === '/app/exporter/dashboard' && (
            <section className="ct-dashboard-simple">
              <div className="ct-dashboard-simple-head">
                <div>
                  <div className="ct-badge">EXPORTER</div>
                  <h2>{dashboardHeroSummary}</h2>
                </div>
                <div className="ct-actions">
                  <button className="ct-primary-button" onClick={() => navigate('/app/exporter/shipments')}>
                    Open shipments
                  </button>
                  <button className="ct-secondary-button" onClick={() => setShowDemoWalkthrough(true)}>
                    Demo mode
                  </button>
                </div>
              </div>
              <div className="ct-dashboard-card-grid">{dashboardCards}</div>
              <NotificationRail notifications={notifications.slice(0, 3)} onOpenNotification={openNotification} />
            </section>
          )}

          {session.role === 'exporter' && route === '/app/exporter/profile' && <ProfileWorkspace profile={profile} profileForm={profileForm} setProfileForm={setProfileForm} onSubmit={handleProfileSubmit} />}

          {session.role === 'exporter' && route === '/app/exporter/suppliers' && <SuppliersWorkspace suppliers={suppliers} supplierForm={supplierForm} setSupplierForm={setSupplierForm} products={PRODUCTS} onSubmit={handleSupplierSubmit} />}

          {session.role === 'exporter' && route === '/app/exporter/plots' && <PlotsWorkspace suppliers={suppliers} products={PRODUCTS} plots={plots} plotForm={plotForm} setPlotForm={setPlotForm} plotDraftCoordinates={plotDraftCoordinates} setPlotDraftCoordinates={setPlotDraftCoordinates} activePlot={activePlot} busy={busy} onSubmit={handlePlotSubmit} onReset={resetPlotForm} onClearBuilder={clearPlotBuilder} onUndoCoordinate={handlePlotBuilderUndo} onRemoveCoordinate={handlePlotBuilderRemove} onMoveCoordinate={handlePlotBuilderMove} onAddCoordinate={handlePlotBuilderAdd} onSelectPlot={setActivePlotId} onEditPlot={handlePlotEdit} onDownloadGeoJson={downloadPlotGeoJson} onRunAnalysis={handlePlotAnalysis} />}

          {session.role === 'exporter' && route === '/app/exporter/uploads' && <UploadsWorkspace documents={typedDocuments} extractions={extractions} docTypes={DOC_TYPES} shipments={resolvedShipments} facilities={facilities} batches={batches} onSubmit={handleUploadSubmit} onDownloadPdf={downloadDocumentPdf} />}

          {session.role === 'exporter' && route === '/app/exporter/facilities' && <FacilitiesWorkspace facilities={facilities} installations={installations} factors={factors} onSaveFacility={async (payload, id) => { if (id) await updateFacilityInFirebase(id, payload); else await saveFacilityToFirebase(session.id, payload); await logAudit(session.id, id ? 'FACILITY_UPDATED' : 'FACILITY_CREATED', 'facility', id ?? payload.name, 'Facility saved.', payload.name); await refreshAll(); }} onSaveInstallation={async (payload, id) => { if (id) await updateInstallationInFirebase(id, payload); else await saveInstallationToFirebase(session.id, payload); await logAudit(session.id, id ? 'INSTALLATION_UPDATED' : 'INSTALLATION_CREATED', 'installation', id ?? payload.name, 'Installation saved.', payload.name); await refreshAll(); }} onSaveFactor={async (payload, id) => { await updateEmissionFactorInFirebase(id, payload); await logAudit(session.id, 'FACTOR_UPDATED', 'emissionFactor', id, 'Emission factor updated.', `${payload.name} / ${payload.factorKgCO2e}`); await refreshAll(); }} />}

          {session.role === 'exporter' && route === '/app/exporter/production' && <ProductionWorkspace facilities={facilities} installations={installations} shipments={resolvedShipments} documents={typedDocuments} batches={batches} onSaveBatch={async (payload, id) => { if (id) await updateProductionBatchInFirebase(id, payload); else await saveProductionBatchToFirebase(session.id, payload); await logAudit(session.id, id ? 'BATCH_UPDATED' : 'BATCH_CREATED', 'productionBatch', id ?? payload.batchCode, 'Production batch saved.', `${payload.batchCode} / ${payload.product}`); await refreshAll(); }} />}

          {session.role === 'exporter' && route === '/app/exporter/extractions' && <ExtractionWorkspace documents={typedDocuments} extractions={extractions} onDownloadPdf={downloadDocumentPdf} onRunExtraction={async (document) => { if (!consumeCredit('ocr', `OCR extraction / ${document.fileName}`)) return; const { extractDocumentIntelligence } = await loadDocumentIntelligence(); const extracted = await extractDocumentIntelligence(document); await upsertExtractionRecord(session.id, document.id, extracted); await updateDocumentInFirebase(document.id, { ocrStatus: 'EXTRACTED', documentType: extracted.detectedDocumentType || document.documentType }); await logAudit(session.id, 'DOCUMENT_EXTRACTED', 'document', document.id, 'Structured extraction generated.', document.fileName); await refreshAll(); }} onReviewExtraction={async (documentId, fields, notes) => { const document = typedDocuments.find((item) => item.id === documentId); if (!document) return; const existingExtraction = extractions.find((item) => item.documentId === documentId); const fallbackExtraction = deriveExtractionFromDocument(document); const reviewedFields = Object.keys(fields).length ? fields : existingExtraction && Object.keys(existingExtraction.extractedFields).length ? existingExtraction.extractedFields : fallbackExtraction.extractedFields; const extracted = existingExtraction ? { ...existingExtraction, status: 'REVIEWED' as const, extractedFields: reviewedFields, reviewerNotes: notes, confidence: Math.max(existingExtraction.confidence, 0.94), reviewRequired: false } : { ...fallbackExtraction, status: 'REVIEWED' as const, extractedFields: reviewedFields, reviewerNotes: notes, confidence: 0.94, reviewRequired: false }; await upsertExtractionRecord(session.id, documentId, { status: extracted.status, rawText: extracted.rawText, extractedFields: extracted.extractedFields, fieldConfidences: extracted.fieldConfidences, reviewerNotes: extracted.reviewerNotes, confidence: extracted.confidence, provider: extracted.provider, providerModel: extracted.providerModel, detectedDocumentType: extracted.detectedDocumentType, warnings: extracted.warnings, reviewRequired: extracted.reviewRequired, pageCount: extracted.pageCount, sourceMimeType: extracted.sourceMimeType }); await updateDocumentInFirebase(documentId, { ocrStatus: 'REVIEWED', documentType: extracted.detectedDocumentType || document.documentType }); await logAudit(session.id, 'EXTRACTION_REVIEWED', 'document', documentId, 'Extraction reviewed and confirmed.', document.fileName); await refreshAll(); }} />}

          {session.role === 'exporter' && route === '/app/exporter/shipments' && <ShipmentsWorkspace shipmentForm={shipmentForm} setShipmentForm={setShipmentForm} suppliers={suppliers} plots={plots} documents={typedDocuments} extractions={extractions} facilities={facilities} installations={installations} batches={batches} shipments={resolvedShipments} activeShipment={activeShipment} exporterReferenceId={getExporterReferenceId(profile, session)} verifierOptions={getUsersByRole('verifier')} importerOptions={getUsersByRole('importer')} euCountries={EU} products={PRODUCTS} onSubmit={handleShipmentSubmit} onReset={resetShipmentForm} onOpenShipment={setActiveShipmentId} onEditShipment={handleShipmentEdit} onOpenWorkspace={navigate} getReadiness={(shipment) => getShipmentReadiness(shipment, plots, typedDocuments, installations, batches, extractions)} onSubmitForVerification={handleShipmentVerificationSubmit} onDownloadJson={downloadShipmentJson} onDownloadXml={downloadShipmentXml} onDownloadPackage={downloadShipmentPackage} onDownloadPdf={downloadShipmentPdf} onDownloadDds={downloadShipmentDds} onDownloadCbamCsv={downloadShipmentCbamCsv} onDownloadPlotGeoJson={downloadPlotGeoJson} />}

          {session.role === 'exporter' && route === '/app/exporter/reports' && <ReportCenterWorkspace shipments={resolvedShipments} approvedCount={approvedShipments.length} onDownloadPdf={downloadShipmentPdf} onDownloadJson={downloadShipmentJson} onDownloadXml={downloadShipmentXml} onDownloadPackage={downloadShipmentPackage} onDownloadDds={downloadShipmentDds} onDownloadCbamCsv={downloadShipmentCbamCsv} />}

          {session.role === 'exporter' && route === '/app/exporter/audit' && <AuditTrailWorkspace auditLogs={auditLogs} shipments={resolvedShipments} documents={typedDocuments} extractions={extractions} />}

          {session.role === 'exporter' && route === '/app/exporter/integrations' && <IntegrationOpsWorkspace shipments={resolvedShipments} documents={typedDocuments} extractions={extractions} onDownloadTemplate={downloadFile} onDownloadJson={downloadShipmentJson} onDownloadXml={downloadShipmentXml} onDownloadPackage={downloadShipmentPackage} onDownloadDds={downloadShipmentDds} onDownloadCbamCsv={downloadShipmentCbamCsv} />}

          {session.role === 'exporter' && route === '/app/exporter/help' && <HelpCenterWorkspace onDownloadTemplate={downloadFile} />}

          {session.role === 'exporter' && route === '/app/exporter/billing' && <BillingWorkspace role={session.role} accountName={session.name} billing={billingState} onChangeBilling={changeBillingState} />}

{session.role === 'verifier' && route === '/app/verifier/dashboard' && (
            <section className="ct-dashboard-simple">
              <div className="ct-dashboard-simple-head">
                <div>
                  <div className="ct-badge">VERIFIER</div>
                  <h2>Review queue</h2>
                </div>
                <div className="ct-actions">
                  <button className="ct-primary-button" onClick={() => navigate('/app/verifier/queue')}>
                    Open queue
                  </button>
                  <button className="ct-secondary-button" onClick={() => setShowDemoWalkthrough(true)}>
                    Demo mode
                  </button>
                </div>
              </div>
              <div className="ct-dashboard-card-grid">{dashboardCards}</div>
              <NotificationRail notifications={notifications.slice(0, 3)} onOpenNotification={openNotification} />
            </section>
          )}
          {session.role === 'verifier' && route === '/app/verifier/queue' && <VerifierQueueWorkspace shipments={resolvedShipments} reviews={reviews} suppliers={suppliers} plots={plots} documents={typedDocuments} installations={installations} batches={batches} extractions={extractions} auditLogs={auditLogs} initialShipmentId={activeShipmentId} onDownloadJson={downloadShipmentJson} onDownloadXml={downloadShipmentXml} onDownloadPackage={downloadShipmentPackage} onDownloadPdf={downloadShipmentPdf} onDownloadDds={downloadShipmentDds} onDownloadCbamCsv={downloadShipmentCbamCsv} onReview={handleVerifierReview} />}

          {session.role === 'verifier' && route === '/app/verifier/billing' && <BillingWorkspace role={session.role} accountName={session.name} billing={billingState} onChangeBilling={changeBillingState} />}


          {session.role === 'importer' && route === '/app/importer/dashboard' && (
            <section className="ct-dashboard-simple">
              <div className="ct-dashboard-simple-head">
                <div>
                  <div className="ct-badge">IMPORTER</div>
                  <h2>Approved packages</h2>
                </div>
                <div className="ct-actions">
                  <button className="ct-primary-button" onClick={() => navigate('/app/importer/shipments')}>
                    Open packages
                  </button>
                  <button className="ct-secondary-button" onClick={() => setShowDemoWalkthrough(true)}>
                    Demo mode
                  </button>
                </div>
              </div>
              <div className="ct-dashboard-card-grid">{dashboardCards}</div>
              <NotificationRail notifications={notifications.slice(0, 3)} onOpenNotification={openNotification} />
            </section>
          )}
          {session.role === 'importer' && route === '/app/importer/readiness' && <ImporterReadinessWorkspace shipments={approvedShipments} documents={typedDocuments} batches={batches} extractions={extractions} companyProfiles={companyProfiles} onOpenShipment={(shipmentId) => { setActiveShipmentId(shipmentId); navigate('/app/importer/shipments'); }} />}
          {session.role === 'importer' && route === '/app/importer/shipments' && <div className="ct-stack"><ImporterPackagesWorkspace shipments={approvedShipments} companyProfiles={companyProfiles} documents={typedDocuments} extractions={extractions} activeShipmentId={activeShipmentId} onOpenShipment={setActiveShipmentId} onDownloadPdf={downloadShipmentPdf} onDownloadJson={downloadShipmentJson} onDownloadXml={downloadShipmentXml} onDownloadPackage={downloadShipmentPackage} /><ImporterShipmentWorkspace shipment={activeShipment} companyProfiles={companyProfiles} plots={plots} documents={typedDocuments} facilities={facilities} installations={installations} batches={batches} extractions={extractions} auditLogs={auditLogs} onDownloadJson={downloadShipmentJson} onDownloadXml={downloadShipmentXml} onDownloadPackage={downloadShipmentPackage} onDownloadPdf={downloadShipmentPdf} onDownloadDds={downloadShipmentDds} onDownloadCbamCsv={downloadShipmentCbamCsv} onDownloadGeoJson={downloadPlotGeoJson} onDownloadDocumentPdf={downloadDocumentPdf} /></div>}
          {session.role === 'importer' && route === '/app/importer/billing' && <BillingWorkspace role={session.role} accountName={session.name} billing={billingState} onChangeBilling={changeBillingState} />}
        </div>
        </Suspense>
        )}
      </main>
    </div>
    </WebErrorBoundary>
  );
};

export default App;


