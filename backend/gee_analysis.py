import ee
import datetime
import json
import os
import tempfile

SERVICE_ACCOUNT_PATH = os.getenv(
    "GEE_SERVICE_ACCOUNT_PATH",
    r"C:\Users\pincu\Downloads\carbontrace-ai-site\mainnn.json",
)
SERVICE_ACCOUNT_JSON = os.getenv("GEE_SERVICE_ACCOUNT_JSON", "").strip()
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
            print(f"[INFO] GEE service account initialized: {data['client_email']}")
            return
        except Exception as service_error:
            print(f"[WARN] Service account GEE init failed: {service_error}")

    try:
        ee.Initialize()
    except Exception as e:
        print(f"[ERROR] GEE Auth failed: {e}")
        print("[INFO] Try running: python -c 'import ee; ee.Authenticate()' again.")


initialize_earth_engine()

def analyze_polygon(geojson_polygon):
    """
    1. Receives Farm Polygon
    2. Fetches Sentinel-2 Imagery (Post-2020)
    3. Calculus NDVI & Forest Loss
    4. Returns Compliance Status
    """
    
    # 1. Define Region & Time
    geometry = ee.Geometry.Polygon(geojson_polygon['coordinates'])
    start_date = '2020-12-31' # EUDR Cutoff
    end_date = datetime.datetime.now().strftime('%Y-%m-%d')
    
    # 2. Sentinel-2 Imagery (Cloud-Free)
    s2 = ee.ImageCollection('COPERNICUS/S2_SR') \
        .filterBounds(geometry) \
        .filterDate(start_date, end_date) \
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) \
        .median() \
        .clip(geometry)
        
    # 3. Calculate NDVI (Normalized Difference Vegetation Index)
    # NDVI = (NIR - RED) / (NIR + RED)
    ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI')
    
    # 4. Global Forest Change (Hansen Dataset) Check
    gfc = ee.Image('UMD/hansen/global_forest_change_2023_v1_11')
    loss_year = gfc.select('lossyear').clip(geometry)
    
    # Check if any pixel has loss year > 20 (i.e., 2021, 2022, 2023...)
    # 0 = No loss, 1-19 = 2001-2019, 20 = 2020
    recent_loss = loss_year.gt(20) 
    loss_area = recent_loss.multiply(ee.Image.pixelArea()).reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=geometry,
        scale=30,
        maxPixels=1e9
    )
    
    loss_sq_meters = loss_area.get('lossyear').getInfo()
    
    # 5. Logic for Compliance
    status = "COMPLIANT"
    if loss_sq_meters > 1000: # Tolerance of 0.1 Hectare
        status = "NON_COMPLIANT"
    
    return {
        "status": status,
        "deforested_area_m2": loss_sq_meters,
        "satellite_source": "Sentinel-2 L2A",
        "baseline_dataset": "Hansen Global Forest Change v1.11"
    }

# --- CREDENTIALS NOTE ---
# You do NOT hardcode credentials here.
# ee.Initialize() automatically uses the credentials from:
#   1. 'gcloud auth login'
#   2. 'earthengine authenticate' (or the python command you ran)
#   3. Service Account Key (if strictly needed for production servers)

if __name__ == "__main__":
    # This block ONLY runs if you run "python backend/gee_analysis.py" directly.
    # It allows you to test this logic without the frontend.
    print("🧪 Running Test Analysis on Sample Polygon...")
    
    sample_polygon = {
        "type": "Polygon",
        "coordinates": [[[77.123, 12.987], [77.124, 12.987], [77.124, 12.988], [77.123, 12.988]]]
    }
    
    result = analyze_polygon(sample_polygon)
    print(result)
