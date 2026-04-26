import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { jsPDF } from 'jspdf';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'your_firebase_web_api_key',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  databaseURL:
    process.env.VITE_FIREBASE_DATABASE_URL ||
    'https://your-project-default-rtdb.firebaseio.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket:
    process.env.VITE_FIREBASE_STORAGE_BUCKET || 'your-project.firebasestorage.app',
  messagingSenderId:
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'your_messaging_sender_id',
  appId:
    process.env.VITE_FIREBASE_APP_ID ||
    'your_firebase_app_id',
};

const recipientEmail = process.env.LIVE_TEST_RECIPIENT || 'pincu7706@gmail.com';
const appBaseUrl = process.env.VITE_APP_BASE_URL || 'https://acere4345.web.app';
const functionsRegion = process.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';
const tempEmail = `carbontrace-live-test-${Date.now()}@example.com`;
const tempPassword = 'CarbonTrace!2026';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app, functionsRegion);
const sendWorkflowEmail = httpsCallable(functions, 'sendWorkflowEmail');

let createdUser = null;

const textToBase64 = (value) => Buffer.from(value, 'utf8').toString('base64');

const buildSamplePdfBase64 = () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFillColor(20, 35, 56);
  doc.rect(0, 0, 595, 96, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('Compliance Package Summary', 40, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Sample approved package generated for live email verification.', 40, 68);
  doc.setTextColor(20, 35, 56);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Shipment ID', 40, 142);
  doc.setFont('helvetica', 'normal');
  doc.text('CT-EUDR-2026-041', 180, 142);
  doc.setFont('helvetica', 'bold');
  doc.text('Exporter', 40, 176);
  doc.setFont('helvetica', 'normal');
  doc.text('Malnad CarbonTrace Exports Pvt Ltd', 180, 176);
  doc.setFont('helvetica', 'bold');
  doc.text('Importer', 40, 210);
  doc.setFont('helvetica', 'normal');
  doc.text('NorthSea Roasters BV', 180, 210);
  doc.setFont('helvetica', 'bold');
  doc.text('Status', 40, 244);
  doc.setFont('helvetica', 'normal');
  doc.text('Approved / Importer package ready', 180, 244);
  doc.setFontSize(11);
  doc.text('This PDF is attached by the live workflow email test to validate shipment package delivery.', 40, 308, {
    maxWidth: 500,
  });
  return Buffer.from(doc.output('arraybuffer')).toString('base64');
};

const sampleDdsPayload = {
  operator: {
    legalEntityName: 'Malnad CarbonTrace Exports Pvt Ltd',
    address: '214 Export District, Bengaluru, Karnataka, India',
    eori: 'INMCTEUDRCBA',
    contactName: 'Prince',
    contactEmail: 'pincu7706@gmail.com',
  },
  shipment: {
    invoiceId: 'CT-EUDR-2026-041',
    hsCode: '090111',
    product: 'Coffee Arabica Beans',
    quantity: '18.5',
    unit: 't',
    destinationCountry: 'Germany',
  },
  suppliers: [
    {
      name: 'Malnad Highlands Farmer Producer Company',
      type: 'Farmer Group',
      country: 'India',
      region: 'Chikkamagaluru, Karnataka',
      commodity: 'Coffee',
    },
  ],
  plots: [
    {
      id: 'plot-alpha',
      name: 'Plot Alpha / Hassan Cluster',
      commodity: 'Coffee',
      countryOfProduction: 'India',
      areaHectares: '4.8',
      geojson: '{\"type\":\"Polygon\",\"coordinates\":[[[76.1,13.0],[76.2,13.0],[76.2,13.1],[76.1,13.1],[76.1,13.0]]]}',
      coordinates: [[13.0, 76.1]],
      analysis: { status: 'COMPLIANT', forest_loss_m2: 0 },
    },
  ],
};

const sampleTracesXml = `<?xml version="1.0" encoding="UTF-8"?>
<CarbonTracePackage>
  <ShipmentId>CT-EUDR-2026-041</ShipmentId>
  <Product>Coffee Arabica Beans</Product>
  <DestinationCountry>Germany</DestinationCountry>
  <VerifierDecision>APPROVED</VerifierDecision>
</CarbonTracePackage>`;

const sampleCbamCsv = `shipment_id,product,reported_emissions_tCO2,status
CT-EUDR-2026-041,Coffee Arabica Beans,0,NOT_APPLICABLE`;

const samplePackageJson = JSON.stringify(
  {
    shipmentId: 'CT-EUDR-2026-041',
    status: 'APPROVED',
    files: ['pdf', 'dds', 'tracesXml', 'cbamCsv'],
    generatedAt: new Date().toISOString(),
  },
  null,
  2,
);

try {
  const credential = await createUserWithEmailAndPassword(auth, tempEmail, tempPassword);
  createdUser = credential.user;

  const response = await sendWorkflowEmail({
    to: [{ email: recipientEmail, name: 'Pincu' }],
    subject: 'Approved shipment package ready: CT-EUDR-2026-041 v1',
    overline: 'Importer handoff',
    badge: 'Approved package ready',
    referenceId: 'CT-EUDR-2026-041 v1',
    title: 'Approved importer package available',
    message:
      'CT-EUDR-2026-041 is approved and ready for importer download. This live test validates the upgraded enterprise email layout and attachment delivery.',
    route: '/app/importer/shipments',
    actionLabel: 'Open importer package',
    summaryItems: [
      { label: 'Shipment ID', value: 'CT-EUDR-2026-041' },
      { label: 'Product', value: 'Coffee Arabica Beans' },
      { label: 'Quantity', value: '18.5 t' },
      { label: 'Destination', value: 'Germany' },
      { label: 'Importer ID', value: 'IMP-NSRBV' },
      { label: 'Exporter ID', value: '29AAECM2026K' },
      { label: 'Release version', value: 'v1' },
    ],
    secondaryLines: [
      'The attached PDF, DDS payload, TRACES XML, CBAM CSV, and package JSON simulate the real approval handoff package.',
      `Triggered at ${new Date().toISOString()}`,
      `Authenticated actor: ${createdUser.email}`,
    ],
    footerNote: 'This is a live verification email from the deployed CarbonTrace AI workflow sender.',
    attachments: [
      {
        fileName: 'CT-EUDR-2026-041-v1-compliance-report.pdf',
        contentBase64: buildSamplePdfBase64(),
        contentType: 'application/pdf',
      },
      {
        fileName: 'CT-EUDR-2026-041-v1-dds.json',
        contentBase64: textToBase64(JSON.stringify(sampleDdsPayload, null, 2)),
        contentType: 'application/json',
      },
      {
        fileName: 'CT-EUDR-2026-041-v1-traces.xml',
        contentBase64: textToBase64(sampleTracesXml),
        contentType: 'application/xml',
      },
      {
        fileName: 'CT-EUDR-2026-041-v1-cbam.csv',
        contentBase64: textToBase64(sampleCbamCsv),
        contentType: 'text/csv',
      },
      {
        fileName: 'CT-EUDR-2026-041-v1-package.json',
        contentBase64: textToBase64(samplePackageJson),
        contentType: 'application/json',
      },
    ],
    appBaseUrl,
  });

  console.log(JSON.stringify(response.data, null, 2));
} catch (error) {
  console.error(
    JSON.stringify(
      {
        code: error?.code,
        message: error?.message,
        details: error?.details,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  try {
    if (auth.currentUser) {
      await deleteUser(auth.currentUser);
    }
  } catch (cleanupError) {
    console.error(
      JSON.stringify(
        {
          cleanup: 'deleteUser_failed',
          message: cleanupError?.message,
        },
        null,
        2,
      ),
    );
  }

  try {
    await signOut(auth);
  } catch {
    // ignore sign-out cleanup errors
  }
}
