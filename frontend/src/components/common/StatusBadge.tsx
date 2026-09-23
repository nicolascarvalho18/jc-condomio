import React from 'react';
import { StandardStatus, STANDARD_STATUS_LABELS, normalizeStandardStatus } from '../../types';

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = normalizeStandardStatus(status);
  const label = normalized ? STANDARD_STATUS_LABELS[normalized] : 'Status não informado';

  const getStyles = (st: StandardStatus | null) => {
    switch (st) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'PAUSED':
        return 'bg-amber-50/40 text-amber-900 border-amber-200';
      case 'FINISHED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStyles(
        normalized
      )} ${className}`}
    >
      {label}
    </span>
  );
};
