import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useVerifierData } from '../../context/MobileDataContext';
import {
  saveNotificationFromMobile,
  updateShipmentStatusFromMobile,
  upsertVerificationCaseFromMobile,
} from '../../services/data';
import { reportMobileError } from '../../services/monitoring';
import { SessionUser, ShipmentWorkflowStatus } from '../../types';
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
import { VerifierTab } from './types';
import { buildApprovalRateTrend, buildReviewCompletionTrend, buildRiskTrend, buildShipmentFunnel } from '../shared/analytics';
import { FunnelChart, InsightCard, InsightGrid, SegmentedControl, StackedRiskBars, TrendBars } from '../shared/MobileInsights';

const statusPalette = (status: ShipmentWorkflowStatus) => {
  if (status === 'APPROVED') return { backgroundColor: palette.goodBg, borderColor: palette.goodLine };
  if (status === 'REJECTED') return { backgroundColor: palette.badBg, borderColor: palette.badLine };
  if (status === 'CLARIFICATION_REQUESTED') return { backgroundColor: palette.warnBg, borderColor: palette.warnLine };
  return { backgroundColor: palette.neutralBg, borderColor: palette.neutralLine };
};

const statusLabels: Record<ShipmentWorkflowStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  CLARIFICATION_REQUESTED: 'Clarification',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const VerifierWorkspace = ({
  session,
  onLogout,
  forcedTab,
  showTabs = true,
}: {
  session: SessionUser;
  onLogout: () => Promise<void>;
  forcedTab?: VerifierTab;
  showTabs?: boolean;
}) => {
  const [tab, setTab] = useState<VerifierTab>(forcedTab ?? 'queue');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ACTIVE');
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [decisionBusy, setDecisionBusy] = useState(false);
  const { bundle, loading, refreshing, refresh } = useVerifierData();

  useEffect(() => {
    if (forcedTab) setTab(forcedTab);
  }, [forcedTab]);

  const selectedShipment = bundle?.shipments.find((item) => item.id === selectedShipmentId) ?? null;
  const selectedCase = selectedShipment ? bundle?.cases.find((item) => item.shipmentId === selectedShipment.id) ?? null : null;

  useEffect(() => {
    setReviewNotes(selectedCase?.reviewerNotes || '');
  }, [selectedCase?.id, selectedCase?.reviewerNotes]);

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
      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'ACTIVE' && ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED'].includes(shipment.status)) ||
        shipment.status === filter ||
        (filter === 'HIGH_RISK' && shipment.report?.overall_shipment_risk === 'HIGH');
      return matchesQuery && matchesFilter;
    });
  }, [bundle, filter, search]);

  const selectedCompany = selectedShipment ? bundle?.companyProfiles.find((item) => item.id === selectedShipment.ownerId) ?? null : null;
  const selectedDocs = selectedShipment ? bundle?.documents.filter((item) => selectedShipment.documentIds.includes(item.id)) ?? [] : [];
  const selectedPlots = selectedShipment ? bundle?.plots.filter((item) => selectedShipment.plotIds.includes(item.id)) ?? [] : [];
  const selectedExtractions = selectedDocs.length
    ? bundle?.extractions.filter((item) => selectedDocs.some((doc) => doc.id === item.documentId)) ?? []
    : [];

  const handleDecision = async (status: 'UNDER_REVIEW' | 'CLARIFICATION_REQUESTED' | 'APPROVED' | 'REJECTED') => {
    if (!selectedShipment) return;
    try {
      setDecisionBusy(true);
      await updateShipmentStatusFromMobile(selectedShipment.id, status);
      await upsertVerificationCaseFromMobile(selectedShipment.id, reviewNotes, status);

      if (selectedShipment.ownerId) {
        await saveNotificationFromMobile({
          recipientUserId: selectedShipment.ownerId,
          title:
            status === 'APPROVED'
              ? 'Shipment approved'
              : status === 'REJECTED'
                ? 'Shipment rejected'
                : status === 'CLARIFICATION_REQUESTED'
                  ? 'Clarification requested'
                  : 'Shipment moved into review',
          message:
            status === 'APPROVED'
              ? `${selectedShipment.invoiceId} is approved from the mobile verifier queue.`
              : status === 'REJECTED'
                ? `${selectedShipment.invoiceId} was rejected. Review the verifier notes in the app or website.`
                : status === 'CLARIFICATION_REQUESTED'
                  ? `${selectedShipment.invoiceId} needs clarification before approval can continue.`
                  : `${selectedShipment.invoiceId} is now under active review.`,
          route: '/mobile/exporter/shipments',
          level: status === 'APPROVED' ? 'success' : 'warning',
        });
      }

      if (status === 'APPROVED') {
        await saveNotificationFromMobile({
          recipientRole: 'importer',
          title: 'Approved shipment package ready',
          message: `${selectedShipment.invoiceId} is approved and ready for importer handoff.`,
          route: '/mobile/importer/packages',
          level: 'success',
        });
      }

      setSelectedShipmentId('');
      await refresh(true);
      Alert.alert('Verifier action saved', `${selectedShipment.invoiceId} is now ${statusLabels[status].toLowerCase()}.`);
    } catch (error) {
      void reportMobileError({
        source: 'verifier-decision',
        error,
        context: { shipmentId: selectedShipment.id, status },
      });
      Alert.alert('Decision failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setDecisionBusy(false);
    }
  };

  if (loading || !bundle) return <LoadingScreen label="Loading verifier queue" />;

  const submittedCount = bundle.shipments.filter((item) => item.status === 'SUBMITTED').length;
  const reviewCount = bundle.shipments.filter((item) => item.status === 'UNDER_REVIEW').length;
  const highRiskCount = bundle.shipments.filter((item) => item.report?.overall_shipment_risk === 'HIGH').length;
  const reviewedEvidenceCount = bundle.extractions.filter((item) => item.status === 'REVIEWED').length;

  return (
    <ProductShell
      session={session}
      title="Verifier"
      subtitle="Review cases, inspect evidence, and move decisions from the phone."
      onLogout={onLogout}
      tabs={showTabs ? (
        <>
          <TabChip active={tab === 'queue'} label="Queue" icon="check-square" onPress={() => setTab('queue')} />
          <TabChip active={tab === 'inbox'} label="Inbox" icon="bell" onPress={() => setTab('inbox')} />
        </>
      ) : undefined}
    >
      {tab === 'queue' ? (
        <ScrollView
          contentContainerStyle={sharedInputStyles.screenContent}
          refreshControl={<RefreshControl tintColor={palette.brandBright} refreshing={refreshing} onRefresh={() => refresh(true)} />}
        >
          <HeroPanel
            eyebrow="Review command"
            title={`${filteredShipments.length} cases in view`}
            body="Search cases, inspect linked evidence, and move decisions without losing shipment context."
            metrics={[
              { label: 'Submitted', value: String(submittedCount) },
              { label: 'Review', value: String(reviewCount) },
              { label: 'High risk', value: String(highRiskCount) },
            ]}
          />
          <InsightGrid>
            <InsightCard label="Reviewed docs" value={reviewedEvidenceCount} helper="Evidence already confirmed by exporter review" tone="good" />
            <InsightCard label="Decided" value={bundle.shipments.filter((item) => ['APPROVED', 'REJECTED'].includes(item.status)).length} helper="Cases already resolved" />
            <InsightCard label="Clarifications" value={bundle.shipments.filter((item) => item.status === 'CLARIFICATION_REQUESTED').length} helper="Need more exporter work" tone="warn" />
            <InsightCard label="Evidence linked" value={bundle.documents.length} helper="Documents available to verifier" />
          </InsightGrid>
          <TrendBars title="Approval rate" subtitle="Approval rate over time" data={buildApprovalRateTrend(bundle.shipments)} />
          <StackedRiskBars title="Risk mix" subtitle="Risk distribution over time" data={buildRiskTrend(bundle.shipments)} />
          <TrendBars title="Review completion" subtitle="Document review completion over time" data={buildReviewCompletionTrend(bundle.documents, bundle.extractions)} />
          <FunnelChart title="Pipeline" subtitle="Shipment pipeline funnel" stages={buildShipmentFunnel(bundle.shipments)} />

          <Section title="Case search" action={`${filteredShipments.length} shown`}>
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
                { value: 'ACTIVE', label: 'Active', badge: bundle.shipments.filter((item) => ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED'].includes(item.status)).length },
                { value: 'ALL', label: 'All', badge: bundle.shipments.length },
                { value: 'HIGH_RISK', label: 'High risk', badge: highRiskCount },
                { value: 'APPROVED', label: 'Approved', badge: bundle.shipments.filter((item) => item.status === 'APPROVED').length },
                { value: 'REJECTED', label: 'Rejected', badge: bundle.shipments.filter((item) => item.status === 'REJECTED').length },
              ]}
            />
          </Section>

          <Section title="Verifier queue">
            {filteredShipments.map((shipment) => {
              const company = bundle.companyProfiles.find((item) => item.id === shipment.ownerId);
              const reviewCase = bundle.cases.find((item) => item.shipmentId === shipment.id);
              const docs = bundle.documents.filter((item) => shipment.documentIds.includes(item.id));
              const plots = bundle.plots.filter((item) => shipment.plotIds.includes(item.id));

              return (
                <RichCard key={shipment.id}>
                  <RichCardTop>
                    <RichCardCopy
                      title={shipment.invoiceId}
                      subtitle={company?.tradeName || company?.legalEntityName || 'Exporter account'}
                    />
                    <StatusPill label={statusLabels[shipment.status]} {...statusPalette(shipment.status)} />
                  </RichCardTop>
                  <View style={sharedInputStyles.infoRow}>
                    <View style={sharedInputStyles.infoToken}><Text style={sharedInputStyles.infoTokenText}>{shipment.product}</Text></View>
                    <View style={sharedInputStyles.infoToken}><Text style={sharedInputStyles.infoTokenText}>{shipment.destinationCountry}</Text></View>
                    <View style={sharedInputStyles.infoToken}><Text style={sharedInputStyles.infoTokenText}>{docs.length} docs</Text></View>
                    <View style={sharedInputStyles.infoToken}><Text style={sharedInputStyles.infoTokenText}>{plots.length} plots</Text></View>
                  </View>
                  <Text style={sharedInputStyles.cardSubtitle}>
                    Risk {shipment.report?.overall_shipment_risk || 'Pending'} / EUDR {shipment.report?.eudr?.status || 'Pending'}
                  </Text>
                  {reviewCase?.reviewerNotes ? <Text style={sharedInputStyles.inlineNote}>{reviewCase.reviewerNotes}</Text> : null}
                  <ActionLink label="Open review" onPress={() => setSelectedShipmentId(shipment.id)} />
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
          <NotificationList notifications={bundle.notifications} emptyLabel="No verifier notifications." />
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
                <InsightCard label="Product" value={selectedShipment.product} helper={selectedShipment.destinationCountry} />
                <InsightCard label="Risk" value={selectedShipment.report?.overall_shipment_risk || 'Pending'} helper={`Status ${statusLabels[selectedShipment.status]}`} tone={selectedShipment.report?.overall_shipment_risk === 'HIGH' ? 'bad' : selectedShipment.report?.overall_shipment_risk === 'MEDIUM' ? 'warn' : 'good'} />
                <InsightCard label="Evidence" value={selectedDocs.length} helper={`${selectedExtractions.filter((item) => item.status === 'REVIEWED').length} reviewed`} />
                <InsightCard label="Plots" value={selectedPlots.length} helper={`${selectedPlots.filter((item) => item.analysis?.status === 'COMPLIANT').length} compliant`} />
              </InsightGrid>

              <Section title="Exporter context">
                <View style={sharedInputStyles.noteCard}>
                  <Text style={sharedInputStyles.cardTitle}>{selectedCompany?.contactName || 'Exporter contact'}</Text>
                  <Text style={sharedInputStyles.cardSubtitle}>{selectedCompany?.contactEmail || 'No email on record'}</Text>
                  <Text style={sharedInputStyles.cardSubtitle}>{selectedCompany?.contactPhone || 'No phone on record'}</Text>
                </View>
              </Section>

              <Section title="Linked evidence" action={`${selectedDocs.length} docs`}>
                {selectedDocs.length ? selectedDocs.map((document) => {
                  const extraction = selectedExtractions.find((item) => item.documentId === document.id);
                  return (
                    <View key={document.id} style={sharedInputStyles.noteCard}>
                      <Text style={sharedInputStyles.cardTitle}>{document.fileName}</Text>
                      <Text style={sharedInputStyles.cardSubtitle}>
                        {(extraction?.detectedDocumentType ?? document.documentType) || 'Awaiting classification'} / {extraction?.status ?? document.ocrStatus ?? 'PENDING'}
                      </Text>
                      <View style={sharedInputStyles.inlineActionRow}>
                        <ActionLink label="Preview" onPress={() => void Linking.openURL(document.previewUrl)} />
                      </View>
                    </View>
                  );
                }) : (
                  <View style={sharedInputStyles.noteCard}>
                    <Text style={sharedInputStyles.cardSubtitle}>No linked documents on this shipment.</Text>
                  </View>
                )}
              </Section>

              <Section title="Linked plots" action={`${selectedPlots.length} plots`}>
                {selectedPlots.length ? selectedPlots.map((plot) => (
                  <View key={plot.id} style={sharedInputStyles.noteCard}>
                    <Text style={sharedInputStyles.cardTitle}>{plot.name}</Text>
                    <Text style={sharedInputStyles.cardSubtitle}>
                      {plot.commodity} / {plot.countryOfProduction} / {plot.analysis?.status || 'PENDING'}
                    </Text>
                  </View>
                )) : (
                  <View style={sharedInputStyles.noteCard}>
                    <Text style={sharedInputStyles.cardSubtitle}>No linked plots on this shipment.</Text>
                  </View>
                )}
              </Section>

              <TextInput
                style={[sharedInputStyles.input, sharedInputStyles.multilineInput]}
                multiline
                placeholder="Add reviewer notes"
                placeholderTextColor={palette.muted}
                value={reviewNotes}
                onChangeText={setReviewNotes}
              />

              <View style={{ gap: 10 }}>
                <Pressable
                  style={({ pressed }) => [sharedInputStyles.primaryButton, pressed && sharedInputStyles.buttonPressed]}
                  onPress={() => handleDecision('UNDER_REVIEW')}
                  disabled={decisionBusy}
                >
                  <Text style={sharedInputStyles.primaryButtonText}>Mark under review</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [sharedInputStyles.primaryButton, { backgroundColor: '#b45309' }, pressed && sharedInputStyles.buttonPressed]}
                  onPress={() => handleDecision('CLARIFICATION_REQUESTED')}
                  disabled={decisionBusy}
                >
                  <Text style={sharedInputStyles.primaryButtonText}>Request clarification</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [sharedInputStyles.primaryButton, { backgroundColor: '#15803d' }, pressed && sharedInputStyles.buttonPressed]}
                  onPress={() => handleDecision('APPROVED')}
                  disabled={decisionBusy}
                >
                  <Text style={sharedInputStyles.primaryButtonText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [sharedInputStyles.primaryButton, { backgroundColor: '#b91c1c' }, pressed && sharedInputStyles.buttonPressed]}
                  onPress={() => handleDecision('REJECTED')}
                  disabled={decisionBusy}
                >
                  <Text style={sharedInputStyles.primaryButtonText}>Reject</Text>
                </Pressable>
              </View>
            </>
          ) : null
        }
      />
    </ProductShell>
  );
};
