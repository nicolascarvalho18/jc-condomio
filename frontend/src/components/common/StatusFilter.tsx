import React from 'react';
import { StandardStatus, STANDARD_STATUS_LABELS } from '../../types';

interface StatusFilterProps {
  value: 'ALL' | StandardStatus;
  onChange: (value: 'ALL' | StandardStatus) => void;
  className?: string;
  counts?: {
    ALL?: number;
    ACTIVE?: number;
    PAUSED?: number;
    FINISHED?: number;
    CANCELLED?: number;
  };
}

export const StatusFilter: React.FC<StatusFilterProps> = ({
  value,
  onChange,
  className = '',
  counts,
}) => {
  const options: Array<{ key: 'ALL' | StandardStatus; label: string }> = [
    { key: 'ALL', label: 'Todos' },
    { key: 'ACTIVE', label: STANDARD_STATUS_LABELS.ACTIVE },
    { key: 'PAUSED', label: STANDARD_STATUS_LABELS.PAUSED },
    { key: 'FINISHED', label: STANDARD_STATUS_LABELS.FINISHED },
    { key: 'CANCELLED', label: STANDARD_STATUS_LABELS.CANCELLED },
  ];

  return (
    <div className={`flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200 text-xs ${className}`}>
      {options.map((opt) => {
        const isSelected = value === opt.key;
        const count = counts ? counts[opt.key] : undefined;

        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`px-2.5 py-1 rounded font-medium transition ${
              isSelected
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 border border-transparent'
            }`}
          >
            {opt.label}
            {count !== undefined && (
              <span className={`ml-1.5 text-[10px] ${isSelected ? 'text-slate-500 font-semibold' : 'text-slate-400'}`}>
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
