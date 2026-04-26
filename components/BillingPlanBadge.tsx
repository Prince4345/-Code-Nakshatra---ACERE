import React from 'react';
import { BillingState, billingRemaining, getBillingPlan } from '../services/billingModel';

export const BillingPlanBadge = ({
  billing,
  onOpenBilling,
}: {
  billing: BillingState;
  onOpenBilling: () => void;
}) => {
  const plan = getBillingPlan(billing.planKey);
  return (
    <button className="ct-plan-badge" type="button" onClick={onOpenBilling}>
      <span>{plan.name}</span>
      <strong>
        {billingRemaining(billing, 'shipment') ||
          billingRemaining(billing, 'verifierReview') ||
          billingRemaining(billing, 'importerDownload')}{' '}
        left
      </strong>
    </button>
  );
};
