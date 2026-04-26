import io
import json
import os
import tempfile
import sys

from flask import Flask, jsonify, request
from flask_cors import CORS
import ee
import gee_analysis
import document_processing

# Force UTF-8 output on Windows consoles.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

app = Flask(__name__)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}})

SERVICE_ACCOUNT_PATH = os.getenv(
    "GEE_SERVICE_ACCOUNT_PATH",
    r"C:\Users\pincu\Downloads\carbontrace-ai-site\mainnn.json",
)
SERVICE_ACCOUNT_JSON = os.getenv("GEE_SERVICE_ACCOUNT_JSON", "").strip()
DOC_AI_PROCESSOR_ID = os.getenv("DOC_AI_PROCESSOR_ID", "").strip()
PORT = int(os.getenv("PORT", "5000"))
_TEMP_SERVICE_ACCOUNT_PATH = None


def resolve_service_account_path():
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
        except Exception as env_error:
            print(f"[WARN] Could not parse GEE_SERVICE_ACCOUNT_JSON: {env_error}")

    return SERVICE_ACCOUNT_PATH


def initialize_earth_engine():
    service_account_path = resolve_service_account_path()

    if os.path.exists(service_account_path):
        try:
            with open(service_account_path, "r", encoding="utf-8") as handle:
                data = json.load(handle)

            credentials = ee.ServiceAccountCredentials(
                data["client_email"],
                service_account_path,
            )
            ee.Initialize(credentials)
            print(f"[INFO] Google Earth Engine initialized with service account: {data['client_email']}")
            return
        except Exception as service_error:
            print(f"[WARN] Service account initialization failed: {service_error}")

    try:
        ee.Initialize()
        print("[INFO] Google Earth Engine Initialized Successfully!")
    except Exception:
        print("[WARN] GEE Initialization Failed. Trying to authenticate...")
        try:
            ee.Authenticate()
            ee.Initialize()
            print("[INFO] Google Earth Engine Authenticated & Initialized!")
        except Exception as auth_err:
            print(f"[ERROR] Critical Error: Could not auth GEE: {auth_err}")


initialize_earth_engine()


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "service": "carbontrace-gee-backend",
        "earth_engine_credentials": "service_account" if SERVICE_ACCOUNT_JSON or os.path.exists(SERVICE_ACCOUNT_PATH) else "ambient",
        "document_ai_configured": bool(DOC_AI_PROCESSOR_ID),
        "allowed_origins": ALLOWED_ORIGINS,
    })


@app.route('/api/analyze-geometry', methods=['POST'])
def analyze_endpoint():
    try:
        data = request.get_json(silent=True) or {}
        print("[INFO] Received geometry for analysis.")

        coordinates = data.get('coordinates')
        if not coordinates:
            return jsonify({
                "status": "ERROR",
                "error": "Coordinates are required.",
                "satellite_source": "Validation Failed",
            }), 400

        geojson = {
            "type": "Polygon",
            "coordinates": coordinates,
        }

        result = gee_analysis.analyze_polygon(geojson)
        print("[SUCCESS] Analysis complete:", result['status'])
        return jsonify(result)

    except Exception as error:
        print("[ERROR] Error during analysis:", str(error))
        return jsonify({
            "status": "ERROR",
            "error": str(error),
            "satellite_source": "Connection Failed",
        }), 500


@app.route('/api/extract-document', methods=['POST'])
def extract_document_endpoint():
    try:
        data = request.get_json(silent=True) or {}
        payload = document_processing.extract_document_payload(
            preview_url=(data.get('previewUrl') or '').strip(),
            file_name=(data.get('fileName') or '').strip(),
            document_type=(data.get('documentType') or 'Uploaded Document').strip(),
            notes=(data.get('notes') or '').strip(),
        )
        return jsonify(payload)
    except Exception as error:
        return jsonify({
            "rawText": "",
            "confidence": 0,
            "provider": "heuristic",
            "providerModel": "heuristic:error",
            "detectedDocumentType": (request.get_json(silent=True) or {}).get('documentType', 'Uploaded Document'),
            "warnings": [f"Document extraction failed: {error}"],
            "pageCount": None,
            "sourceMimeType": "",
        }), 500


if __name__ == '__main__':
    print(f"[INFO] GEE Backend Server running on http://localhost:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=True)
