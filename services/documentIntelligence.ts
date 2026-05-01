import { httpsCallable } from 'firebase/functions';
import { DocumentRecord, ExtractionRecord } from '../types';
import { deriveExtractionFromDocument } from './complianceToolkit';
import { functions } from './firebase';

const OCR_IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i;
const API_BASE_URL = (import.meta.env.VITE_GEE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const canRunImageOcr = (document: DocumentRecord) =>
  Boolean(document.previewUrl) && OCR_IMAGE_EXTENSIONS.test(`${document.fileName} ${document.previewUrl}`);

type BackendOcrPayload = {
  skipped?: boolean;
  reason?: string;
  rawText: string;
  confidence?: number;
  provider?: ExtractionRecord['provider'];
  providerModel?: string;
  detectedDocumentType?: string;
  warnings?: string[];
  pageCount?: number | null;
  sourceMimeType?: string;
  entities?: Array<{ type: string; value: string; confidence?: number }>;
};

const documentAiCallable = httpsCallable<{ documentId: string; mimeType?: string }, BackendOcrPayload>(
  functions,
  'extractDocumentWithDocumentAi',
);

const applyOcrPayload = (
  payload: BackendOcrPayload | null,
  current: {
    rawText: string;
    ocrConfidence: number;
    provider: ExtractionRecord['provider'];
    providerModel: string;
    warnings: string[];
    detectedDocumentType: string;
    pageCount?: number;
    sourceMimeType: string;
  },
) => {
  if (!payload) return current;

  const nextWarnings = [...current.warnings, ...(payload.warnings ?? [])];

  if (!payload.rawText?.trim()) {
    return {
      ...current,
      warnings: payload.skipped && payload.reason ? [...nextWarnings, payload.reason] : nextWarnings,
      detectedDocumentType: payload.detectedDocumentType ?? current.detectedDocumentType,
    };
  }

  return {
    rawText: payload.rawText.trim(),
    ocrConfidence: payload.confidence ?? current.ocrConfidence,
    provider: payload.provider ?? current.provider,
    providerModel: payload.providerModel ?? current.providerModel,
    warnings: nextWarnings,
    detectedDocumentType: payload.detectedDocumentType ?? current.detectedDocumentType,
    pageCount: payload.pageCount ?? current.pageCount,
    sourceMimeType: payload.sourceMimeType ?? current.sourceMimeType,
  };
};

export const extractDocumentIntelligence = async (
  document: DocumentRecord,
): Promise<Omit<ExtractionRecord, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>> => {
  let rawText = `${document.fileName}\n${document.documentType}\n${document.notes}`.trim();
  let ocrConfidence = 0;
  let provider: ExtractionRecord['provider'] = 'heuristic';
  let providerModel = '';
  let warnings: string[] = [];
  let detectedDocumentType = document.documentType;
  let pageCount: number | undefined;
  let sourceMimeType = '';

  if (document.previewUrl) {
    try {
      const response = await documentAiCallable({ documentId: document.id });
      const next = applyOcrPayload(response.data ?? null, {
        rawText,
        ocrConfidence,
        provider,
        providerModel,
        warnings,
        detectedDocumentType,
        pageCount,
        sourceMimeType,
      });
      rawText = next.rawText;
      ocrConfidence = next.ocrConfidence;
      provider = next.provider;
      providerModel = next.providerModel;
      warnings = next.warnings;
      detectedDocumentType = next.detectedDocumentType;
      pageCount = next.pageCount;
      sourceMimeType = next.sourceMimeType;
    } catch (error) {
      console.warn('Document AI extraction unavailable, trying backend OCR fallback.', error);
      warnings = ['Document AI unavailable; backup extraction path used.'];
    }
  }

  if (document.previewUrl && provider !== 'document-ai') {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 90_000);
    try {
      const response = await fetch(`${API_BASE_URL}/api/extract-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          previewUrl: document.previewUrl,
          fileName: document.fileName,
          documentType: document.documentType,
          notes: document.notes,
        }),
      });

      const payload = (await response.json().catch(() => null)) as BackendOcrPayload | null;
      if (response.ok) {
        const next = applyOcrPayload(payload, {
          rawText,
          ocrConfidence,
          provider,
          providerModel,
          warnings,
          detectedDocumentType,
          pageCount,
          sourceMimeType,
        });
        rawText = next.rawText;
        ocrConfidence = next.ocrConfidence;
        provider = next.provider;
        providerModel = next.providerModel;
        warnings = next.warnings;
        detectedDocumentType = next.detectedDocumentType;
        pageCount = next.pageCount;
        sourceMimeType = next.sourceMimeType;
      } else {
        warnings = [
          ...(payload?.warnings ?? []),
          `Backend extraction returned ${response.status}; heuristic extraction used.`,
        ];
        detectedDocumentType = payload?.detectedDocumentType ?? detectedDocumentType;
      }
    } catch (error) {
      console.warn('Backend extraction unavailable, continuing with browser OCR fallback.', error);
      warnings = ['Backend extraction unavailable or timed out; heuristic extraction used.'];
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  if (provider === 'heuristic' && canRunImageOcr(document)) {
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const result = await worker.recognize(document.previewUrl);
      await worker.terminate();

      if (result.data?.text?.trim()) {
        rawText = `${result.data.text.trim()}\n${document.notes}`.trim();
        ocrConfidence = Number(((result.data.confidence ?? 0) / 100).toFixed(2));
        provider = 'tesseract';
        providerModel = 'tesseract.js-eng';
      }
    } catch (error) {
      console.warn('OCR extraction failed, falling back to heuristic extraction.', error);
      warnings = [...warnings, 'Browser OCR fallback failed; heuristic extraction used.'];
    }
  }

  const extracted = deriveExtractionFromDocument(document, rawText, {
    baseConfidence: ocrConfidence,
    provider,
    providerModel,
    warnings,
    detectedDocumentType,
    pageCount,
    sourceMimeType,
  });
  return {
    ...extracted,
    rawText,
    confidence: Math.max(extracted.confidence, ocrConfidence),
  };
};
