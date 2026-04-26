import React from 'react';
import {
  BillingPlanKey,
  BillingState,
  BillingUsageKind,
  billingRemaining,
  getBillingPlan,
  upgradeBillingPlan,
  usageTotal,
} from '../services/billingModel';
import { UserRole } from '../types';
import { PricingPage } from './PricingPage';

const usageLabels: Record<BillingUsageKind, string> = {
  shipment: 'Shipments',
  report: 'Reports',
  eudr: 'EUDR',
  ocr: 'OCR pages',
  verifierReview: 'Reviews',
  importerDownload: 'Downloads',
};

const roleHeadline: Record<UserRole, string> = {
  exporter: 'Credits for shipment packages.',
  verifier: 'Review capacity for consultant work.',
  importer: 'Buyer-side package access.',
};

export const BillingWorkspace = ({
  role,
  accountName,
  billing,
  onChangeBilling,
}: {
  role: UserRole;
  accountName: string;
  billing: BillingState;
  onChangeBilling: (state: BillingState) => void;
}) => {
  const plan = getBillingPlan(billing.planKey);
  const usageKinds: BillingUsageKind[] =
    role === 'exporter'
      ? ['shipment', 'report', 'eudr', 'ocr', 'verifierReview']
      : role === 'verifier'
        ? ['verifierReview', 'report']
        : ['importerDownload', 'report'];

  const selectPlan = (planKey: BillingPlanKey) => onChangeBilling(upgradeBillingPlan(billing, planKey));
  const downloadInvoice = async () => {
    const { downloadBillingInvoicePdf } = await import('../services/billingPdf');
    downloadBillingInvoicePdf(billing, accountName);
  };

  return (
    <div className="ct-stack ct-billing-workspace">
      <section className="ct-billing-hero">
        <div>
          <div className="ct-badge">DEMO BILLING</div>
          <h2>{roleHeadline[role]}</h2>
          <p>Plans and credits are simulated for the hackathon demo. No Razorpay or Stripe keys required.</p>
        </div>
        <div className="ct-billing-current">
          <span>Current plan</span>
          <strong>{plan.name}</strong>
          <small>{plan.price} {plan.cadence}</small>
        </div>
      </section>

      <div className="ct-billing-meter-grid">
        {usageKinds.map((kind) => {
          const used = usageTotal(billing, kind);
          const limit = plan.limits[kind];
          const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
          return (
            <section key={kind} className="ct-billing-meter">
              <div>
                <span>{usageLabels[kind]}</span>
                <strong>{billingRemaining(billing, kind)} left</strong>
              </div>
              <div className="ct-billing-track"><div style={{ width: `${percent}%` }} /></div>
              <small>{used} used / {limit} included</small>
            </section>
          );
        })}
      </div>

      <section className="ct-card ct-stack">
        <div className="ct-section-head">
          <div className="ct-card-head">
            <div className="ct-card-overline">Usage history</div>
            <h2 className="ct-card-title">Credit events</h2>
            <p className="ct-card-copy">Shows how the business model works during live demo actions.</p>
          </div>
          <button className="ct-secondary-button" type="button" onClick={() => void downloadInvoice()}>
            Download invoice PDF
          </button>
        </div>
        {billing.usage.length ? (
          <div className="ct-billing-timeline">
            {billing.usage.slice(0, 8).map((item) => (
              <div key={item.id} className="ct-billing-event">
                <span>{usageLabels[item.kind]}</span>
                <strong>{item.label}</strong>
                <small>{item.amount} credit(s) / {new Date(item.createdAt).toLocaleString('en-IN')}</small>
              </div>
            ))}
          </div>
        ) : (
          <div className="ct-empty-state">No credit events yet. Run EUDR, OCR, package export, or verifier submission to show usage.</div>
        )}
      </section>

      <PricingPage activePlanKey={billing.planKey} onSelectPlan={selectPlan} />
    </div>
  );
};
