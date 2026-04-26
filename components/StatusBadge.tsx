
import React from 'react';
import { ComplianceStatus, RiskLevel } from '../types';

interface StatusBadgeProps {
  status: ComplianceStatus | RiskLevel;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStyles = () => {
    switch (status) {
      case ComplianceStatus.COMPLIANT:
      case RiskLevel.LOW:
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case ComplianceStatus.NON_COMPLIANT:
      case RiskLevel.HIGH:
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case ComplianceStatus.RISK:
      case RiskLevel.MEDIUM:
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  return (
    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getStyles()}`}>
      {status}
    </span>
  );
};
