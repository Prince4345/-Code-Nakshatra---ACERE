import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Location from 'expo-location';
import MapView, { MapPressEvent, Region } from 'react-native-maps';
import { useExporterData } from '../../context/MobileDataContext';
import { useMobileSync } from '../../context/MobileSyncContext';
import { ActionLink, LoadingScreen, NotificationList, ProductShell, RuntimeBanner, TabChip, sharedInputStyles } from '../../components/ui';
import { reportMobileError } from '../../services/monitoring';
import {
  runDocumentExtractionFromMobile,
  saveNotificationFromMobile,
  saveReviewedExtractionFromMobile,
  updateShipmentStatusFromMobile,
} from '../../services/data';
import { CoordinatePoint, DocumentRecord, SessionUser, ShipmentRecord } from '../../types';
import { ExporterTab } from './types';
import { ExporterOverviewTab } from './tabs/OverviewTab';
import { ExporterPlotsTab } from './tabs/PlotsTab';
import { ExporterEvidenceTab } from './tabs/EvidenceTab';
import { ExporterShipmentsTab } from './tabs/ShipmentsTab';
import { ExporterReportsTab } from './tabs/ReportsTab';
import { palette } from '../../theme';

const INDIA_REGION: Region = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 11,
  longitudeDelta: 11,
};

const coordinatesToRegion = (coordinates: CoordinatePoint[]): Region => {
  if (!coordinates.length) return INDIA_REGION;
  if (coordinates.length === 1) {
    return {
      latitude: coordinates[0].lat,
      longitude: coordinates[0].lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  }

  const latitudes = coordinates.map((item) => item.lat);
  const longitudes = coordinates.map((item) => item.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.8),
    longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.8),
  };
};

const estimateAreaHectares = (coordinates: CoordinatePoint[]) => {
  if (coordinates.length < 3) return '';

  const meanLat = coordinates.reduce((sum, point) => sum + point.lat, 0) / coordinates.length;
  const metersPerLat = 111_320;
  const metersPerLng = Math.cos((meanLat * Math.PI) / 180) * 111_320;

  let area = 0;
  for (let index = 0; index < coordinates.length; index += 1) {
    const current = coordinates[index];
    const next = coordinates[(index + 1) % coordinates.length];
    const currentX = current.lng * metersPerLng;
    const currentY = current.lat * metersPerLat;
    const nextX = next.lng * metersPerLng;
    const nextY = next.lat * metersPerLat;
    area += currentX * nextY - nextX * currentY;
  }

  const squareMeters = Math.abs(area / 2);
  return (squareMeters / 10_000).toFixed(2);
};

const deriveDocumentCrop = (width: number, height: number) => {
  if (!width || !height) return null;
  const targetRatio = 4 / 5;
  const currentRatio = width / height;

  if (Math.abs(currentRatio - targetRatio) < 0.08) return null;

  if (currentRatio > targetRatio) {
    const croppedWidth = Math.round(height * targetRatio);
    return {
      originX: Math.max(0, Math.round((width - croppedWidth) / 2)),
      originY: 0,
      width: croppedWidth,
      height,
    };
  }

  const croppedHeight = Math.round(width / targetRatio);
  return {
    originX: 0,
    originY: Math.max(0, Math.round((height - croppedHeight) / 2)),
    width,
    height: croppedHeight,
  };
};

export const ExporterWorkspace = ({
  session,
  onLogout,
  forcedTab,
  showTabs = true,
}: {
  session: SessionUser;
  onLogout: () => Promise<void>;
  forcedTab?: ExporterTab;
  showTabs?: boolean;
}) => {
  const [tab, setTab] = useState<ExporterTab>(forcedTab ?? 'home');
  const [documentType, setDocumentType] = useState('shipment document');
  const [notes, setNotes] = useState('');
  const [plotName, setPlotName] = useState('');
  const [plotCountry, setPlotCountry] = useState('India');
  const [plotCommodity, setPlotCommodity] = useState('Coffee');
  const [plotGeometryType, setPlotGeometryType] = useState<'point' | 'polygon'>('point');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [draftCoordinates, setDraftCoordinates] = useState<CoordinatePoint[]>([]);
  const [mapRegion, setMapRegion] = useState<Region>(INDIA_REGION);
  const [locationBusy, setLocationBusy] = useState(false);
  const { bundle, loading, refreshing, refresh } = useExporterData();
  const { online, processing, items: syncItems, history: syncHistory, lastCompletedAt, enqueueUpload, enqueuePlot, processNow } = useMobileSync();
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (forcedTab) setTab(forcedTab);
  }, [forcedTab]);

  useEffect(() => {
    if (!selectedSupplierId && bundle?.suppliers[0]?.id) {
      setSelectedSupplierId(bundle.suppliers[0].id);
    }
  }, [bundle?.suppliers, selectedSupplierId]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.animateToRegion(mapRegion, 220);
  }, [mapRegion]);

  useEffect(() => {
    if (!lastCompletedAt) return;
    void refresh(true);
  }, [lastCompletedAt, refresh]);

  const autoArea = useMemo(
    () => (plotGeometryType === 'polygon' ? estimateAreaHectares(draftCoordinates) : ''),
    [draftCoordinates, plotGeometryType],
  );

  const handlePickDocument = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['application/pdf', 'image/*'],
      });

      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      await enqueueUpload({
        ownerId: session.id,
        fileUri: asset.uri,
        fileName: asset.name ?? 'mobile-upload',
        mimeType: asset.mimeType ?? 'application/octet-stream',
        documentType,
        notes,
      });
      setNotes('');
      Alert.alert(
        online ? 'Upload started' : 'Added to offline queue',
        online
          ? 'The document is syncing now and will appear in evidence shortly.'
          : 'The document is queued locally and will upload automatically when the app reconnects.',
      );
    } catch (error) {
      void reportMobileError({
        source: 'exporter-document-upload',
        error,
        context: { documentType, ownerId: session.id },
      });
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Could not upload this file.');
    }
  };

  const handleCaptureDocument = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera access required', 'Allow camera access to capture invoices and declarations from the field.');
        return;
      }

      const capture = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.9,
      });

      if (capture.canceled || !capture.assets?.[0]) return;
      const asset = capture.assets[0];
      const crop = deriveDocumentCrop(asset.width, asset.height);
      const actions: Parameters<typeof manipulateAsync>[1] = [];
      if (crop) actions.push({ crop });
      if ((asset.width ?? 0) > 1600) actions.push({ resize: { width: 1600 } });
      const optimized = await manipulateAsync(asset.uri, actions, {
        compress: 0.84,
        format: SaveFormat.JPEG,
      });

      await enqueueUpload({
        ownerId: session.id,
        fileUri: optimized.uri,
        fileName: asset.fileName ?? `capture-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        documentType,
        notes,
      });
      setNotes('');
      Alert.alert(
        online ? 'Capture queued for upload' : 'Capture stored offline',
        online
          ? 'The captured document is uploading and will appear in evidence shortly.'
          : 'The captured document is saved locally and will sync when the app reconnects.',
      );
    } catch (error) {
      void reportMobileError({
        source: 'exporter-camera-capture',
        error,
        context: { documentType, ownerId: session.id },
      });
      Alert.alert('Capture failed', error instanceof Error ? error.message : 'Could not capture this document.');
    }
  };

  const handleRunExtraction = async (document: DocumentRecord) => {
    try {
      await runDocumentExtractionFromMobile(document);
      await refresh(true);
      Alert.alert('Extraction ready', `${document.fileName} has updated structured fields.`);
    } catch (error) {
      void reportMobileError({
        source: 'exporter-document-extraction',
        error,
        context: { documentId: document.id, ownerId: session.id },
      });
      Alert.alert('Extraction failed', error instanceof Error ? error.message : 'Could not extract this document.');
    }
  };

  const handleSaveExtractionReview = async (document: DocumentRecord, fields: Record<string, string>, reviewerNotes: string) => {
    try {
      await saveReviewedExtractionFromMobile(document, fields, reviewerNotes);
      await refresh(true);
      Alert.alert('Review saved', `${document.fileName} is now marked as reviewed.`);
    } catch (error) {
      void reportMobileError({
        source: 'exporter-extraction-review',
        error,
        context: { documentId: document.id, ownerId: session.id },
      });
      Alert.alert('Review failed', error instanceof Error ? error.message : 'Could not save this review.');
    }
  };

  const handleMapPress = (event: MapPressEvent) => {
    const coordinate = {
      lat: event.nativeEvent.coordinate.latitude,
      lng: event.nativeEvent.coordinate.longitude,
    };
    setDraftCoordinates((current) => (plotGeometryType === 'point' ? [coordinate] : [...current, coordinate]));
    if (plotGeometryType === 'point') {
      setMapRegion(coordinatesToRegion([coordinate]));
    }
  };

  const useCurrentLocation = async () => {
    try {
      setLocationBusy(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location required', 'Allow location access to drop a point from your current position.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coordinate = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setMapRegion({
        latitude: coordinate.lat,
        longitude: coordinate.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
      setDraftCoordinates((current) => (plotGeometryType === 'point' ? [coordinate] : [...current, coordinate]));
    } catch (error) {
      void reportMobileError({
        source: 'exporter-location',
        error,
        context: { ownerId: session.id, geometryType: plotGeometryType },
      });
      Alert.alert('Location unavailable', error instanceof Error ? error.message : 'Could not access current location.');
    } finally {
      setLocationBusy(false);
    }
  };

  const resetPlotDraft = () => {
    setPlotName('');
    setPlotCountry('India');
    setPlotCommodity('Coffee');
    setPlotGeometryType('point');
    setDraftCoordinates([]);
    setMapRegion(INDIA_REGION);
  };

  const savePlot = async () => {
    if (!plotName.trim()) {
      Alert.alert('Missing plot name', 'Add a plot name first.');
      return;
    }
    if (!selectedSupplierId) {
      Alert.alert('Missing supplier', 'Choose a supplier for this plot.');
      return;
    }
    if (!draftCoordinates.length) {
      Alert.alert('No geometry', 'Tap the map or use your current location to create the plot.');
      return;
    }
    if (plotGeometryType === 'polygon' && draftCoordinates.length < 3) {
      Alert.alert('Polygon incomplete', 'Add at least 3 points for a polygon plot.');
      return;
    }

    try {
      const areaHectares = plotGeometryType === 'polygon' ? autoArea || '0' : '0';
      await enqueuePlot({
        ownerId: session.id,
        name: plotName.trim(),
        supplierId: selectedSupplierId,
        commodity: plotCommodity,
        countryOfProduction: plotCountry.trim() || 'India',
        geometryType: plotGeometryType,
        coordinates: draftCoordinates,
        areaHectares,
        notifyUserId: session.id,
      });
      resetPlotDraft();
      Alert.alert(
        online ? 'Plot sync started' : 'Plot queued offline',
        online
          ? 'The plot is being saved and screened now.'
          : 'The plot draft is stored locally and will save with EUDR screening when the app is online.',
      );
    } catch (error) {
      void reportMobileError({
        source: 'exporter-plot-save',
        error,
        context: { ownerId: session.id, geometryType: plotGeometryType, plotName: plotName.trim() },
      });
      Alert.alert('Plot save failed', error instanceof Error ? error.message : 'Could not save this plot.');
    }
  };

  const submitShipment = async (shipment: ShipmentRecord) => {
    try {
      await updateShipmentStatusFromMobile(shipment.id, 'SUBMITTED');
      await saveNotificationFromMobile({
        recipientRole: 'verifier',
        title: 'Shipment ready for review',
        message: `${shipment.invoiceId} is now submitted from mobile and ready for verifier triage.`,
        route: '/mobile/verifier/queue',
        level: 'warning',
      });
      await refresh(true);
      Alert.alert('Shipment submitted', 'The verifier queue is now updated.');
    } catch (error) {
      void reportMobileError({
        source: 'exporter-shipment-submit',
        error,
        context: { shipmentId: shipment.id, ownerId: session.id },
      });
      Alert.alert('Unable to submit', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  if (loading || !bundle) return <LoadingScreen label="Loading exporter workspace" />;

  const activeUpload = syncItems.find((item) => item.type === 'document-upload' && item.status === 'processing');
  const activePlotSync = syncItems.find((item) => item.type === 'plot-save' && item.status === 'processing');
  const failedSyncCount = syncItems.filter((item) => item.status === 'failed').length;
  const banner = !online ? (
    <RuntimeBanner
      tone="warn"
      title="Offline mode active"
      body="Captures, uploads, and plot saves are being held locally and will sync automatically when your connection returns."
      action={<ActionLink label="Retry queue" onPress={() => void processNow()} />}
    />
  ) : failedSyncCount ? (
    <RuntimeBanner
      tone="bad"
      title="Sync needs attention"
      body={`${failedSyncCount} queued action${failedSyncCount === 1 ? '' : 's'} need a retry. Open Home for details or retry now.`}
      action={<ActionLink label="Retry now" onPress={() => void processNow()} />}
    />
  ) : processing ? (
    <RuntimeBanner
      tone="neutral"
      title="Sync in progress"
      body="CarbonTrace is uploading evidence and screening plots in the background."
    />
  ) : undefined;

  return (
    <ProductShell
      session={session}
      title="Exporter"
      subtitle="Capture evidence, map plots, and move shipments from the field."
      onLogout={onLogout}
      banner={banner}
      tabs={showTabs ? (
        <>
          <TabChip active={tab === 'home'} label="Home" icon="grid" onPress={() => setTab('home')} />
          <TabChip active={tab === 'plots'} label="Plots" icon="map" onPress={() => setTab('plots')} />
          <TabChip active={tab === 'evidence'} label="Evidence" icon="file-text" onPress={() => setTab('evidence')} />
          <TabChip active={tab === 'shipments'} label="Shipments" icon="truck" onPress={() => setTab('shipments')} />
          <TabChip active={tab === 'reports'} label="Reports" icon="bar-chart-2" onPress={() => setTab('reports')} />
          <TabChip active={tab === 'inbox'} label="Inbox" icon="bell" onPress={() => setTab('inbox')} />
        </>
      ) : undefined}
    >
      {tab === 'home' ? (
        <ExporterOverviewTab
          bundle={bundle}
          online={online}
          processing={processing}
          refreshing={refreshing}
          refresh={() => refresh(true)}
          syncItems={syncItems}
          syncHistory={syncHistory}
          lastCompletedAt={lastCompletedAt}
          processNow={processNow}
        />
      ) : tab === 'plots' ? (
        <ExporterPlotsTab
          bundle={bundle}
          mapRef={mapRef}
          mapHeight={320}
          mapRegion={mapRegion}
          plotGeometryType={plotGeometryType}
          draftCoordinates={draftCoordinates}
          plotName={plotName}
          plotCommodity={plotCommodity}
          plotCountry={plotCountry}
          selectedSupplierId={selectedSupplierId}
          autoArea={autoArea}
          locationBusy={locationBusy}
          activePlotSync={activePlotSync}
          syncItems={syncItems}
          setPlotGeometryType={setPlotGeometryType}
          setDraftCoordinates={setDraftCoordinates}
          setPlotName={setPlotName}
          setPlotCommodity={setPlotCommodity}
          setPlotCountry={setPlotCountry}
          setSelectedSupplierId={setSelectedSupplierId}
          useCurrentLocation={useCurrentLocation}
          onMapPress={handleMapPress}
          savePlot={savePlot}
        />
      ) : tab === 'evidence' ? (
        <ExporterEvidenceTab
          bundle={bundle}
          documentType={documentType}
          notes={notes}
          activeUpload={activeUpload}
          syncItems={syncItems}
          setDocumentType={setDocumentType}
          setNotes={setNotes}
          onCaptureDocument={handleCaptureDocument}
          onPickDocument={handlePickDocument}
          onRunExtraction={handleRunExtraction}
          onSaveReview={handleSaveExtractionReview}
        />
      ) : tab === 'shipments' ? (
        <ExporterShipmentsTab bundle={bundle} onSubmitShipment={submitShipment} />
      ) : tab === 'reports' ? (
        <ExporterReportsTab bundle={bundle} />
      ) : (
        <ScrollView
          contentContainerStyle={sharedInputStyles.screenContent}
          refreshControl={<RefreshControl tintColor={palette.brandBright} refreshing={refreshing} onRefresh={() => refresh(true)} />}
        >
          <NotificationList notifications={bundle.notifications} emptyLabel="No exporter notifications." />
        </ScrollView>
      )}
    </ProductShell>
  );
};
