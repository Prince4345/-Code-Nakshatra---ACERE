import { DocumentRecord, ExtractionRecord, PlotRecord, ShipmentRecord } from '../../types';

export const buildRecentMonthBuckets = (count = 6) => {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return {
      label: date.toLocaleString('en-US', { month: 'short' }),
      start: date,
      end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
    };
  });
};

const toDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const inBucket = (value: Date | null, bucket: { start: Date; end: Date }) => Boolean(value && value >= bucket.start && value < bucket.end);

export const buildApprovalRateTrend = (shipments: ShipmentRecord[]) => {
  const buckets = buildRecentMonthBuckets();
  return buckets.map((bucket) => {
    const decided = shipments.filter(
      (shipment) => ['APPROVED', 'REJECTED'].includes(shipment.status) && inBucket(toDate(shipment.approvedAt ?? shipment.updatedAt ?? shipment.createdAt), bucket),
    );
    const approved = decided.filter((shipment) => shipment.status === 'APPROVED').length;
    return {
      label: bucket.label,
      value: decided.length ? (approved / decided.length) * 100 : 0,
      helper: decided.length ? `${approved}/${decided.length}` : '0',
    };
  });
};

export const buildRiskTrend = (shipments: ShipmentRecord[]) => {
  const buckets = buildRecentMonthBuckets();
  return buckets.map((bucket) => {
    const bucketShipments = shipments.filter(
      (shipment) => shipment.report && inBucket(toDate(shipment.updatedAt ?? shipment.createdAt), bucket),
    );
    const low = bucketShipments.filter((shipment) => shipment.report?.overall_shipment_risk === 'LOW').length;
    const medium = bucketShipments.filter((shipment) => shipment.report?.overall_shipment_risk === 'MEDIUM').length;
    const high = bucketShipments.filter((shipment) => shipment.report?.overall_shipment_risk === 'HIGH').length;
    return {
      label: bucket.label,
      total: low + medium + high,
      helper: `${low}/${medium}/${high}`,
      segments: [
        { value: low, tone: 'good' as const },
        { value: medium, tone: 'warn' as const },
        { value: high, tone: 'bad' as const },
      ],
    };
  });
};

export const buildReviewCompletionTrend = (documents: DocumentRecord[], extractions: ExtractionRecord[]) => {
  const buckets = buildRecentMonthBuckets();
  return buckets.map((bucket) => {
    const touched = documents.filter((document) => inBucket(toDate(document.updatedAt ?? document.createdAt), bucket)).length;
    const reviewed = extractions.filter((extraction) => extraction.status === 'REVIEWED' && inBucket(toDate(extraction.updatedAt), bucket)).length;
    return {
      label: bucket.label,
      value: touched ? Math.min(100, (reviewed / touched) * 100) : reviewed ? 100 : 0,
      helper: `${reviewed} reviewed`,
    };
  });
};

export const buildShipmentFunnel = (shipments: ShipmentRecord[]) => [
  { label: 'Draft', count: shipments.filter((shipment) => shipment.status === 'DRAFT').length, tone: 'neutral' as const },
  { label: 'Submitted', count: shipments.filter((shipment) => shipment.status === 'SUBMITTED').length, tone: 'warn' as const },
  {
    label: 'Review',
    count: shipments.filter((shipment) => ['UNDER_REVIEW', 'CLARIFICATION_REQUESTED'].includes(shipment.status)).length,
    tone: 'warn' as const,
  },
  { label: 'Approved', count: shipments.filter((shipment) => shipment.status === 'APPROVED').length, tone: 'good' as const },
];

export const buildPlotCoverage = (plots: PlotRecord[]) => ({
  compliant: plots.filter((plot) => plot.analysis?.status === 'COMPLIANT').length,
  flagged: plots.filter((plot) => plot.analysis?.status === 'NON_COMPLIANT').length,
  pending: plots.filter((plot) => !plot.analysis || plot.analysis.status === 'PENDING').length,
});

