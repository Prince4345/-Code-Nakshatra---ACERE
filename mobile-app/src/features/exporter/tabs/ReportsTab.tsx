import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { buildApprovalRateTrend, buildRiskTrend } from '../../shared/analytics';
import { InsightCard, InsightGrid, StackedRiskBars, TrendBars } from '../../shared/MobileInsights';
import { ExporterBundle } from '../../../types';
import { ActionLink, Section, sharedInputStyles } from '../../../components/ui';

export const ExporterReportsTab = ({
  bundle,
}: {
  bundle: ExporterBundle;
}) => {
  const reportReady = bundle.shipments.filter((shipment) => shipment.report).length;
  const ddsReady = bundle.shipments.filter((shipment) => shipment.report?.eudr?.dds_ready).length;
  const eudrPassed = bundle.shipments.filter((shipment) => shipment.report?.eudr?.status === 'COMPLIANT').length;
  const totalEmissions = bundle.shipments.reduce((total, shipment) => total + (shipment.report?.cbam?.reported_emissions_tCO2 ?? 0), 0);

  return (
    <ScrollView contentContainerStyle={sharedInputStyles.screenContent}>
      <Section title="Mobile reports" subtitle="Open compliance signals quickly without going back to dense desktop report screens.">
        <InsightGrid>
          <InsightCard label="Report ready" value={reportReady} helper="Shipments with generated compliance reports" tone="good" />
          <InsightCard label="DDS ready" value={ddsReady} helper="Packages ready for importer handoff" tone="good" />
          <InsightCard label="EUDR pass" value={eudrPassed} helper="Compliant EUDR report outcomes" />
          <InsightCard label="Total emissions" value={`${totalEmissions.toFixed(1)} tCO2`} helper="CBAM reported emissions" />
        </InsightGrid>
        <TrendBars title="Approval rate" subtitle="Approval rate over time" data={buildApprovalRateTrend(bundle.shipments)} />
        <StackedRiskBars title="Risk mix" subtitle="Risk distribution over time" data={buildRiskTrend(bundle.shipments)} />
      </Section>

      <Section title="Release packs" action={`${bundle.shipments.filter((shipment) => shipment.report).length} ready`}>
        {bundle.shipments.filter((shipment) => shipment.report).map((shipment) => (
          <View key={shipment.id} style={sharedInputStyles.richCard}>
            <Text style={sharedInputStyles.cardTitle}>{shipment.invoiceId}</Text>
            <Text style={sharedInputStyles.cardSubtitle}>{shipment.product} / {shipment.destinationCountry}</Text>
            <View style={sharedInputStyles.infoRow}>
              <View style={sharedInputStyles.infoToken}>
                <Text style={sharedInputStyles.infoTokenText}>Risk {shipment.report?.overall_shipment_risk}</Text>
              </View>
              <View style={sharedInputStyles.infoToken}>
                <Text style={sharedInputStyles.infoTokenText}>EUDR {shipment.report?.eudr?.status}</Text>
              </View>
              <View style={sharedInputStyles.infoToken}>
                <Text style={sharedInputStyles.infoTokenText}>CBAM {shipment.report?.cbam?.status}</Text>
              </View>
            </View>
            <Text style={sharedInputStyles.cardSubtitle}>
              DDS {shipment.report?.eudr?.dds_ready ? 'ready' : 'not ready'} / {(shipment.report?.cbam?.reported_emissions_tCO2 ?? 0).toFixed(1)} tCO2
            </Text>
            <View style={sharedInputStyles.inlineActionRow}>
              <ActionLink label="Open in web" onPress={() => {}} />
            </View>
          </View>
        ))}
      </Section>
    </ScrollView>
  );
};

