import { ComplianceReport, ComplianceStatus, RiskLevel } from '../types';

const CBAM_KEYWORDS = [
  'steel',
  'aluminum',
  'cement',
  'fertilizer',
  'fertilisers',
  'fertilizers',
  'hydrogen',
  'electricity',
];

const EUDR_KEYWORDS = [
  'coffee',
  'cocoa',
  'soy',
  'timber',
  'rubber',
  'palm',
  'cattle',
  'wood',
];

const extractField = (rawText: string, label: string) => {
  const pattern = new RegExp(`${label}:\\s*(.+)`, 'i');
  return rawText.match(pattern)?.[1]?.trim() ?? '';
};

const extractWeight = (rawText: string) => {
  const match = rawText.match(/Quantity\/Weight:\s*([\d.]+)/i);
  return match ? Number(match[1]) : 0;
};

const extractEnergy = (rawText: string) => {
  const kwhMatch = rawText.match(/([\d,.]+)\s*kWh/i);
  if (kwhMatch) return Number(kwhMatch[1].replace(/,/g, ''));

  const numericMatch = rawText.match(/Reported Consumption:\s*([\d,.]+)/i);
  return numericMatch ? Number(numericMatch[1].replace(/,/g, '')) : 0;
};

const containsAny = (value: string, keywords: string[]) => {
  const lower = value.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
};

const hasGeolocationSignal = (rawText: string) => {
  return /(lat|lng|longitude|latitude|geo|polygon|plot|survey|farm)/i.test(rawText);
};

const hasDeforestationSignal = (rawText: string) => {
  return /(deforestation[-\s]?free|verified|satellite|forest|cutoff)/i.test(rawText);
};

const calculateEstimatedEmissions = (product: string, weightTonnes: number, energyKwh: number) => {
  const baseIntensity = product.toLowerCase().includes('aluminum')
    ? 18.5
    : product.toLowerCase().includes('cement')
      ? 0.9
      : product.toLowerCase().includes('fertilizer')
        ? 1.6
        : 2.1;

  const energyAdjustment = energyKwh > 0 ? energyKwh * 0.0007 : 0.35;
  const tonnes = weightTonnes > 0 ? weightTonnes : 1;
  return Number((baseIntensity * tonnes + energyAdjustment).toFixed(2));
};

export const analyzeGeolocation = async (coordinates: number[][], areaHectares: string) => {
  const pointCount = coordinates?.length ?? 0;
  const area = Number(areaHectares) || 0;
  const moderateRisk = area > 4 || pointCount < 4;

  return {
    risk: moderateRisk ? 'HIGH' as const : 'SAFE' as const,
    confidence: moderateRisk ? 68 : 89,
    justification: moderateRisk
      ? 'Boundary precision is limited or the plot is large enough to require stronger verification. Field review recommended.'
      : 'Polygon size and coordinate density are consistent with a low-risk preliminary EUDR screening result.',
    location: 'Offline demo assessment',
    landType: area > 0 ? 'Agricultural / mixed-use plot' : 'Unknown plot',
    riskLevel: moderateRisk ? 'Moderate' : 'Low',
  };
};

export const analyzeCompliance = async (rawText: string): Promise<ComplianceReport> => {
  const invoiceId = extractField(rawText, 'Invoice Number') || 'PENDING';
  const productCategory = extractField(rawText, 'Product Category') || 'Unknown';
  const destinationCountry = extractField(rawText, 'Destination') || 'Unknown';
  const weightTonnes = extractWeight(rawText);
  const energyKwh = extractEnergy(rawText);

  const isCbamProduct = containsAny(productCategory, CBAM_KEYWORDS);
  const isEudrProduct = containsAny(productCategory, EUDR_KEYWORDS) || hasGeolocationSignal(rawText);
  const geolocationProvided = hasGeolocationSignal(rawText);
  const deforestationVerified = hasDeforestationSignal(rawText);
  const reportedEmissions = isCbamProduct
    ? calculateEstimatedEmissions(productCategory, weightTonnes, energyKwh)
    : null;

  const cbamReasons: string[] = [];
  const eudrReasons: string[] = [];

  let cbamStatus = ComplianceStatus.NOT_APPLICABLE;
  let defaultValueTriggered = false;

  if (isCbamProduct) {
    cbamStatus = ComplianceStatus.COMPLIANT;

    if (!energyKwh) {
      defaultValueTriggered = true;
      cbamStatus = ComplianceStatus.RISK;
      cbamReasons.push('Actual energy or process emissions data missing; default intensity estimate applied.');
    }

    if (!weightTonnes) {
      cbamStatus = ComplianceStatus.RISK;
      cbamReasons.push('Shipment weight missing, reducing confidence in embedded emissions output.');
    }
  }

  let eudrStatus = ComplianceStatus.NOT_APPLICABLE;
  if (isEudrProduct) {
    eudrStatus = ComplianceStatus.COMPLIANT;

    if (!geolocationProvided) {
      eudrStatus = ComplianceStatus.RISK;
      eudrReasons.push('No plot-level geolocation or survey reference found for EUDR screening.');
    }

    if (!deforestationVerified) {
      eudrStatus = ComplianceStatus.RISK;
      eudrReasons.push('No explicit post-2020 deforestation verification found in the shipment record.');
    }
  }

  const hasSevereGap = cbamReasons.length + eudrReasons.length >= 3;
  const hasModerateGap = cbamReasons.length + eudrReasons.length > 0;
  const overallRisk = hasSevereGap
    ? RiskLevel.HIGH
    : hasModerateGap
      ? RiskLevel.MEDIUM
      : RiskLevel.LOW;

  return {
    invoice_id: invoiceId,
    product_category: productCategory,
    destination_eu_country: destinationCountry,
    cbam: {
      status: cbamStatus,
      reported_emissions_tCO2: reportedEmissions,
      default_value_triggered: defaultValueTriggered,
      non_compliance_reasons: cbamReasons,
    },
    eudr: {
      status: eudrStatus,
      geolocation_provided: geolocationProvided,
      deforestation_cutoff_verified: deforestationVerified,
      non_compliance_reasons: eudrReasons,
    },
    overall_shipment_risk: overallRisk,
  };
};
