import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

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

const appBaseUrl = process.env.VITE_APP_BASE_URL || 'https://acere4345.web.app';
const backendBaseUrl =
  process.env.VITE_GEE_API_URL ||
  'https://carbontrace-gee-backend-450480666281.asia-south1.run.app';
const functionsRegion = process.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';
const emailRecipient = process.env.LIVE_TEST_RECIPIENT || 'pincu7706@gmail.com';
const password = 'CarbonTrace!2026';
const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, functionsRegion);
const sendWorkflowEmail = httpsCallable(functions, 'sendWorkflowEmail');

const results = [];
const qaUsers = [];

const logResult = (step, status, details = '') => {
  results.push({ step, status, details });
};

const nowIso = () => new Date().toISOString();

const qaPolygonCoordinates = [
  { lat: 12.987, lng: 77.123 },
  { lat: 12.987, lng: 77.124 },
  { lat: 12.988, lng: 77.124 },
  { lat: 12.988, lng: 77.123 },
  { lat: 12.987, lng: 77.123 },
];

const createQaUser = async (role) => {
  const email = `qa-${role}-${runId}@example.com`;
  const name = `QA ${role[0].toUpperCase()}${role.slice(1)} ${runId}`;
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db, 'users', credential.user.uid), {
    name,
    role,
    email,
    createdAt: nowIso(),
  });

  qaUsers.push({ email, password, role, name, uid: credential.user.uid });
  await signOut(auth);

  return qaUsers.at(-1);
};

const login = async (user) => {
  await signInWithEmailAndPassword(auth, user.email, user.password);
};

const createExporterFlow = async (exporter) => {
  await login(exporter);

  await setDoc(doc(db, 'companyProfiles', exporter.uid), {
    ownerId: exporter.uid,
    legalEntityName: `QA Exports ${runId}`,
    tradeName: `QA Trade ${runId}`,
    gst: `GST-${runId}`,
    udyam: `UDYAM-${runId}`,
    eori: `EORI-${runId}`,
    registeredAddress: 'Bengaluru, Karnataka, India',
    contactName: exporter.name,
    contactEmail: exporter.email,
    contactPhone: '+91-9999999999',
    exportCommodities: 'coffee',
    destinationCountries: 'Germany',
    updatedAt: nowIso(),
  });
  logResult('Exporter company profile', 'passed', exporter.uid);

  const supplierRef = await addDoc(collection(db, 'suppliers'), {
    ownerId: exporter.uid,
    name: `QA Supplier ${runId}`,
    type: 'farmer_group',
    commodity: 'coffee',
    country: 'India',
    region: 'Karnataka',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  logResult('Exporter supplier create', 'passed', supplierRef.id);

  const analyzeResponse = await fetch(`${backendBaseUrl.replace(/\/$/, '')}/api/analyze-geometry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coordinates: [
        [
          [77.123, 12.987],
          [77.124, 12.987],
          [77.124, 12.988],
          [77.123, 12.988],
          [77.123, 12.987],
        ],
      ],
      areaHectares: '1.2',
    }),
  });
  const analysis = await analyzeResponse.json();
  if (!analyzeResponse.ok) throw new Error(`EUDR backend failed: ${JSON.stringify(analysis)}`);
  logResult('Exporter EUDR analysis', 'passed', JSON.stringify(analysis));

  const plotRef = await addDoc(collection(db, 'plots'), {
    ownerId: exporter.uid,
    name: `QA Plot ${runId}`,
    supplierId: supplierRef.id,
    commodity: 'coffee',
    countryOfProduction: 'India',
    geometryType: 'polygon',
    coordinates: qaPolygonCoordinates,
    geojsonText: JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [77.123, 12.987],
          [77.124, 12.987],
          [77.124, 12.988],
          [77.123, 12.988],
          [77.123, 12.987],
        ],
      ],
    }),
    areaHectares: '1.2',
    analysis: {
      status: analysis.status,
      deforested_area_m2: Number(analysis.deforested_area_m2 ?? 0),
      satellite_source: analysis.satellite_source ?? 'Sentinel-2 L2A',
      analysis_timestamp: nowIso(),
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  logResult('Exporter plot create', 'passed', plotRef.id);

  const documentPath = `documents/${exporter.uid}/${runId}-qa-upload.txt`;
  const storageRef = ref(storage, documentPath);
  const qaBlob = new Blob([`CarbonTrace QA upload ${runId}`], { type: 'text/plain' });
  await uploadBytes(storageRef, qaBlob);
  const previewUrl = await getDownloadURL(storageRef);
  logResult('Exporter storage upload', 'passed', documentPath);

  const documentRef = await addDoc(collection(db, 'documents'), {
    ownerId: exporter.uid,
    fileName: `${runId}-qa-upload.txt`,
    documentType: 'Supplier Declaration',
    notes: 'QA upload',
    linkedShipmentId: '',
    linkedFacilityId: '',
    linkedBatchId: '',
    previewUrl,
    ocrStatus: 'REVIEWED',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  logResult('Exporter document metadata create', 'passed', documentRef.id);

  const extractionRef = await addDoc(collection(db, 'extractions'), {
    ownerId: exporter.uid,
    documentId: documentRef.id,
    status: 'REVIEWED',
    rawText: `CarbonTrace QA upload ${runId}`,
    extractedFields: { invoiceNumber: `QA-${runId}`, commodity: 'coffee' },
    reviewerNotes: 'QA reviewed',
    confidence: 0.96,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  logResult('Exporter extraction record', 'passed', extractionRef.id);

  const facilityRef = await addDoc(collection(db, 'facilities'), {
    ownerId: exporter.uid,
    name: `QA Facility ${runId}`,
    address: 'Peenya Industrial Area',
    country: 'India',
    region: 'Karnataka',
    productLines: ['coffee'],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  const installationRef = await addDoc(collection(db, 'installations'), {
    ownerId: exporter.uid,
    facilityId: facilityRef.id,
    name: `QA Installation ${runId}`,
    processType: 'Roasting',
    fuelTypes: ['diesel'],
    electricitySource: 'grid',
    coveredProducts: ['coffee'],
    annualCapacity: '1000',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  logResult('Exporter facilities/installations', 'passed', `${facilityRef.id} / ${installationRef.id}`);

  const shipmentInvoiceId = `QA-INV-${runId}`;
  const shipmentRef = await addDoc(collection(db, 'shipments'), {
    ownerId: exporter.uid,
    invoiceId: shipmentInvoiceId,
    product: 'Coffee beans',
    productCategory: 'coffee',
    hsCode: '090111',
    destinationCountry: 'Germany',
    quantity: '1000',
    unit: 'kg',
    supplierIds: [supplierRef.id],
    plotIds: [plotRef.id],
    documentIds: [documentRef.id],
    facilityIds: [facilityRef.id],
    installationIds: [installationRef.id],
    batchIds: [],
    energyNotes: 'QA batch notes',
    additionalNotes: 'QA shipment',
    status: 'DRAFT',
    report: {
      invoice_id: shipmentInvoiceId,
      product_category: 'coffee',
      destination_eu_country: 'Germany',
      cbam: {
        status: 'NOT_APPLICABLE',
        reported_emissions_tCO2: null,
        default_value_triggered: false,
        non_compliance_reasons: [],
        scope1_tCO2: 0,
        scope2_tCO2: 0,
        installation_count: 1,
        evidence_document_count: 1,
      },
      eudr: {
        status: analysis.status === 'COMPLIANT' ? 'COMPLIANT' : 'NON_COMPLIANT',
        geolocation_provided: true,
        deforestation_cutoff_verified: analysis.status === 'COMPLIANT',
        non_compliance_reasons: analysis.status === 'COMPLIANT' ? [] : ['Forest loss detected'],
        dds_ready: true,
        plot_count: 1,
      },
      overall_shipment_risk: analysis.status === 'COMPLIANT' ? 'LOW' : 'HIGH',
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  logResult('Exporter shipment create', 'passed', shipmentRef.id);

  const batchRef = await addDoc(collection(db, 'productionBatches'), {
    ownerId: exporter.uid,
    shipmentId: shipmentRef.id,
    facilityId: facilityRef.id,
    installationId: installationRef.id,
    batchCode: `QA-BATCH-${runId}`,
    product: 'Coffee beans',
    quantity: '1000',
    unit: 'kg',
    fuelType: 'diesel',
    fuelAmount: '25',
    fuelUnit: 'litre',
    electricityKwh: '120',
    documentIds: [documentRef.id],
    notes: 'QA production batch',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  logResult('Exporter production batch create', 'passed', batchRef.id);

  await updateDoc(doc(db, 'shipments', shipmentRef.id), {
    batchIds: [batchRef.id],
    status: 'SUBMITTED',
    updatedAt: nowIso(),
  });
  logResult('Exporter shipment submit', 'passed', shipmentRef.id);

  const verificationRef = await addDoc(collection(db, 'verificationCases'), {
    shipmentId: shipmentRef.id,
    reviewerNotes: '',
    decision: '',
    updatedAt: nowIso(),
  });
  logResult('Verification case create', 'passed', verificationRef.id);

  const mailResponse = await sendWorkflowEmail({
    to: [{ email: emailRecipient, name: 'Pincu' }],
    subject: `CarbonTrace QA exporter flow ${runId}`,
    title: 'Phase 3 live QA email',
    message: `Exporter workflow reached live email validation for shipment ${shipmentInvoiceId}.`,
    route: '/app/exporter/shipments',
    secondaryLines: [
      `Run ID: ${runId}`,
      `Shipment ID: ${shipmentRef.id}`,
      `Exporter: ${exporter.email}`,
    ],
    appBaseUrl,
  });
  logResult('Email function call', 'passed', JSON.stringify(mailResponse.data));

  await signOut(auth);

  return {
    exporter,
    supplierId: supplierRef.id,
    plotId: plotRef.id,
    documentId: documentRef.id,
    extractionId: extractionRef.id,
    facilityId: facilityRef.id,
    installationId: installationRef.id,
    batchId: batchRef.id,
    shipmentId: shipmentRef.id,
    verificationId: verificationRef.id,
    previewUrl,
  };
};

const verifierFlow = async (verifier, shipmentId) => {
  await login(verifier);

  const shipmentSnap = await getDocs(query(collection(db, 'shipments'), where('__name__', '==', shipmentId)));
  if (shipmentSnap.empty) throw new Error('Verifier could not read shipment.');
  const shipment = { id: shipmentSnap.docs[0].id, ...shipmentSnap.docs[0].data() };
  logResult('Verifier shipment read', 'passed', shipmentId);

  const snapshotRef = await addDoc(collection(db, 'shipmentSnapshots'), {
    shipmentId,
    ownerId: shipment.ownerId,
    version: 1,
    approvedAt: nowIso(),
    approvedById: verifier.uid,
    approvedByName: verifier.name,
    report: shipment.report,
    ddsPayload: {
      operator: {
        legalEntityName: `QA Exports ${runId}`,
        address: 'Bengaluru, Karnataka, India',
        eori: `EORI-${runId}`,
        contactName: verifier.name,
        contactEmail: verifier.email,
      },
      shipment: {
        invoiceId: shipment.invoiceId,
        hsCode: shipment.hsCode,
        product: shipment.product,
        quantity: shipment.quantity,
        unit: shipment.unit,
        destinationCountry: shipment.destinationCountry,
      },
      suppliers: [
        {
          name: `QA Supplier ${runId}`,
          type: 'farmer_group',
          country: 'India',
          region: 'Karnataka',
          commodity: 'coffee',
        },
      ],
      plots: [
        {
          id: shipment.plotIds[0],
          name: `QA Plot ${runId}`,
          commodity: 'coffee',
          countryOfProduction: 'India',
          areaHectares: '1.2',
          geojson: JSON.stringify({
            type: 'Polygon',
            coordinates: [
              [
                [77.123, 12.987],
                [77.124, 12.987],
                [77.124, 12.988],
                [77.123, 12.988],
                [77.123, 12.987],
              ],
            ],
          }),
          coordinates: qaPolygonCoordinates,
          analysis: {
            status: 'COMPLIANT',
            deforested_area_m2: 0,
            satellite_source: 'Sentinel-2 L2A',
            analysis_timestamp: nowIso(),
          },
        },
      ],
    },
    tracesXml: `<?xml version="1.0" encoding="UTF-8"?><TRACESDueDiligenceStatement><Shipment><InvoiceID>${shipment.invoiceId}</InvoiceID></Shipment></TRACESDueDiligenceStatement>`,
    cbamCsv: `"Invoice ID","${shipment.invoiceId}"\n"Product","${shipment.product}"`,
    packageJson: JSON.stringify({ shipmentId, invoiceId: shipment.invoiceId, snapshotVersion: 1 }, null, 2),
    validationErrors: [],
    validationWarnings: ['QA smoke test snapshot'],
    createdAt: nowIso(),
  });
  logResult('Verifier approval snapshot create', 'passed', snapshotRef.id);

  await updateDoc(doc(db, 'shipments', shipmentId), {
    status: 'APPROVED',
    updatedAt: nowIso(),
  });

  const caseSnap = await getDocs(query(collection(db, 'verificationCases'), where('shipmentId', '==', shipmentId)));
  if (caseSnap.empty) throw new Error('Verifier could not read verification case.');
  await updateDoc(doc(db, 'verificationCases', caseSnap.docs[0].id), {
    reviewerNotes: 'QA verifier approval',
    decision: 'APPROVED',
    updatedAt: nowIso(),
  });
  logResult('Verifier approval flow', 'passed', caseSnap.docs[0].id);

  await signOut(auth);
};

const importerFlow = async (importer, context) => {
  await login(importer);

  const approvedSnap = await getDocs(collection(db, 'shipments'));
  const approvedShipment = approvedSnap.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .find((item) => item.id === context.shipmentId && item.status === 'APPROVED');
  if (!approvedShipment) throw new Error('Importer could not see approved shipment.');
  logResult('Importer approved shipment read', 'passed', context.shipmentId);

  const snapshotSnap = await getDocs(query(collection(db, 'shipmentSnapshots'), where('shipmentId', '==', context.shipmentId)));
  if (snapshotSnap.empty) throw new Error('Importer could not read approval snapshot.');
  const snapshot = snapshotSnap.docs[0].data();
  if (!snapshot.packageJson || !String(snapshot.packageJson).includes(context.shipmentId)) {
    throw new Error('Importer approval snapshot payload is incomplete.');
  }
  logResult('Importer approval snapshot read', 'passed', snapshotSnap.docs[0].id);

  const docsSnap = await getDocs(collection(db, 'documents'));
  const qaDocument = docsSnap.docs.map((item) => ({ id: item.id, ...item.data() })).find((item) => item.id === context.documentId);
  if (!qaDocument?.previewUrl) throw new Error('Importer could not see uploaded document metadata.');
  logResult('Importer document metadata read', 'passed', qaDocument.previewUrl);

  const previewResponse = await fetch(qaDocument.previewUrl, { method: 'GET' });
  if (!previewResponse.ok) throw new Error(`Importer preview URL failed with ${previewResponse.status}`);
  const previewText = await previewResponse.text();
  if (!previewText.includes('CarbonTrace QA upload')) throw new Error('Importer downloaded unexpected file content.');
  logResult('Importer file download', 'passed', qaDocument.fileName);

  await signOut(auth);
};

const cleanupAuthUsers = async () => {
  for (const user of qaUsers) {
    try {
      await signInWithEmailAndPassword(auth, user.email, user.password);
      if (auth.currentUser) await deleteUser(auth.currentUser);
      logResult(`Cleanup auth user ${user.role}`, 'passed', user.email);
    } catch (error) {
      logResult(`Cleanup auth user ${user.role}`, 'warning', error?.message || String(error));
    } finally {
      try {
        await signOut(auth);
      } catch {
        // ignore cleanup sign-out failures
      }
    }
  }
};

try {
  const exporter = await createQaUser('exporter');
  logResult('Create exporter user', 'passed', exporter.email);

  const verifier = await createQaUser('verifier');
  logResult('Create verifier user', 'passed', verifier.email);

  const importer = await createQaUser('importer');
  logResult('Create importer user', 'passed', importer.email);

  const context = await createExporterFlow(exporter);
  await verifierFlow(verifier, context.shipmentId);
  await importerFlow(importer, context);
  logResult('Phase 3 live QA overall', 'passed', `Run ${runId}`);
} catch (error) {
  logResult('Phase 3 live QA overall', 'failed', error?.message || String(error));
  process.exitCode = 1;
} finally {
  await cleanupAuthUsers();
  console.log(JSON.stringify(results, null, 2));
}
