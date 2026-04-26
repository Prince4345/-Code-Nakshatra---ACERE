import React from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { buildPlotCoverage } from '../../shared/analytics';
import { InsightCard, InsightGrid } from '../../shared/MobileInsights';
import { ExporterBundle, MobileSyncHistoryEntry, MobileSyncQueueItem } from '../../../types';
import {
  ActionLink,
  CardRow,
  HeroPanel,
  NotificationList,
  Section,
  StatusPill,
  sharedInputStyles,
} from '../../../components/ui';
import { palette } from '../../../theme';

const plotStatusPill = (status?: string) => ({
  backgroundColor: status === 'COMPLIANT' ? palette.goodBg : status === 'NON_COMPLIANT' ? palette.badBg : palette.neutralBg,
  borderColor: status === 'COMPLIANT' ? palette.goodLine : status === 'NON_COMPLIANT' ? palette.badLine : palette.neutralLine,
});

const syncLabel = (item: MobileSyncQueueItem) =>
  item.type === 'document-upload'
    ? (item.payload as { fileName: string }).fileName
    : (item.payload as { name: string }).name;

export const ExporterOverviewTab = ({
  bundle,
  online,
  processing,
  refreshing,
  refresh,
  syncItems,
  syncHistory,
  lastCompletedAt,
  processNow,
}: {
  bundle: ExporterBundle;
  online: boolean;
  processing: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  syncItems: MobileSyncQueueItem[];
  syncHistory: MobileSyncHistoryEntry[];
  lastCompletedAt?: string;
  processNow: () => Promise<void>;
}) => {
  const pendingSyncCount = syncItems.length;
  const approvedCount = bundle.shipments.filter((shipment) => shipment.status === 'APPROVED').length;
  const reviewedDocs = bundle.extractions.filter((item) => item.status === 'REVIEWED').length;
  const plotCoverage = buildPlotCoverage(bundle.plots);

  return (
    <ScrollView
      contentContainerStyle={sharedInputStyles.screenContent}
      refreshControl={<RefreshControl tintColor={palette.brandBright} refreshing={refreshing} onRefresh={refresh} />}
    >
      <HeroPanel
        eyebrow="Mobile command center"
        title={bundle.profile?.tradeName || bundle.profile?.legalEntityName || 'Complete your exporter workspace'}
        body="Track shipment readiness, review evidence progress, and keep plot screening moving without going back to the desktop app."
        metrics={[
          { label: 'Shipments', value: String(bundle.shipments.length) },
          { label: 'Evidence', value: String(bundle.documents.length) },
          { label: 'Sync', value: pendingSyncCount ? String(pendingSyncCount) : online ? 'Live' : 'Offline' },
        ]}
      />

      <InsightGrid>
        <InsightCard label="Approved" value={approvedCount} helper="Packages already cleared for handoff" tone="good" />
        <InsightCard label="Reviewed docs" value={reviewedDocs} helper={`${Math.round((reviewedDocs / Math.max(bundle.documents.length, 1)) * 100)}% evidence confirmed`} tone="good" />
        <InsightCard label="Compliant plots" value={plotCoverage.compliant} helper={`${plotCoverage.flagged} flagged / ${plotCoverage.pending} pending`} tone="neutral" />
        <InsightCard label="Sync state" value={processing ? 'Syncing' : online ? 'Online' : 'Offline'} helper={pendingSyncCount ? `${pendingSyncCount} queued actions` : 'Everything synced'} tone={online ? 'good' : 'warn'} />
      </InsightGrid>

      <Section title="Sync health" action={online ? 'Online' : 'Offline'}>
        <CardRow
          title={processing ? 'Syncing changes' : pendingSyncCount ? 'Pending sync actions' : 'All changes synced'}
          subtitle={
            pendingSyncCount
              ? `${pendingSyncCount} action${pendingSyncCount === 1 ? '' : 's'} waiting or retrying`
              : online
                ? 'Uploads and saves are ready to run immediately.'
                : 'New changes will queue until your device reconnects.'
          }
          right={<ActionLink label="Sync now" onPress={() => void processNow()} />}
        />
        {syncItems.slice(0, 3).map((item) => (
          <CardRow
            key={item.id}
            title={syncLabel(item)}
            subtitle={item.status === 'failed' ? item.lastError || 'Retry needed.' : `${item.progress}% complete`}
            right={
              <StatusPill
                label={item.status}
                backgroundColor={item.status === 'failed' ? palette.badBg : item.status === 'processing' ? palette.neutralBg : palette.warnBg}
                borderColor={item.status === 'failed' ? palette.badLine : item.status === 'processing' ? palette.neutralLine : palette.warnLine}
              />
            }
          />
        ))}
        {!syncItems.length ? (
          <View style={sharedInputStyles.noteCard}>
            <Text style={sharedInputStyles.cardSubtitle}>The sync queue is clear. New uploads and plot saves will appear here if they need attention.</Text>
          </View>
        ) : null}
      </Section>

      <Section title="Recent sync activity" action={lastCompletedAt ? new Date(lastCompletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No recent sync'}>
        {syncHistory.slice(0, 3).map((entry) => (
          <View key={`${entry.id}-mini`} style={sharedInputStyles.noteCard}>
            <Text style={sharedInputStyles.cardTitle}>{entry.title}</Text>
            <Text style={sharedInputStyles.cardSubtitle}>{entry.description}</Text>
          </View>
        ))}
        {!syncHistory.length ? (
          <View style={sharedInputStyles.noteCard}>
            <Text style={sharedInputStyles.cardSubtitle}>Recent sync activity will appear here after captures, uploads, or plot screening runs.</Text>
          </View>
        ) : null}
      </Section>

      <Section title="Recent shipments" action={`${bundle.shipments.length} total`}>
        {bundle.shipments.slice(0, 4).map((shipment) => (
          <CardRow
            key={shipment.id}
            title={shipment.invoiceId}
            subtitle={`${shipment.product} / ${shipment.destinationCountry}`}
            right={
              <StatusPill
                label={shipment.status}
                backgroundColor={shipment.status === 'APPROVED' ? palette.goodBg : shipment.status === 'REJECTED' ? palette.badBg : palette.neutralBg}
                borderColor={shipment.status === 'APPROVED' ? palette.goodLine : shipment.status === 'REJECTED' ? palette.badLine : palette.neutralLine}
              />
            }
          />
        ))}
      </Section>

      <Section title="Recent plot signals" action={`${bundle.plots.length} tracked`}>
        {bundle.plots.slice(0, 4).map((plot) => (
          <CardRow
            key={plot.id}
            title={plot.name}
            subtitle={`${plot.commodity} / ${plot.countryOfProduction}`}
            right={<StatusPill label={plot.analysis?.status ?? 'PENDING'} {...plotStatusPill(plot.analysis?.status)} />}
          />
        ))}
      </Section>

      <Section title="Alerts" action="Inbox">
        {bundle.notifications.length ? (
          <NotificationList notifications={bundle.notifications.slice(0, 3)} emptyLabel="No alerts." />
        ) : (
          <View style={sharedInputStyles.noteCard}>
            <Text style={sharedInputStyles.cardSubtitle}>No urgent exporter notifications right now.</Text>
          </View>
        )}
      </Section>
    </ScrollView>
  );
};
