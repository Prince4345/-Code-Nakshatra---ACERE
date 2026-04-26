import React from 'react';
import { BILLING_PLANS, BillingPlanKey } from '../services/billingModel';

export const PricingPage = ({
  activePlanKey,
  onSelectPlan,
}: {
  activePlanKey?: BillingPlanKey;
  onSelectPlan?: (planKey: BillingPlanKey) => void;
}) => (
  <div className="ct-pricing-shell">
    <section className="ct-pricing-hero">
      <div>
        <div className="ct-badge">BUSINESS MODEL</div>
        <h1>Subscription plans for a real compliance SaaS.</h1>
        <p>Demo mode: no payment gateway needed. Plans, limits, credits, invoices, and upgrade logic are visible inside the product.</p>
      </div>
      <div className="ct-pricing-proof">
        <strong>Rs. 499 - Rs. 2,999</strong>
        <span>per shipment package credit</span>
      </div>
    </section>

    <div className="ct-pricing-grid">
      {BILLING_PLANS.map((plan) => {
        const isActive = plan.key === activePlanKey;
        return (
          <section key={plan.key} className={`ct-pricing-card ${isActive ? 'is-active' : ''}`}>
            <div className="ct-pricing-card-top">
              <span>{plan.badge}</span>
              {isActive ? <strong>Current</strong> : null}
            </div>
            <h2>{plan.name}</h2>
            <p>{plan.audience}</p>
            <div className="ct-price-line">
              <strong>{plan.price}</strong>
              <span>{plan.cadence}</span>
            </div>
            <div className="ct-plan-limits">
              <span>{plan.limits.shipment} shipments</span>
              <span>{plan.limits.ocr} OCR</span>
              <span>{plan.limits.verifierReview} reviews</span>
              <span>{plan.limits.importerDownload} downloads</span>
            </div>
            <ul className="ct-plan-feature-list">
              {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            {onSelectPlan ? (
              <button className={isActive ? 'ct-secondary-button' : 'ct-primary-button'} type="button" onClick={() => onSelectPlan(plan.key)}>
                {isActive ? 'Active plan' : 'Simulate upgrade'}
              </button>
            ) : null}
          </section>
        );
      })}
    </div>
  </div>
);
