import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { buildApprovalRateTrend, buildRiskTrend, buildShipmentFunnel } from '../../shared/analytics';
import { FunnelChart, InsightCard, InsightGrid, SegmentedControl, StackedRiskBars, TrendBars } from '../../shared/MobileInsights';
import { ExporterBundle, ShipmentRecord } from '../../../types';
import { ActionLink, Section, StatusPill, sharedInputStyles } from '../../../components/ui';
import { palette } from '../../../theme';

const shipmentTone = (status: ShipmentRecord['status']) => ({
  backgroundColor:
    status === 'APPROVED' ? palette.goodBg : status === 'REJECTED' ? palette.badBg : status === 'CLARIFICATION_REQUESTED' ? palette.warnBg : palette.neutralBg,
  borderColor:
    status === 'APPROVED' ? palette.goodLine : status === 'REJECTED' ? palette.badLine : status === 'CLARIFICATION_REQUESTED' ? palette.warnLine : palette.neutralLine,
});

export const ExporterShipmentsTab = ({
  bundle,
  onSubmitShipment,
}: {
  bundle: ExporterBundle;
  onSubmitShipment: (shipment: ShipmentRecord) => Promise<void>;
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bundle.shipments.filter((shipment) => {
      const matchesQuery =
        !query ||
        `${shipment.invoiceId} ${shipment.product} ${shipment.destinationCountry} ${shipment.hsCode}`.toLowerCase().includes(query);
      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'ACTIVE' && !['APPROVED', 'REJECTED'].includes(shipment.status)) ||
        shipment.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [bundle.shipments, filter, search]);

  const approvedCount = bundle.shipments.filter((shipment) => shipment.status === 'APPROVED').length;
  const underReviewCount = bundle.shipments.filter((shipment) => ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUESTED'].includes(shipment.status)).length;
  const avgEmissions = bundle.shipments.reduce((total, shipment) => total + (shipment.report?.cbam?.reported_emissions_tCO2 ?? 0), 0);

  return (
    <ScrollView contentContainerStyle={sharedInputStyles.screenContent}>
      <Section title="Shipment command" subtitle="Track package movement, risk, and approval performance from mobile.">
        <InsightGrid>
          <InsightCard label="Shipments" value={bundle.shipments.length} helper="Total packages in your exporter workspace" />
          <InsightCard label="Approved" value={approvedCount} helper="Ready for importer handoff" tone="good" />
          <InsightCard label="In review" value={underReviewCount} helper="Waiting on verifier action" tone="warn" />
          <InsightCard label="CBAM emissions" value={`${avgEmissions.toFixed(1)} tCO2`} helper="Across generated reports" />
        </InsightGrid>
        <TrendBars title="Approval rate" subtitle="Approval rate over time" data={buildApprovalRateTrend(bundle.shipments)} />
        <StackedRiskBars title="Risk mix" subtitle="Risk distribution over time" data={buildRiskTrend(bundle.shipments)} />
        <FunnelChart title="Pipeline" subtitle="Shipment pipeline funnel" stages={buildShipmentFunnel(bundle.shipments)} />
      </Section>

      <Section title="Shipment library" action={`${filteredShipments.length} shown`}>
        <TextInput
          style={sharedInputStyles.input}
          placeholder="Invoice, product, destination, HS code"
          placeholderTextColor={palette.muted}
          value={search}
          onChangeText={setSearch}
        />
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ALL', label: 'All', badge: bundle.shipments.length },
            { value: 'ACTIVE', label: 'Active', badge: bundle.shipments.filter((shipment) => !['APPROVED', 'REJECTED'].includes(shipment.status)).length },
            { value: 'APPROVED', label: 'Approved', badge: approvedCount },
            { value: 'REJECTED', label: 'Rejected', badge: bundle.shipments.filter((shipment) => shipment.status === 'REJECTED').length },
          ]}
        />
        {filteredShipments.map((shipment) => (
          <View key={shipment.id} style={sharedInputStyles.richCard}>
            <View style={sharedInputStyles.richCardTop}>
              <View style={sharedInputStyles.richCardCopy}>
                <Text style={sharedInputStyles.cardTitle}>{shipment.invoiceId}</Text>
                <Text style={sharedInputStyles.cardSubtitle}>{shipment.product} / {shipment.destinationCountry}</Text>
              </View>
              <StatusPill label={shipment.status} {...shipmentTone(shipment.status)} />
            </View>
            <View style={sharedInputStyles.infoRow}>
              <View style={sharedInputStyles.infoToken}><Text style={sharedInputStyles.infoTokenText}>{shipment.quantity} {shipment.unit}</Text></View>
              <View style={sharedInputStyles.infoToken}><Text style={sharedInputStyles.infoTokenText}>{shipment.report?.overall_shipment_risk || 'Pending risk'}</Text></View>
              <View style={sharedInputStyles.infoToken}><Text style={sharedInputStyles.infoTokenText}>{shipment.documentIds.length} docs</Text></View>
            </View>
            <Text style={sharedInputStyles.cardSubtitle}>
              EUDR {shipment.report?.eudr?.status || 'Pending'} / CBAM {shipment.report?.cbam?.status || 'Pending'}
            </Text>
            {(shipment.status === 'DRAFT' || shipment.status === 'CLARIFICATION_REQUESTED') ? (
              <Pressable style={sharedInputStyles.primaryButton} onPress={() => void onSubmitShipment(shipment)}>
                <Text style={sharedInputStyles.primaryButtonText}>{shipment.status === 'DRAFT' ? 'Submit for verification' : 'Resubmit package'}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </Section>
    </ScrollView>
  );
};

