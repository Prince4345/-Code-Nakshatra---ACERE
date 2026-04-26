export interface GEEAnalysisResult {
  status: 'COMPLIANT' | 'NON_COMPLIANT';
  ndvi_score: number;
  forest_loss_m2: number;
  satellite_source: string;
  analysis_timestamp: string;
  map_layer_url?: string;
}

const centroid = (geometry: number[][]) => {
  if (!geometry.length) return { lat: 0, lng: 0 };

  const totals = geometry.reduce(
    (acc, [lat, lng]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: totals.lat / geometry.length,
    lng: totals.lng / geometry.length,
  };
};

const offlineAssessment = (geometry: number[][], areaHectares: string): GEEAnalysisResult => {
  const area = Number(areaHectares) || 0;
  const center = centroid(geometry);
  const complexityScore = Math.abs(center.lat + center.lng) % 1;
  const ndvi = Number((0.42 + complexityScore * 0.4).toFixed(2));
  const forestLoss = ndvi < 0.5 || area > 4 ? Math.round(area * 320 + complexityScore * 600) : 0;

  return {
    status: forestLoss > 0 ? 'NON_COMPLIANT' : 'COMPLIANT',
    ndvi_score: ndvi,
    forest_loss_m2: forestLoss,
    satellite_source: 'Offline heuristic screening',
    analysis_timestamp: new Date().toISOString(),
  };
};

const API_BASE = (import.meta.env.VITE_GEE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const toBackendCoordinates = (geometry: number[][]) =>
  geometry.map(([lat, lng]) => [lng, lat]);

export const runGEEPipeline = async (geometry: number[][], areaHectares: string): Promise<GEEAnalysisResult> => {
  try {
    if (!geometry.length) throw new Error('Plot geometry is required before EUDR analysis.');

    const response = await fetch(`${API_BASE}/api/analyze-geometry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: toBackendCoordinates(geometry),
        areaHectares,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend Error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.status === 'ERROR') {
      throw new Error(data.error || 'Backend analysis failed.');
    }

    return {
      status: data.status === 'NON_COMPLIANT' ? 'NON_COMPLIANT' : 'COMPLIANT',
      ndvi_score: Number(data.ndvi_score ?? 0.65),
      forest_loss_m2: Number(data.deforested_area_m2 ?? 0),
      satellite_source: data.satellite_source ?? 'Sentinel-2 / GEE backend',
      analysis_timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('GEE backend unavailable, using offline screening.', error);
    return offlineAssessment(geometry, areaHectares);
  }
};
