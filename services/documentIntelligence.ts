import { DocumentRecord, ExtractionRecord } from '../types';
import { deriveExtractionFromDocument } from './complianceToolkit';

const OCR_IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i;
const API_BASE_URL = (import.meta.env.VITE_GEE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const canRunImageOcr = (document: DocumentRecord) =>
  Boolean(document.previewUrl) && OCR_IMAGE_EXTENSIONS.test(`${document.fileName} ${document.previewUrl}`);

type BackendOcrPayload = {
  rawText: string;
  confidence?: number;
  provider?: ExtractionRecord['provider'];
  providerModel?: string;
  detectedDocumentType?: string;
  warnings?: string[];
  pageCount?: number | null;
  sourceMimeType?: string;
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
        if (payload?.rawText?.trim()) {
          rawText = payload.rawText.trim();
          ocrConfidence = payload.confidence ?? ocrConfidence;
          provider = payload.provider ?? provider;
          providerModel = payload.providerModel ?? providerModel;
          warnings = payload.warnings ?? warnings;
          detectedDocumentType = payload.detectedDocumentType ?? detectedDocumentType;
          pageCount = payload.pageCount ?? undefined;
          sourceMimeType = payload.sourceMimeType ?? sourceMimeType;
        }
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
