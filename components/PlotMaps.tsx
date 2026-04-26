import React, { useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { CoordinatePoint, PlotRecord } from '../types';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_ZOOM = 5;
const MAP_ID = 'carbontrace-plot-map';

const closeRing = (coordinates: number[][]) => {
  if (!coordinates.length) return coordinates;
  const [firstLat, firstLng] = coordinates[0];
  const [lastLat, lastLng] = coordinates[coordinates.length - 1];
  return firstLat === lastLat && firstLng === lastLng ? coordinates : [...coordinates, coordinates[0]];
};

const toCoordinatePairs = (coordinates: Array<CoordinatePoint | [number, number] | number[]> = []): [number, number][] =>
  coordinates
    .map((coordinate) =>
      Array.isArray(coordinate)
        ? [Number(coordinate[0]), Number(coordinate[1])]
        : [Number(coordinate.lat), Number(coordinate.lng)],
    )
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng)) as [number, number][];

const getCenter = (coordinates: [number, number][]) => {
  if (!coordinates.length) return DEFAULT_CENTER;
  return {
    lat: coordinates.reduce((sum, [lat]) => sum + lat, 0) / coordinates.length,
    lng: coordinates.reduce((sum, [, lng]) => sum + lng, 0) / coordinates.length,
  };
};

const getZoom = (coordinates: [number, number][], geometryType: 'point' | 'polygon') => {
  if (!coordinates.length) return DEFAULT_ZOOM;
  if (geometryType === 'point') return 15;
  const latitudes = coordinates.map(([lat]) => lat);
  const longitudes = coordinates.map(([, lng]) => lng);
  const spread = Math.max(
    Math.max(...latitudes) - Math.min(...latitudes),
    Math.max(...longitudes) - Math.min(...longitudes),
  );
  if (spread <= 0.0015) return 17;
  if (spread <= 0.004) return 15.5;
  if (spread <= 0.01) return 14;
  if (spread <= 0.03) return 12.5;
  if (spread <= 0.08) return 11;
  if (spread <= 0.2) return 9.5;
  return 7.5;
};

const MarkerOverlay = ({
  coordinates,
  tone,
  draggable = false,
  onMarkerDrag,
}: {
  coordinates: [number, number][];
  tone: 'primary' | 'draft';
  draggable?: boolean;
  onMarkerDrag?: (index: number, coordinate: [number, number]) => void;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !coordinates.length) return;

    const markers = coordinates.map(
      ([lat, lng]) =>
        new google.maps.Marker({
          map,
          position: { lat, lng },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: tone === 'primary' ? 8 : 6,
            fillColor: tone === 'primary' ? '#0f766e' : '#f59e0b',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          draggable,
        }),
    );

    if (onMarkerDrag) {
      markers.forEach((marker, index) => {
        marker.addListener('dragend', (event) => {
          const latLng = event.latLng;
          if (!latLng) return;
          onMarkerDrag(index, [latLng.lat(), latLng.lng()]);
        });
      });
    }

    return () => markers.forEach((marker) => marker.setMap(null));
  }, [map, coordinates, tone, draggable, onMarkerDrag]);

  return null;
};

const PolylineOverlay = ({ coordinates }: { coordinates: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || coordinates.length < 2) return;

    const polyline = new google.maps.Polyline({
      map,
      path: coordinates.map(([lat, lng]) => ({ lat, lng })),
      strokeColor: '#0f6cbd',
      strokeOpacity: 0.85,
      strokeWeight: 2.5,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 1,
            scale: 3,
          },
          offset: '0',
          repeat: '14px',
        },
      ],
    });

    return () => polyline.setMap(null);
  }, [map, coordinates]);

  return null;
};

const PolygonOverlay = ({
  coordinates,
  fillColor,
  fillOpacity,
}: {
  coordinates: [number, number][];
  fillColor: string;
  fillOpacity: number;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || coordinates.length < 3) return;

    const polygon = new google.maps.Polygon({
      map,
      paths: closeRing(coordinates as number[][]).map(([lat, lng]) => ({ lat, lng })),
      strokeColor: '#0f6cbd',
      strokeOpacity: 0.95,
      strokeWeight: 2.5,
      fillColor,
      fillOpacity,
    });

    return () => polygon.setMap(null);
  }, [map, coordinates, fillColor, fillOpacity]);

  return null;
};

const CameraSync = ({
  coordinates,
  geometryType,
  center,
  zoom,
  cameraKey,
  fitCoordinates = true,
}: {
  coordinates: [number, number][];
  geometryType: 'point' | 'polygon';
  center: { lat: number; lng: number };
  zoom: number;
  cameraKey: string;
  fitCoordinates?: boolean;
}) => {
  const map = useMap();
  const lastCameraKey = useRef('');

  useEffect(() => {
    if (!map || lastCameraKey.current === cameraKey) return;

    lastCameraKey.current = cameraKey;

    if (fitCoordinates && geometryType === 'polygon' && coordinates.length >= 2) {
      const bounds = new google.maps.LatLngBounds();
      coordinates.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
      map.fitBounds(bounds, 64);
      return;
    }

    map.moveCamera({
      center,
      zoom: Math.round(zoom),
    });
  }, [map, coordinates, geometryType, center, zoom, cameraKey]);

  return null;
};

const MapUnavailable = ({ title }: { title: string }) => (
  <div className="ct-map-card">
    <div className="ct-map-label">{title}</div>
    <div className="ct-map-empty">
      <strong>Google Maps API key needed</strong>
      <p>Add `VITE_GOOGLE_MAPS_API_KEY` to your env file to enable the live Google Maps plot builder.</p>
    </div>
  </div>
);

const GoogleMapShell = ({
  title,
  coordinates,
  geometryType,
  center,
  zoom,
  onMapClick,
  fitCoordinates = true,
  showLocate = false,
  onLocated,
  children,
}: {
  title: string;
  coordinates: [number, number][];
  geometryType: 'point' | 'polygon';
  center: { lat: number; lng: number };
  zoom: number;
  onMapClick?: (coordinate: [number, number]) => void;
  fitCoordinates?: boolean;
  showLocate?: boolean;
  onLocated?: (coordinate: [number, number]) => void;
  children?: React.ReactNode;
}) => {
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [focusCoordinate, setFocusCoordinate] = useState<[number, number] | null>(null);

  if (!GOOGLE_MAPS_API_KEY) return <MapUnavailable title={title} />;

  const locateUser = () => {
    setLocateError('');
    if (!navigator.geolocation) {
      setLocateError('GPS is not available in this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinate: [number, number] = [position.coords.latitude, position.coords.longitude];
        setFocusCoordinate(coordinate);
        onLocated?.(coordinate);
        setLocating(false);
      },
      () => {
        setLocateError('Allow location permission, then try again.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const effectiveCenter = focusCoordinate ? { lat: focusCoordinate[0], lng: focusCoordinate[1] } : center;
  const effectiveZoom = focusCoordinate ? 18 : zoom;
  const effectiveCameraKey = focusCoordinate
    ? `gps:${focusCoordinate[0].toFixed(6)},${focusCoordinate[1].toFixed(6)}`
    : `${geometryType}:${coordinates.map(([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`).join('|')}`;

  return (
    <div className="ct-map-card">
      <div className="ct-map-label">{title}</div>
      <div className="ct-map">
        {showLocate ? (
          <div className="ct-map-floating-actions">
            <button className="ct-map-action-button" onClick={locateUser} disabled={locating} type="button">
              {locating ? 'Locating...' : 'GPS: Locate me'}
            </button>
            {locateError ? <span>{locateError}</span> : null}
          </div>
        ) : null}
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            mapId={MAP_ID}
            defaultCenter={effectiveCenter}
            defaultZoom={Math.round(effectiveZoom)}
            style={{ width: '100%', height: '100%' }}
            mapTypeId="hybrid"
            cameraControl={false}
            zoomControl={true}
            streetViewControl={false}
            fullscreenControl={false}
            mapTypeControl={true}
            gestureHandling="greedy"
            disableDefaultUI={false}
            onClick={
              onMapClick
                ? (event) => {
                    const latLng = event.detail.latLng;
                    if (!latLng) return;
                    onMapClick([latLng.lat, latLng.lng]);
                  }
                : undefined
            }
          >
            <CameraSync
              coordinates={coordinates}
              geometryType={geometryType}
              center={effectiveCenter}
              zoom={effectiveZoom}
              cameraKey={effectiveCameraKey}
              fitCoordinates={fitCoordinates}
            />
            {children}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
};

export const PlotBuilderMap = ({
  geometryType,
  coordinates,
  onAddCoordinate,
  onMoveCoordinate,
}: {
  geometryType: 'point' | 'polygon';
  coordinates: number[][];
  onAddCoordinate: (coordinate: [number, number]) => void;
  onMoveCoordinate: (index: number, coordinate: [number, number]) => void;
}) => {
  const typedCoordinates = coordinates as [number, number][];
  const center = useMemo(() => getCenter(typedCoordinates), [typedCoordinates]);
  const zoom = useMemo(() => getZoom(typedCoordinates, geometryType), [typedCoordinates, geometryType]);

  return (
    <GoogleMapShell
      title="Map Builder"
      coordinates={typedCoordinates}
      geometryType={geometryType}
      center={center}
      zoom={zoom}
      onMapClick={onAddCoordinate}
      fitCoordinates={false}
      showLocate
      onLocated={onAddCoordinate}
    >
      {geometryType === 'point' && typedCoordinates[0] && (
        <MarkerOverlay coordinates={[typedCoordinates[0]]} tone="primary" draggable onMarkerDrag={onMoveCoordinate} />
      )}
      {geometryType === 'polygon' && typedCoordinates.length >= 2 && (
        <PolylineOverlay coordinates={typedCoordinates} />
      )}
      {geometryType === 'polygon' && typedCoordinates.length >= 3 && (
        <PolygonOverlay coordinates={typedCoordinates} fillColor="#13b981" fillOpacity={0.16} />
      )}
      {geometryType === 'polygon' && typedCoordinates.length > 0 && (
        <MarkerOverlay coordinates={typedCoordinates} tone="draft" draggable onMarkerDrag={onMoveCoordinate} />
      )}
    </GoogleMapShell>
  );
};

export const PlotPreviewMap = ({ plot }: { plot: PlotRecord }) => {
  const typedCoordinates = useMemo(() => toCoordinatePairs(plot.coordinates), [plot.coordinates]);
  const geometryType = plot.geometryType === 'point' ? 'point' : 'polygon';
  const center = useMemo(() => getCenter(typedCoordinates), [typedCoordinates]);
  const zoom = useMemo(() => getZoom(typedCoordinates, geometryType), [typedCoordinates, geometryType]);

  return (
    <GoogleMapShell
      title="Visual Plot Preview"
      coordinates={typedCoordinates}
      geometryType={geometryType}
      center={center}
      zoom={zoom}
    >
      {geometryType === 'point' && typedCoordinates[0] && (
        <MarkerOverlay coordinates={[typedCoordinates[0]]} tone="primary" />
      )}
      {geometryType === 'polygon' && typedCoordinates.length >= 3 && (
        <PolygonOverlay coordinates={typedCoordinates} fillColor="#13b981" fillOpacity={0.16} />
      )}
    </GoogleMapShell>
  );
};
