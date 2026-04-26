import React, { useState, useEffect, useRef, useCallback } from 'react';
import { APIProvider, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { runGEEPipeline, GEEAnalysisResult } from '../../services/gee_proxy'; // NEW IMPORT
import { AuditLog, AuditLogEntry } from './AuditLog';
import { saveAuditLog, fetchAuditLogs } from '../../services/db';

// --- Configuration ---
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface GeolocationMapProps {
    onStatusChange?: (status: 'SAFE' | 'DEFORESTED') => void;
}

// --- Search Control Component (Places Autocomplete) ---
const PlaceAutocomplete = ({ onPlaceSelect }: { onPlaceSelect: (place: google.maps.places.PlaceResult) => void }) => {
    const [placeAutocomplete, setPlaceAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const places = useMapsLibrary('places');

    useEffect(() => {
        if (!places || !inputRef.current) return;

        const options = {
            fields: ['geometry', 'name', 'formatted_address'],
        };

        setPlaceAutocomplete(new places.Autocomplete(inputRef.current, options));
    }, [places]);

    useEffect(() => {
        if (!placeAutocomplete) return;

        placeAutocomplete.addListener('place_changed', () => {
            onPlaceSelect(placeAutocomplete.getPlace());
        });
    }, [onPlaceSelect, placeAutocomplete]);

    return (
        <div className="bg-white p-2 rounded-lg shadow-md flex items-center gap-2 w-full max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
                ref={inputRef}
                className="w-full outline-none text-sm text-slate-700 placeholder:text-slate-400"
                placeholder="Search any location (e.g. Amazon Rainforest)..."
            />
        </div>
    );
};

// --- Drawing Manager Component ---
const DrawingManager = ({ onPolygonComplete }: { onPolygonComplete: (poly: google.maps.Polygon) => void }) => {
    const map = useMap();
    const drawing = useMapsLibrary('drawing');
    const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);

    useEffect(() => {
        if (!map || !drawing) return;

        const newDrawingManager = new drawing.DrawingManager({
            map,
            drawingMode: google.maps.drawing.OverlayType.POLYGON,
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [google.maps.drawing.OverlayType.POLYGON],
            },
            polygonOptions: {
                fillColor: '#fbbf24',
                fillOpacity: 0.3,
                strokeWeight: 2,
                strokeColor: '#fbbf24',
                editable: false,
                draggable: false, // Keep it simple for now
            },
        });

        setDrawingManager(newDrawingManager);

        return () => {
            newDrawingManager.setMap(null);
        };
    }, [map, drawing]);

    useEffect(() => {
        if (!drawingManager) return;

        const listener = google.maps.event.addListener(drawingManager, 'polygoncomplete', (poly: google.maps.Polygon) => {
            // Clear previous if needed, but for now we just handle the latest
            // Optional: drawingManager.setDrawingMode(null); // Stop drawing after one
            onPolygonComplete(poly);
        });

        return () => {
            google.maps.event.removeListener(listener);
        };
    }, [drawingManager, onPolygonComplete]);

    return null;
};


export const GeolocationMap: React.FC<GeolocationMapProps> = ({ onStatusChange }) => {
    const [center, setCenter] = useState({ lat: 20.5937, lng: 78.9629 }); // India Center
    const [zoom, setZoom] = useState(5);

    // Track the current active polygon wrapper
    const [currentPolygon, setCurrentPolygon] = useState<google.maps.Polygon | null>(null);
    const [analysisStatus, setAnalysisStatus] = useState<'IDLE' | 'ANALYZING' | 'SAFE' | 'DEFORESTED'>('IDLE');

    // Audit Log State
    const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

    // NEW AI State using GEE Result Interface
    const [geeReport, setGeeReport] = useState<GEEAnalysisResult | null>(null);



    // ... (rest of imports)

    // Load Audit Log from Firestore on mount
    useEffect(() => {
        const loadLogs = async () => {
            const logs = await fetchAuditLogs() as unknown as AuditLogEntry[];
            setAuditLog(logs);
        };
        loadLogs();
    }, []);

    const saveToAuditLog = async (entry: AuditLogEntry) => {
        // Optimistic update
        const updatedLog = [entry, ...auditLog];
        setAuditLog(updatedLog); // Show immediately

        await saveAuditLog(entry); // Persist to DB
    };

    const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
        if (place.geometry && place.geometry.location) {
            setCenter({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
            setZoom(14);
        }
    };

    const handlePolygonComplete = useCallback((poly: google.maps.Polygon) => {
        // If there was a previous polygon, remove it from the map (single polygon mode for simplicity)
        if (currentPolygon) {
            currentPolygon.setMap(null);
        }

        setCurrentPolygon(poly);
        setAnalysisStatus('IDLE');
        setGeeReport(null);
    }, [currentPolygon]);

    const runAIAnalysis = async () => {
        if (!currentPolygon) return;

        setAnalysisStatus('ANALYZING');
        setGeeReport(null);

        // Extract coordinates from Google Polygon path (GeoJSON Format: [lng, lat])
        const path = currentPolygon.getPath();
        const coordinates: number[][] = [];

        for (let i = 0; i < path.getLength(); i++) {
            const xy = path.getAt(i);
            coordinates.push([xy.lng(), xy.lat()]);
        }

        // Close the loop for completeness (GeoJSON requires the first and last point to be the same)
        if (coordinates.length > 0) coordinates.push([coordinates[0][0], coordinates[0][1]]);

        // Calculate Area (requires geometry library)
        const areaSqMeters = google.maps.geometry.spherical.computeArea(path);
        const areaHectares = (areaSqMeters / 10000).toFixed(2);

        try {
            // --- NEW PIPELINE CALL ---
            const result = await runGEEPipeline(coordinates, areaHectares);

            setAnalysisStatus(result.status === 'NON_COMPLIANT' ? 'DEFORESTED' : 'SAFE');
            setGeeReport(result);

            if (onStatusChange) onStatusChange(result.status === 'NON_COMPLIANT' ? 'DEFORESTED' : 'SAFE');

            // Color code the polygon result
            currentPolygon.setOptions({
                fillColor: result.status === 'NON_COMPLIANT' ? '#ef4444' : '#10b981',
                strokeColor: result.status === 'NON_COMPLIANT' ? '#ef4444' : '#10b981'
            });

            // Save to Audit Log
            // We map the GEE result back to the generic AuditLogEntry structure
            saveToAuditLog({
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                locationName: `Plot ${coordinates[0][1].toFixed(4)}, ${coordinates[0][0].toFixed(4)}`, // Use array indices [lng, lat] -> lat is index 1
                areaHectares: areaHectares,
                risk: result.status === 'NON_COMPLIANT' ? 'HIGH' : 'SAFE',
                coordinates: coordinates.map(c => ({ lat: c[1], lng: c[0] })), // Convert back to {lat, lng} for UI/Storage
                aiJustification: `Satellite Analysis: NDVI Score ${result.ndvi_score}. Deforested Area: ${result.forest_loss_m2}m²`
            });

        } catch (error) {
            console.error(error);
            setAnalysisStatus('DEFORESTED');
            // Fallback object
            setGeeReport({
                status: 'NON_COMPLIANT',
                ndvi_score: 0,
                forest_loss_m2: 0,
                satellite_source: 'Connection Failed',
                analysis_timestamp: new Date().toISOString()
            });
        }
    };

    if (!GOOGLE_MAPS_API_KEY) {
        return (
            <div className="space-y-4">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-100">
                    <h3 className="text-lg font-bold">Map running in offline mode</h3>
                    <p className="mt-2 text-sm text-amber-50/90">Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to enable live drawing and satellite verification. Until then, the audit log and compliance engine still work locally.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Offline workflow</h4>
                        <ul className="mt-4 space-y-3 text-sm text-slate-400">
                            <li>1. Capture plot coordinates on mobile.</li>
                            <li>2. Upload the polygon once Maps credentials are configured.</li>
                            <li>3. Save audit evidence locally and export JSON for review.</li>
                        </ul>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">Current audit log</h4>
                        <p className="mt-4 text-sm text-slate-400">Any saved EUDR screening events will appear below. You can already demo shipment analysis and XML export without the map key.</p>
                    </div>
                </div>
                <AuditLog entries={auditLog} />
            </div>
        );
    }

    return (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'drawing', 'geometry']}>
            <div className="space-y-4">
                {/* Header & Controls */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <img src="https://www.google.com/images/branding/product/2x/maps_96in128dp.png" className="w-8 h-8" alt="Maps" />
                        <div>
                            <h3 className="text-slate-900 font-bold text-sm">Official Google Maps Platform</h3>
                            <p className="text-slate-500 text-xs">Satellite Verification (Live API)</p>
                        </div>
                    </div>

                    <div className="flex-1 w-full flex justify-center">
                        <PlaceAutocomplete onPlaceSelect={handlePlaceSelect} />
                    </div>

                    <div className="w-full md:w-auto flex justify-end">
                        <button
                            onClick={runAIAnalysis}
                            disabled={!currentPolygon || analysisStatus === 'ANALYZING'}
                            className="w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-bold rounded-full shadow-md transition flex items-center justify-center gap-2"
                        >
                            {analysisStatus === 'ANALYZING' ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Syncing Sentinel-2...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Verify 2020 Baseline
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Map Container */}
                <div className="h-[600px] w-full rounded-xl overflow-hidden border border-slate-300 relative shadow-lg">
                    <Map
                        defaultCenter={center}
                        center={center}
                        defaultZoom={5}
                        zoom={zoom}
                        onCenterChanged={(ev) => setCenter(ev.detail.center)}
                        onZoomChanged={(ev) => setZoom(ev.detail.zoom)}
                        mapId="DEMO_MAP_ID" // Required for advanced markers, can be generic string
                        mapTypeId={'hybrid'}
                        streetViewControl={false}
                        mapTypeControl={false}
                        fullscreenControl={true}
                        style={{ width: '100%', height: '100%' }}
                    >
                        <DrawingManager onPolygonComplete={handlePolygonComplete} />
                    </Map>

                    {/* Report Overlay - UPDATED FOR GEE DATA */}
                    {analysisStatus !== 'IDLE' && geeReport && (
                        <div className="absolute top-4 right-16 z-[10] bg-white border border-slate-200 p-6 rounded-xl shadow-2xl w-96 animate-in slide-in-from-right-4 fade-in font-sans">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-slate-900 text-lg">Satellite Analysis Report</h4>
                                    <p className="text-xs text-slate-500">{geeReport.satellite_source}</p>
                                </div>
                                <button onClick={() => setAnalysisStatus('IDLE')} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>

                            <div className={`border-l-4 ${analysisStatus === 'DEFORESTED' ? 'border-red-500 bg-red-50' : 'border-emerald-500 bg-emerald-50'} p-4 rounded-r-xl mb-4`}>
                                <div className={`flex items-center gap-2 ${analysisStatus === 'DEFORESTED' ? 'text-red-700' : 'text-emerald-700'} mb-2`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                        {analysisStatus === 'DEFORESTED' ? (
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        ) : (
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        )}
                                    </svg>
                                    <span className="font-bold text-lg">{analysisStatus === 'DEFORESTED' ? 'EUDR Violation' : 'EUDR Compliant'}</span>
                                </div>

                                {/* Simplified Metrics with Explanations */}
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-sm font-medium text-slate-700">
                                            <span>Vegetation Health:</span>
                                            <span className={geeReport.ndvi_score > 0.5 ? 'text-emerald-600' : 'text-red-500'}>
                                                {geeReport.ndvi_score > 0.5 ? 'Healthy (Standard)' : 'Degraded (Critical)'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Based on NDVI (Plant Greenness Index)</p>
                                    </div>

                                    {/* Deforestation Area Block REMOVED as requested */}{/* 
                                    <div>
                                        <div className="flex justify-between text-sm font-medium text-slate-700">
                                            <span>Deforestation Status:</span>
                                            <span className={geeReport.forest_loss_m2 > 0 ? 'text-red-600 font-bold' : 'text-emerald-600'}>
                                                {geeReport.forest_loss_m2 > 0 ? `DETECTED` : 'None'}
                                            </span>
                                        </div>
                                    </div> 
                                    */}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] text-slate-400 text-center pt-2">
                                    Verified against Hansen Global Forest Change v1.11 (2020-2023)
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Audit Log Table */}
                <AuditLog entries={auditLog} />

            </div>
        </APIProvider>
    );
};
