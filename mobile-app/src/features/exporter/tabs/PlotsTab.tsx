import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { MapPressEvent, Marker, Polygon, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { CoordinatePoint, ExporterBundle, MobileSyncQueueItem } from '../../../types';
import { ActionLink, CardRow, Field, Section, StatusPill, sharedInputStyles } from '../../../components/ui';
import { palette } from '../../../theme';

const plotStatusPill = (status?: string) => ({
  backgroundColor: status === 'COMPLIANT' ? palette.goodBg : status === 'NON_COMPLIANT' ? palette.badBg : palette.neutralBg,
  borderColor: status === 'COMPLIANT' ? palette.goodLine : status === 'NON_COMPLIANT' ? palette.badLine : palette.neutralLine,
});

export const ExporterPlotsTab = ({
  bundle,
  mapRef,
  mapHeight,
  mapRegion,
  plotGeometryType,
  draftCoordinates,
  plotName,
  plotCommodity,
  plotCountry,
  selectedSupplierId,
  autoArea,
  locationBusy,
  activePlotSync,
  syncItems,
  setPlotGeometryType,
  setDraftCoordinates,
  setPlotName,
  setPlotCommodity,
  setPlotCountry,
  setSelectedSupplierId,
  useCurrentLocation,
  onMapPress,
  savePlot,
}: {
  bundle: ExporterBundle;
  mapRef: React.RefObject<MapView | null>;
  mapHeight: number;
  mapRegion: Region;
  plotGeometryType: 'point' | 'polygon';
  draftCoordinates: CoordinatePoint[];
  plotName: string;
  plotCommodity: string;
  plotCountry: string;
  selectedSupplierId: string;
  autoArea: string;
  locationBusy: boolean;
  activePlotSync?: MobileSyncQueueItem;
  syncItems: MobileSyncQueueItem[];
  setPlotGeometryType: React.Dispatch<React.SetStateAction<'point' | 'polygon'>>;
  setDraftCoordinates: React.Dispatch<React.SetStateAction<CoordinatePoint[]>>;
  setPlotName: React.Dispatch<React.SetStateAction<string>>;
  setPlotCommodity: React.Dispatch<React.SetStateAction<string>>;
  setPlotCountry: React.Dispatch<React.SetStateAction<string>>;
  setSelectedSupplierId: React.Dispatch<React.SetStateAction<string>>;
  useCurrentLocation: () => Promise<void>;
  onMapPress: (event: MapPressEvent) => void;
  savePlot: () => Promise<void>;
}) => (
  <ScrollView contentContainerStyle={sharedInputStyles.screenContent}>
    <Section title="Mobile plot capture" subtitle="Tap to place a point or build a polygon, then save and run EUDR from the phone.">
      <Field label="Geometry mode">
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Pressable
            onPress={() => {
              setPlotGeometryType('point');
              setDraftCoordinates((current) => (current[0] ? [current[0]] : []));
            }}
            style={[
              sharedInputStyles.modeChip,
              plotGeometryType === 'point' && sharedInputStyles.modeChipActive,
            ]}
          >
            <Text style={[sharedInputStyles.modeChipText, plotGeometryType === 'point' && sharedInputStyles.modeChipTextActive]}>Point</Text>
          </Pressable>
          <Pressable
            onPress={() => setPlotGeometryType('polygon')}
            style={[
              sharedInputStyles.modeChip,
              plotGeometryType === 'polygon' && sharedInputStyles.modeChipActive,
            ]}
          >
            <Text style={[sharedInputStyles.modeChipText, plotGeometryType === 'polygon' && sharedInputStyles.modeChipTextActive]}>Polygon</Text>
          </Pressable>
        </View>
      </Field>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ height: mapHeight, borderRadius: 22 }}
        initialRegion={mapRegion}
        onPress={onMapPress}
        mapType="hybrid"
      >
        {draftCoordinates.map((coordinate, index) => (
          <Marker
            key={`${coordinate.lat}-${coordinate.lng}-${index}`}
            coordinate={{ latitude: coordinate.lat, longitude: coordinate.lng }}
            draggable
            onDragEnd={(event) => {
              const next = [...draftCoordinates];
              next[index] = {
                lat: event.nativeEvent.coordinate.latitude,
                lng: event.nativeEvent.coordinate.longitude,
              };
              setDraftCoordinates(next);
            }}
          />
        ))}
        {plotGeometryType === 'polygon' && draftCoordinates.length >= 3 ? (
          <Polygon
            coordinates={draftCoordinates.map((coordinate) => ({
              latitude: coordinate.lat,
              longitude: coordinate.lng,
            }))}
            strokeColor={palette.brandBright}
            fillColor="rgba(96,165,250,0.18)"
            strokeWidth={2}
          />
        ) : null}
      </MapView>

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Pressable style={sharedInputStyles.modeChip} onPress={() => void useCurrentLocation()}>
          {locationBusy ? <ActivityIndicator color={palette.text} /> : <Text style={sharedInputStyles.modeChipText}>Use GPS</Text>}
        </Pressable>
        <Pressable style={sharedInputStyles.modeChip} onPress={() => setDraftCoordinates((current) => current.slice(0, -1))}>
          <Text style={sharedInputStyles.modeChipText}>Undo point</Text>
        </Pressable>
        <Pressable style={sharedInputStyles.modeChip} onPress={() => setDraftCoordinates([])}>
          <Text style={sharedInputStyles.modeChipText}>Clear draft</Text>
        </Pressable>
      </View>

      <Field label="Plot name">
        <TextInput style={sharedInputStyles.input} placeholder="Hassan cluster" placeholderTextColor={palette.muted} value={plotName} onChangeText={setPlotName} />
      </Field>
      <Field label="Commodity">
        <TextInput style={sharedInputStyles.input} placeholder="Coffee" placeholderTextColor={palette.muted} value={plotCommodity} onChangeText={setPlotCommodity} />
      </Field>
      <Field label="Country">
        <TextInput style={sharedInputStyles.input} placeholder="India" placeholderTextColor={palette.muted} value={plotCountry} onChangeText={setPlotCountry} />
      </Field>
      <Field label="Supplier">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 10 }}>
          {bundle.suppliers.map((supplier) => (
            <Pressable
              key={supplier.id}
              onPress={() => setSelectedSupplierId(supplier.id)}
              style={[sharedInputStyles.modeChip, selectedSupplierId === supplier.id && sharedInputStyles.modeChipActive]}
            >
              <Text style={[sharedInputStyles.modeChipText, selectedSupplierId === supplier.id && sharedInputStyles.modeChipTextActive]}>{supplier.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Field>

      {plotGeometryType === 'polygon' && autoArea ? (
        <View style={sharedInputStyles.noteCard}>
          <Text style={sharedInputStyles.cardTitle}>Estimated area</Text>
          <Text style={sharedInputStyles.cardSubtitle}>{autoArea} hectares from the current mobile draft.</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [sharedInputStyles.primaryButton, pressed && sharedInputStyles.buttonPressed]}
        onPress={() => void savePlot()}
        disabled={Boolean(activePlotSync)}
      >
        {activePlotSync ? <ActivityIndicator color={palette.text} /> : <Text style={sharedInputStyles.primaryButtonText}>Save and run EUDR</Text>}
      </Pressable>
      {activePlotSync ? (
        <View style={sharedInputStyles.noteCard}>
          <Text style={sharedInputStyles.cardTitle}>Plot sync in progress</Text>
          <Text style={sharedInputStyles.cardSubtitle}>{activePlotSync.progress}% complete.</Text>
        </View>
      ) : null}
    </Section>

    <Section title="Recent saved plots" action={`${bundle.plots.length} total`}>
      {bundle.plots.slice(0, 8).map((plot) => (
        <CardRow
          key={plot.id}
          title={plot.name}
          subtitle={`${plot.commodity} / ${plot.countryOfProduction}`}
          right={<StatusPill label={plot.analysis?.status ?? 'PENDING'} {...plotStatusPill(plot.analysis?.status)} />}
        />
      ))}
      {syncItems.filter((item) => item.type === 'plot-save' && item.status !== 'processing').map((item) => (
        <View key={item.id} style={sharedInputStyles.noteCard}>
          <Text style={sharedInputStyles.cardTitle}>{(item.payload as { name: string }).name}</Text>
          <Text style={sharedInputStyles.cardSubtitle}>{item.status === 'failed' ? item.lastError || 'Retry needed.' : 'Queued for sync.'}</Text>
        </View>
      ))}
    </Section>
  </ScrollView>
);

