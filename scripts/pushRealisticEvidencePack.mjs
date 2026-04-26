import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const PROJECT_ID = 'acere4345';
const BUCKET = 'acere4345.firebasestorage.app';
const EMAIL = process.env.CARBONTRACE_TARGET_EMAIL || 'pincu7706@gmail.com';
const TOKEN = process.env.GCLOUD_ACCESS_TOKEN;
const ROOT = process.cwd();
const PACK_DIR = path.join(ROOT, 'sample-evidence-pack', 'realistic');
const PDF_DIR = path.join(PACK_DIR, 'pdf');

if (!TOKEN) {
  throw new Error('GCLOUD_ACCESS_TOKEN is required. Set it with: $env:GCLOUD_ACCESS_TOKEN = (gcloud auth print-access-token).Trim()');
}

const firestoreBase = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const firestoreHeaders = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

const evidenceSpecs = [
  {
    fileName: '01-msedcl-electricity-bill.pdf',
    documentType: 'Electricity Bill',
    notes: 'Realistic MSEDCL electricity bill for CBAM scope 2 allocation. Linked to steel batch SB-2026-117-A.',
    family: 'steel',
  },
  {
    fileName: '02-bpcl-diesel-tax-invoice.pdf',
    documentType: 'Fuel Invoice',
    notes: 'Realistic diesel tax invoice for CBAM scope 1 activity data. Linked to steel batch SB-2026-117-A.',
    family: 'steel',
  },
  {
    fileName: '03-commercial-invoice-coffee-export.pdf',
    documentType: 'Shipment Document',
    notes: 'Realistic coffee export commercial invoice for EUDR shipment CT-EUDR-2026-041.',
    family: 'coffee',
  },
  {
    fileName: '04-eu-purchase-order.pdf',
    documentType: 'Purchase Order',
    notes: 'Realistic EU importer purchase order for coffee shipment CT-EUDR-2026-041.',
    family: 'coffee',
  },
  {
    fileName: '05-supplier-origin-declaration.pdf',
    documentType: 'Supplier Declaration',
    notes: 'Realistic EUDR supplier origin and no-deforestation declaration for Hassan Cluster 42/7A.',
    family: 'coffee',
  },
  {
    fileName: '06-land-record-extract.pdf',
    documentType: 'Land Record',
    notes: 'Realistic land record extract with survey number, latitude, longitude, and GeoJSON boundary reference.',
    family: 'coffee',
  },
  {
    fileName: '07-production-batch-log.pdf',
    documentType: 'Production Log',
    notes: 'Realistic production batch log for steel shipment CT-CBAM-2026-117 and batch SB-2026-117-A.',
    family: 'steel',
  },
  {
    fileName: '08-bill-of-lading-packing-list.pdf',
    documentType: 'Shipment Document',
    notes: 'Realistic bill of lading and packing list for importer handoff on EUDR coffee shipment.',
    family: 'coffee',
  },
];

const toFsValue = (value) => {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) {
    return value.length ? { arrayValue: { values: value.map(toFsValue) } } : { arrayValue: {} };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [key, toFsValue(nestedValue)])),
      },
    };
  }
  return { stringValue: String(value) };
};

const fromFsValue = (value) => {
  if (!value) return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(fromFsValue);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, nested]) => [key, fromFsValue(nested)]));
  return undefined;
};

const toFirestoreDocument = (data) => ({
  fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFsValue(value)])),
});

const docId = (name) => name.split('/').pop();
const docUrl = (name) => `https://firestore.googleapis.com/v1/${name}`;

async function firestoreRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...firestoreHeaders,
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${url} failed: ${response.status} ${await response.text()}`);
  }
  return response.status === 204 ? null : response.json();
}

async function runQuery(collectionId, fieldPath, value) {
  const payload = {
    structuredQuery: {
      from: [{ collectionId }],
      where: {
        fieldFilter: {
          field: { fieldPath },
          op: 'EQUAL',
          value: toFsValue(value),
        },
      },
    },
  };
  const rows = await firestoreRequest(`${firestoreBase}:runQuery`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return rows.filter((row) => row.document).map((row) => row.document);
}

async function createDocument(collectionId, data) {
  const result = await firestoreRequest(`${firestoreBase}/${collectionId}`, {
    method: 'POST',
    body: JSON.stringify(toFirestoreDocument(data)),
  });
  return { id: docId(result.name), ...data };
}

async function patchDocument(document, data) {
  const mask = Object.keys(data).map((fieldPath) => `updateMask.fieldPaths=${encodeURIComponent(fieldPath)}`).join('&');
  await firestoreRequest(`${docUrl(document.name)}?${mask}`, {
    method: 'PATCH',
    body: JSON.stringify(toFirestoreDocument(data)),
  });
}

async function deleteFirestoreDocument(document) {
  await firestoreRequest(docUrl(document.name), { method: 'DELETE' });
}

async function listStorageObjects(prefix) {
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}/o?prefix=${encodeURIComponent(prefix)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!response.ok) throw new Error(`List storage failed: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  return payload.items ?? [];
}

async function deleteStorageObject(objectName) {
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(BUCKET)}/o/${encodeURIComponent(objectName)}`;
  const response = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!response.ok && response.status !== 404) throw new Error(`Delete ${objectName} failed: ${response.status} ${await response.text()}`);
}

async function uploadPdf(filePath, objectName) {
  const downloadToken = randomUUID();
  const boundary = `carbontrace-${randomUUID()}`;
  const metadata = {
    name: objectName,
    contentType: 'application/pdf',
    metadata: {
      firebaseStorageDownloadTokens: downloadToken,
    },
  };
  const fileBuffer = fs.readFileSync(filePath);
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(BUCKET)}/o?uploadType=multipart`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(body.length),
    },
    body,
  });
  if (!response.ok) throw new Error(`Upload ${objectName} failed: ${response.status} ${await response.text()}`);
  await response.json();
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objectName)}?alt=media&token=${downloadToken}`;
}

const field = (document, fieldName) => fromFsValue(document.fields?.[fieldName]);
const arrayField = (document, fieldName) => field(document, fieldName) ?? [];

async function main() {
  const users = await runQuery('users', 'email', EMAIL);
  if (!users.length) throw new Error(`No Firestore user document found for ${EMAIL}. Log into the app once, then rerun.`);
  const user = users[0];
  const ownerId = docId(user.name);
  const timestamp = new Date().toISOString();

  const existingDocuments = await runQuery('documents', 'ownerId', ownerId);
  const existingExtractions = await runQuery('extractions', 'ownerId', ownerId);

  for (const extraction of existingExtractions) await deleteFirestoreDocument(extraction);
  for (const document of existingDocuments) await deleteFirestoreDocument(document);

  const storagePrefix = `documents/${ownerId}/`;
  const oldObjects = await listStorageObjects(storagePrefix);
  for (const object of oldObjects) await deleteStorageObject(object.name);

  const shipments = await runQuery('shipments', 'ownerId', ownerId);
  const facilities = await runQuery('facilities', 'ownerId', ownerId);
  const batches = await runQuery('productionBatches', 'ownerId', ownerId);
  const coffeeShipments = shipments.filter((shipment) => field(shipment, 'invoiceId') === 'CT-EUDR-2026-041');
  const steelShipments = shipments.filter((shipment) => field(shipment, 'invoiceId') === 'CT-CBAM-2026-117');
  const approvedCoffeeShipment = coffeeShipments.find((shipment) => field(shipment, 'status') === 'APPROVED') ?? coffeeShipments[0];
  const steelShipment = steelShipments[0];
  const steelFacility = facilities.find((facility) => String(field(facility, 'name')).includes('Pune Green Steel'));
  const steelBatch = batches.find((batch) => field(batch, 'batchCode') === 'SB-2026-117-A');

  const created = [];
  for (const spec of evidenceSpecs) {
    const filePath = path.join(PDF_DIR, spec.fileName);
    if (!fs.existsSync(filePath)) throw new Error(`Missing PDF: ${filePath}`);
    const objectName = `documents/${ownerId}/realistic/${Date.now()}-${spec.fileName}`;
    const previewUrl = await uploadPdf(filePath, objectName);
    const linkedShipmentId = spec.family === 'coffee' ? docId(approvedCoffeeShipment?.name ?? '') : docId(steelShipment?.name ?? '');
    const linkedFacilityId = spec.family === 'steel' ? docId(steelFacility?.name ?? '') : '';
    const linkedBatchId = spec.family === 'steel' ? docId(steelBatch?.name ?? '') : '';
    const record = await createDocument('documents', {
      ownerId,
      fileName: spec.fileName,
      documentType: spec.documentType,
      notes: spec.notes,
      linkedShipmentId,
      linkedFacilityId,
      linkedBatchId,
      previewUrl,
      ocrStatus: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    created.push({ ...record, family: spec.family });
  }

  const coffeeDocumentIds = created.filter((document) => document.family === 'coffee').map((document) => document.id);
  const steelDocumentIds = created.filter((document) => document.family === 'steel').map((document) => document.id);

  for (const shipment of coffeeShipments) {
    await patchDocument(shipment, { documentIds: coffeeDocumentIds, updatedAt: timestamp });
  }
  for (const shipment of steelShipments) {
    await patchDocument(shipment, { documentIds: steelDocumentIds, updatedAt: timestamp });
  }
  for (const batch of batches.filter((item) => field(item, 'batchCode') === 'SB-2026-117-A')) {
    await patchDocument(batch, { documentIds: steelDocumentIds, updatedAt: timestamp });
  }

  await createDocument('auditLogs', {
    ownerId,
    actorId: ownerId,
    actorName: field(user, 'name') || EMAIL,
    action: 'REALISTIC_EVIDENCE_PACK_IMPORTED',
    entityType: 'document',
    entityId: created[0]?.id ?? '',
    summary: 'Realistic OCR evidence pack imported.',
    details: `Replaced ${existingDocuments.length} old evidence records with ${created.length} realistic PDF files.`,
    createdAt: timestamp,
  });

  await createDocument('notifications', {
    recipientUserId: ownerId,
    recipientRole: '',
    actorId: ownerId,
    actorRole: field(user, 'role') || 'exporter',
    actorName: field(user, 'name') || EMAIL,
    type: 'DOCUMENT_UPLOADED',
    title: 'Realistic evidence pack loaded',
    message: `${created.length} realistic OCR test documents were added to your evidence library.`,
    level: 'success',
    route: '/app/exporter/uploads',
    entityType: 'document',
    entityId: created[0]?.id ?? '',
    createdAt: timestamp,
    read: false,
    readAt: '',
  });

  console.log(JSON.stringify({
    email: EMAIL,
    ownerId,
    removedEvidenceRecords: existingDocuments.length,
    removedExtractionRecords: existingExtractions.length,
    removedStorageObjects: oldObjects.length,
    uploadedDocuments: created.map((document) => ({
      id: document.id,
      fileName: document.fileName,
      documentType: document.documentType,
      linkedShipmentId: document.linkedShipmentId,
      linkedFacilityId: document.linkedFacilityId,
      linkedBatchId: document.linkedBatchId,
    })),
    relinkedCoffeeShipments: coffeeShipments.map((shipment) => docId(shipment.name)),
    relinkedSteelShipments: steelShipments.map((shipment) => docId(shipment.name)),
    relinkedBatches: batches.filter((item) => field(item, 'batchCode') === 'SB-2026-117-A').map((batch) => docId(batch.name)),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
