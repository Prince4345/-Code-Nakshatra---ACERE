import { UserRole } from '../types';

export type BillingPlanKey =
  | 'starter'
  | 'growth'
  | 'exporter-pro'
  | 'verifier-desk'
  | 'importer-monitor';

export type BillingUsageKind =
  | 'shipment'
  | 'report'
  | 'eudr'
  | 'ocr'
  | 'verifierReview'
  | 'importerDownload';

export type BillingUsageRecord = {
  id: string;
  kind: BillingUsageKind;
  label: string;
  amount: number;
  createdAt: string;
};

export type BillingInvoice = {
  id: string;
  planKey: BillingPlanKey;
  amount: string;
  status: 'Paid' | 'Demo';
  createdAt: string;
};

export type BillingState = {
  planKey: BillingPlanKey;
  usage: BillingUsageRecord[];
  invoices: BillingInvoice[];
};

export type BillingPlan = {
  key: BillingPlanKey;
  name: string;
  audience: string;
  price: string;
  cadence: string;
  badge: string;
  roleFocus: UserRole;
  limits: Record<BillingUsageKind, number>;
  features: string[];
};

export const BILLING_PLANS: BillingPlan[] = [
  {
    key: 'starter',
    name: 'Starter',
    audience: 'First EU shipment',
    price: 'Rs. 2,999',
    cadence: '/ month',
    badge: 'MSME ENTRY',
    roleFocus: 'exporter',
    limits: { shipment: 3, report: 5, eudr: 5, ocr: 25, verifierReview: 1, importerDownload: 5 },
    features: ['1 workspace user', '3 shipment credits', '25 OCR pages', 'Basic PDF/JSON exports', 'Email support'],
  },
  {
    key: 'growth',
    name: 'Growth',
    audience: 'Recurring exporter',
    price: 'Rs. 9,999',
    cadence: '/ month',
    badge: 'DEMO ACTIVE',
    roleFocus: 'exporter',
    limits: { shipment: 12, report: 30, eudr: 25, ocr: 150, verifierReview: 8, importerDownload: 40 },
    features: ['5 users', '12 shipment credits', '150 OCR pages', 'EUDR + CBAM evidence', 'Verifier submissions'],
  },
  {
    key: 'exporter-pro',
    name: 'Exporter Pro',
    audience: 'Multi-facility exporter',
    price: 'Rs. 24,999',
    cadence: '/ month',
    badge: 'SCALE',
    roleFocus: 'exporter',
    limits: { shipment: 40, report: 100, eudr: 80, ocr: 600, verifierReview: 30, importerDownload: 150 },
    features: ['Unlimited team roles', '40 shipment credits', '600 OCR pages', 'Advanced audit trail', 'Priority support'],
  },
  {
    key: 'verifier-desk',
    name: 'Verifier Desk',
    audience: 'Consultants and reviewers',
    price: 'Rs. 14,999',
    cadence: '/ seat / month',
    badge: 'REVIEW OPS',
    roleFocus: 'verifier',
    limits: { shipment: 0, report: 80, eudr: 0, ocr: 0, verifierReview: 60, importerDownload: 0 },
    features: ['60 review decisions', 'Evidence queue', 'Review notes', 'Decision history', 'Client-ready exports'],
  },
  {
    key: 'importer-monitor',
    name: 'Importer Monitor',
    audience: 'EU buyer / importer',
    price: 'Rs. 49,999',
    cadence: '/ year',
    badge: 'BUYER SIDE',
    roleFocus: 'importer',
    limits: { shipment: 0, report: 120, eudr: 0, ocr: 0, verifierReview: 0, importerDownload: 300 },
    features: ['Approved package center', 'Supplier readiness', 'Risk alerts', 'Bulk downloads', 'Exporter comparison'],
  },
];

export const DEFAULT_PLAN_BY_ROLE: Record<UserRole, BillingPlanKey> = {
  exporter: 'growth',
  verifier: 'verifier-desk',
  importer: 'importer-monitor',
};

export const getBillingPlan = (key: BillingPlanKey) =>
  BILLING_PLANS.find((plan) => plan.key === key) ?? BILLING_PLANS[1];

export const billingStorageKey = (userId: string) => `carbontrace-billing:${userId}`;

export const createInitialBillingState = (role: UserRole): BillingState => ({
  planKey: DEFAULT_PLAN_BY_ROLE[role],
  usage: [],
  invoices: [
    {
      id: `INV-DEMO-${Date.now()}`,
      planKey: DEFAULT_PLAN_BY_ROLE[role],
      amount: getBillingPlan(DEFAULT_PLAN_BY_ROLE[role]).price,
      status: 'Demo',
      createdAt: new Date().toISOString(),
    },
  ],
});

export const readBillingState = (userId: string, role: UserRole): BillingState => {
  try {
    const stored = window.localStorage.getItem(billingStorageKey(userId));
    if (!stored) return createInitialBillingState(role);
    const parsed = JSON.parse(stored) as BillingState;
    return {
      planKey: parsed.planKey ?? DEFAULT_PLAN_BY_ROLE[role],
      usage: Array.isArray(parsed.usage) ? parsed.usage : [],
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
    };
  } catch {
    return createInitialBillingState(role);
  }
};

export const saveBillingState = (userId: string, state: BillingState) => {
  window.localStorage.setItem(billingStorageKey(userId), JSON.stringify(state));
};

export const usageTotal = (state: BillingState, kind: BillingUsageKind) =>
  state.usage.filter((item) => item.kind === kind).reduce((sum, item) => sum + item.amount, 0);

export const billingRemaining = (state: BillingState, kind: BillingUsageKind) => {
  const plan = getBillingPlan(state.planKey);
  return Math.max(0, (plan.limits[kind] ?? 0) - usageTotal(state, kind));
};

export const consumeBillingAction = (
  state: BillingState,
  kind: BillingUsageKind,
  amount: number,
  label: string,
): { ok: true; state: BillingState } | { ok: false; remaining: number; plan: BillingPlan } => {
  const plan = getBillingPlan(state.planKey);
  const remaining = billingRemaining(state, kind);
  if (amount > remaining) return { ok: false, remaining, plan };
  return {
    ok: true,
    state: {
      ...state,
      usage: [
        {
          id: `USE-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          kind,
          label,
          amount,
          createdAt: new Date().toISOString(),
        },
        ...state.usage,
      ].slice(0, 80),
    },
  };
};

export const upgradeBillingPlan = (state: BillingState, planKey: BillingPlanKey): BillingState => ({
  ...state,
  planKey,
  invoices: [
    {
      id: `INV-DEMO-${Date.now()}`,
      planKey,
      amount: getBillingPlan(planKey).price,
      status: 'Demo',
      createdAt: new Date().toISOString(),
    },
    ...state.invoices,
  ].slice(0, 20),
});
