import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-lg border border-[#E1E5E8] my-3 shadow-xs">
      <div className="flex items-center justify-center w-10 h-10 bg-slate-100 text-slate-600 rounded-lg mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-md mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-white bg-[#172033] hover:bg-[#27344B] rounded-md transition shadow-xs focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#A61F24]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
