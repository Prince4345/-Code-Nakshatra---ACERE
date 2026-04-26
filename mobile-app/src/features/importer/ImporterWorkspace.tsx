import React, { useEffect, useMemo, useState } from 'react';
import { Linking, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useImporterData } from '../../context/MobileDataContext';
import { SessionUser, ShipmentRecord } from '../../types';
import {
  ActionLink,
  HeroPanel,
  InfoModal,
  LoadingScreen,
  NotificationList,
  ProductShell,
  RichCard,
  RichCardCopy,
  RichCardTop,
  Section,
  StatusPill,
  TabChip,
  sharedInputStyles,
} from '../../components/ui';
import { palette } from '../../theme';
import { ImporterTab } from './types';
import { buildRiskTrend, buildReviewCompletionTrend } from '../shared/analytics';
import { InsightCard, InsightGrid, SegmentedControl, StackedRiskBars, TrendBars } from '../shared/MobileInsights';

const packageReadiness = (shipment: ShipmentRecord) => {
  if (!shipment.report) return 'ATTENTION';
  if (shipment.report.eudr?.dds_ready && shipment.documentIds.length > 0) return 'READY';
  return 'PARTIAL';
};

export const ImporterWorkspace = ({
  session,
  onLogout,
  forcedTab,
  showTabs = true,
}: {
  session: SessionUser;
  onLogout: () => Promise<void>;
  forcedTab?: ImporterTab;
  showTabs?: boolean;
}) => {
  const [tab, setTab] = useState<ImporterTab>(forcedTab ?? 'packages');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('READY');
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const { bundle, loading, refreshing, refresh } = useImporterData();

  useEffect(() => {
    if (forcedTab) setTab(forcedTab);
  }, [forcedTab]);

  const filteredShipments = useMemo(() => {
    if (!bundle) return [];
    const query = search.trim().toLowerCase();
    return bundle.shipments.filter((shipment) => {
      const company = bundle.companyProfiles.find((item) => item.id === shipment.ownerId);
      const matchesQuery =
        !query ||
        `${shipment.invoiceId} ${shipment.product} ${shipment.destinationCountry} ${company?.tradeName || ''} ${company?.legalEntityName || ''}`
          .toLowerCase()
          .includes(query);
      const readiness = packageReadiness(shipment);
      return matchesQuery && (filter === 'ALL' || readiness === filter);
    });
  }, [bundle, filter, search]);

  const selectedShipment = bundle?.shipments.find((item) => item.id === selectedShipmentId) ?? null;
  const selectedCompany = selectedShipment ? bundle?.companyProfiles.find((item) => item.id === selectedShipment.ownerId) ?? null : null;
  const selectedDocs = selectedShipment ? bundle?.documents.filter((item) => selectedShipment.documentIds.includes(item.id)) ?? [] : [];
  const selectedPlots = selectedShipment ? bundle?.plots.filter((item) => selectedShipment.plotIds.includes(item.id)) ?? [] : [];
  const selectedExtractions = selectedDocs.length
    ? bundle?.extractions.filter((item) => selectedDocs.some((document) => document.id === item.documentId)) ?? []
    : [];

  if (loading || !bundle) return <LoadingScreen label="Loading importer handoff" />;

  const readyCount = bundle.shipments.filter((item) => packageReadiness(item) === 'READY').length;
  const exporterCount = new Set(bundle.shipments.map((item) => item.ownerId)).size;
  const docCoverage = bundle.shipments.reduce((total, shipment) => total + shipment.documentIds.length, 0);

  return (
    <ProductShell
      session={session}
      title="Importer"
      subtitle="Search approved packages, inspect exporter evidence, and open handoff files fast."
      onLogout={onLogout}
      tabs={showTabs ? (
        <>
          <TabChip active={tab === 'packages'} label="Packages" icon="package" onPress={() => setTab('packages')} />
          <TabChip active={tab === 'inbox'} label="Inbox" icon="bell" onPress={() => setTab('inbox')} />
        </>
      ) : undefined}
    >
      {tab === 'packages' ? (
        <ScrollView
          contentContainerStyle={sharedInputStyles.screenContent}
          refreshControl={<RefreshControl tintColor={palette.brandBright} refreshing={refreshing} onRefresh={() => refresh(true)} />}
        >
          <HeroPanel
            eyebrow="Package library"
            title={`${filteredShipments.length} approved packages`}
            body="Use importer search to jump straight to the exporter, package evidence, and compliance status that matter before shipment intake."
            metrics={[
              { label: 'Ready', value: String(readyCount) },
              { label: 'Exporters', value: String(exporterCount) },
              { label: 'Docs', value: String(docCoverage) },
            ]}
          />
          <InsightGrid>
            <InsightCard label="Approved" value={bundle.shipments.length} helper="Visible handoff packages" tone="good" />
            <InsightCard label="Ready now" value={readyCount} helper="DDS-ready packages with linked evidence" tone="good" />
            <InsightCard label="Destinations" value={new Set(bundle.shipments.map((item) => item.destinationCountry)).size} helper="EU destinations in the library" />
            <InsightCard label="Reviewed docs" value={bundle.extractions.filter((item) => item.status === 'REVIEWED').length} helper="Documents already quality checked" />
          </InsightGrid>
          <StackedRiskBars title="Risk mix" subtitle="Risk distribution over time" data={buildRiskTrend(bundle.shipments)} />
          <TrendBars title="Review completion" subtitle="Document review completion over time" data={buildReviewCompletionTrend(bundle.documents, bundle.extractions)} />

          <Section title="Search packages" action={`${filteredShipments.length} shown`}>
            <TextInput
              style={sharedInputStyles.input}
              placeholder="Exporter, invoice, product, destination"
              placeholderTextColor={palette.muted}
              value={search}
              onChangeText={setSearch}
            />
            <SegmentedControl
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'READY', label: 'Ready', badge: readyCount },
                { value: 'PARTIAL', label: 'Partial', badge: bundle.shipments.filter((item) => packageReadiness(item) === 'PARTIAL').length },
                { value: 'ATTENTION', label: 'Attention', badge: bundle.shipments.filter((item) => packageReadiness(item) === 'ATTENTION').length },
                { value: 'ALL', label: 'All', badge: bundle.shipments.length },
              ]}
            />
          </Section>

          <Section title="Approved package library">
            {filteredShipments.map((shipment) => {
              const company = bundle.companyProfiles.find((item) => item.id === shipment.ownerId);
              const docs = bundle.documents.filter((item) => shipment.documentIds.includes(item.id));
              const readiness = packageReadiness(shipment);
              return (
                <RichCard key={shipment.id}>
                  <RichCardTop>
                    <RichCardCopy
                      title={shipment.invoiceId}
                      subtitle={company?.tradeName || company?.legalEntityName || 'Exporter'}
                    />
                    <StatusPill
                      label={readiness}
                      backgroundColor={readiness === 'READY' ? palette.goodBg : readiness === 'PARTIAL' ? palette.warnBg : palette.badBg}
                      borderColor={readiness === 'READY' ? palette.goodLine : readiness === 'PARTIAL' ? palette.warnLine : palette.badLine}
                    />
                  </RichCardTop>
                  <View style={sharedInputStyles.infoRow}>
                    <View style={sharedInputStyles.infoToken}><Text style={sharedInputStyles.infoTokenText}>{shipment.product}</Text></View>
                    <View style={sharedInputStyles.infoToken}><Text style={sharedInputStyles.infoTokenText}>{shipment.destinationCountry}</Text></View>
                    <View style={sharedInputStyles.infoToken}><Text style={sharedInputStyles.infoTokenText}>{docs.length} docs</Text></View>
                  </View>
                  <Text style={sharedInputStyles.cardSubtitle}>
                    EUDR {shipment.report?.eudr?.status || 'Pending'} / CBAM {shipment.report?.cbam?.status || 'Pending'}
                  </Text>
                  <ActionLink label="Open package" onPress={() => setSelectedShipmentId(shipment.id)} />
                </RichCard>
              );
            })}
          </Section>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={sharedInputStyles.screenContent}
          refreshControl={<RefreshControl tintColor={palette.brandBright} refreshing={refreshing} onRefresh={() => refresh(true)} />}
        >
          <NotificationList notifications={bundle.notifications} emptyLabel="No importer notifications." />
        </ScrollView>
      )}

      <InfoModal
        visible={Boolean(selectedShipment)}
        title={selectedShipment?.invoiceId || ''}
        subtitle={selectedCompany?.tradeName || selectedCompany?.legalEntityName || 'Exporter'}
        onClose={() => setSelectedShipmentId('')}
        body={
          selectedShipment ? (
            <>
              <InsightGrid>
                <InsightCard label="Exporter" value={selectedCompany?.tradeName || 'Exporter'} helper={selectedCompany?.contactName || 'Contact unavailable'} />
                <InsightCard label="Readiness" value={packageReadiness(selectedShipment)} helper={`Version ${selectedShipment.approvalVersion || 1}`} tone={packageReadiness(selectedShipment) === 'READY' ? 'good' : packageReadiness(selectedShipment) === 'PARTIAL' ? 'warn' : 'bad'} />
                <InsightCard label="Evidence" value={selectedDocs.length} helper={`${selectedExtractions.filter((item) => item.status === 'REVIEWED').length} reviewed`} />
                <InsightCard label="Plots" value={selectedPlots.length} helper={`${selectedPlots.filter((item) => item.analysis?.status === 'COMPLIANT').length} compliant`} />
              </InsightGrid>

              <Section title="Exporter details">
                <View style={sharedInputStyles.noteCard}>
                  <Text style={sharedInputStyles.cardTitle}>{selectedCompany?.contactName || 'No contact name'}</Text>
                  <Text style={sharedInputStyles.cardSubtitle}>{selectedCompany?.contactEmail || 'No contact email'}</Text>
                  <Text style={sharedInputStyles.cardSubtitle}>{selectedCompany?.contactPhone || 'No contact phone'}</Text>
                </View>
              </Section>

              <Section title="Package documents" action={`${selectedDocs.length} docs`}>
                {selectedDocs.length ? selectedDocs.map((document) => {
                  const extraction = selectedExtractions.find((item) => item.documentId === document.id);
                  return (
                    <View key={document.id} style={sharedInputStyles.noteCard}>
                      <Text style={sharedInputStyles.cardTitle}>{document.fileName}</Text>
                      <Text style={sharedInputStyles.cardSubtitle}>
                        {(extraction?.detectedDocumentType ?? document.documentType) || 'Awaiting type'} / {extraction?.status ?? document.ocrStatus ?? 'PENDING'}
                      </Text>
                      <View style={sharedInputStyles.inlineActionRow}>
                        <ActionLink label="Preview" onPress={() => void Linking.openURL(document.previewUrl)} />
                      </View>
                    </View>
                  );
                }) : (
                  <View style={sharedInputStyles.noteCard}>
                    <Text style={sharedInputStyles.cardSubtitle}>No linked documents in this package.</Text>
                  </View>
                )}
              </Section>

              <Section title="Plot coverage" action={`${selectedPlots.length} plots`}>
                {selectedPlots.length ? selectedPlots.map((plot) => (
                  <View key={plot.id} style={sharedInputStyles.noteCard}>
                    <Text style={sharedInputStyles.cardTitle}>{plot.name}</Text>
                    <Text style={sharedInputStyles.cardSubtitle}>
                      {plot.commodity} / {plot.countryOfProduction} / {plot.analysis?.status || 'PENDING'}
                    </Text>
                  </View>
                )) : (
                  <View style={sharedInputStyles.noteCard}>
                    <Text style={sharedInputStyles.cardSubtitle}>No linked plots in this package.</Text>
                  </View>
                )}
              </Section>
            </>
          ) : null
        }
      />
    </ProductShell>
  );
};
