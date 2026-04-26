import json
import mimetypes
import os
import tempfile
import urllib.request

SERVICE_ACCOUNT_PATH = os.getenv(
    "GEE_SERVICE_ACCOUNT_PATH",
    r"C:\Users\pincu\Downloads\carbontrace-ai-site\mainnn.json",
)
SERVICE_ACCOUNT_JSON = os.getenv("GEE_SERVICE_ACCOUNT_JSON", "").strip()
DOC_AI_PROJECT_ID = os.getenv("DOC_AI_PROJECT_ID", "").strip()
DOC_AI_LOCATION = os.getenv("DOC_AI_LOCATION", "us").strip() or "us"
DOC_AI_PROCESSOR_ID = os.getenv("DOC_AI_PROCESSOR_ID", "").strip()

_TEMP_SERVICE_ACCOUNT_PATH = None


def _resolve_service_account_path() -> str:
    global _TEMP_SERVICE_ACCOUNT_PATH

    if SERVICE_ACCOUNT_JSON:
        try:
            data = json.loads(SERVICE_ACCOUNT_JSON)
            handle = tempfile.NamedTemporaryFile(
                mode="w",
                suffix=".json",
                delete=False,
                encoding="utf-8",
            )
            json.dump(data, handle)
            handle.flush()
            handle.close()
            _TEMP_SERVICE_ACCOUNT_PATH = handle.name
            return _TEMP_SERVICE_ACCOUNT_PATH
        except Exception:
            pass

    return SERVICE_ACCOUNT_PATH


def _guess_mime_type(file_name: str, preview_url: str, response_type: str) -> str:
    guessed = response_type or mimetypes.guess_type(file_name or preview_url)[0] or ""
    if guessed in {"application/octet-stream", ""}:
        lowered = f"{file_name} {preview_url}".lower()
        if ".pdf" in lowered:
            return "application/pdf"
        if any(extension in lowered for extension in [".png"]):
            return "image/png"
        if any(extension in lowered for extension in [".jpg", ".jpeg"]):
            return "image/jpeg"
        if ".webp" in lowered:
            return "image/webp"
        if any(extension in lowered for extension in [".tif", ".tiff"]):
            return "image/tiff"
    return guessed or "application/pdf"


def _fetch_document_bytes(preview_url: str):
    request = urllib.request.Request(
        preview_url,
        headers={"User-Agent": "CarbonTraceAI/1.0"},
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read(), response.headers.get_content_type()


def _run_document_ai_ocr(file_bytes: bytes, mime_type: str):
    if not DOC_AI_PROJECT_ID or not DOC_AI_PROCESSOR_ID:
        return None, "Document AI processor is not configured."

    try:
        from google.api_core.client_options import ClientOptions
        from google.cloud import documentai
        from google.oauth2 import service_account
    except Exception:
        return None, "google-cloud-documentai is not installed on the backend."

    service_account_path = _resolve_service_account_path()
    credentials = None

    try:
        if service_account_path and os.path.exists(service_account_path):
            credentials = service_account.Credentials.from_service_account_file(service_account_path)
    except Exception as error:
        return None, f"Could not load service account credentials for Document AI: {error}"

    endpoint = f"{DOC_AI_LOCATION}-documentai.googleapis.com"
    client = documentai.DocumentProcessorServiceClient(
        credentials=credentials,
        client_options=ClientOptions(api_endpoint=endpoint),
    )
    processor_name = client.processor_path(DOC_AI_PROJECT_ID, DOC_AI_LOCATION, DOC_AI_PROCESSOR_ID)

    request = documentai.ProcessRequest(
        name=processor_name,
        raw_document=documentai.RawDocument(content=file_bytes, mime_type=mime_type),
    )

    result = client.process_document(request=request)
    document = result.document
    raw_text = (document.text or "").strip()

    if not raw_text:
        return None, "Document AI returned no text."

    page_count = len(document.pages or [])
    return {
        "rawText": raw_text,
        "confidence": 0.94,
        "provider": "document-ai",
        "providerModel": f"document-ai:{DOC_AI_LOCATION}:{DOC_AI_PROCESSOR_ID}",
        "pageCount": page_count,
        "sourceMimeType": mime_type,
        "warnings": [],
    }, None


def extract_document_payload(preview_url: str, file_name: str, document_type: str, notes: str):
    if not preview_url:
        base_text = "\n".join(part for part in [file_name, document_type, notes] if part).strip()
        return {
            "rawText": base_text,
            "confidence": 0.55,
            "provider": "heuristic",
            "providerModel": "heuristic:fallback",
            "detectedDocumentType": document_type,
            "warnings": ["No file preview URL was provided; heuristic extraction used."],
            "pageCount": None,
            "sourceMimeType": "",
        }

    warnings = []

    try:
        file_bytes, response_type = _fetch_document_bytes(preview_url)
    except Exception as error:
        base_text = "\n".join(part for part in [file_name, document_type, notes] if part).strip()
        return {
            "rawText": base_text,
            "confidence": 0.55,
            "provider": "heuristic",
            "providerModel": "heuristic:download-fallback",
            "detectedDocumentType": document_type,
            "warnings": [f"Document download failed: {error}"],
            "pageCount": None,
            "sourceMimeType": "",
        }

    mime_type = _guess_mime_type(file_name, preview_url, response_type)
    result, error = _run_document_ai_ocr(file_bytes, mime_type)

    if result:
        result["detectedDocumentType"] = document_type
        return result

    warnings.append(error or "Document AI OCR unavailable.")

    base_text = "\n".join(part for part in [file_name, document_type, notes] if part).strip()
    return {
        "rawText": base_text,
        "confidence": 0.55,
        "provider": "heuristic",
        "providerModel": "heuristic:document-fallback",
        "detectedDocumentType": document_type,
        "warnings": warnings,
        "pageCount": None,
        "sourceMimeType": mime_type,
    }
