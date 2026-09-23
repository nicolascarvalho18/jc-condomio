import React, { useState } from 'react';
import { StandardStatus, STANDARD_STATUS_LABELS, normalizeStandardStatus } from '../../types';
import { StatusChangeModal } from './StatusChangeModal';
import { cn } from '../../utils/cn';

interface StatusSelectProps {
  status?: string | null;
  currentStatus?: string | null;
  onStatusChange: (payload: {
    status: StandardStatus;
    reason?: string;
    notes?: string;
    statusDate: string;
  }) => Promise<void> | void;
  entityName: string;
  entityTitle?: string;
  disabled?: boolean;
  className?: string;
}

export const StatusSelect: React.FC<StatusSelectProps> = ({
  status,
  currentStatus,
  onStatusChange,
  entityName,
  entityTitle,
  disabled = false,
  className = '',
}) => {
  const currentNormalized = normalizeStandardStatus(currentStatus ?? status);
  const [targetStatus, setTargetStatus] = useState<StandardStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as StandardStatus;
    if (selected === currentNormalized) return;

    setTargetStatus(selected);
    setIsModalOpen(true);
  };

  const handleConfirm = async (payload: {
    status: StandardStatus;
    reason?: string;
    notes?: string;
    statusDate: string;
  }) => {
    setIsSaving(true);
    try {
      await onStatusChange(payload);
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const getSelectStyle = (st: StandardStatus | null) => {
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
        return 'bg-white text-slate-700 border-slate-300';
    }
  };

  return (
    <>
      <select
        value={currentNormalized ?? ''}
        onChange={handleSelectChange}
        disabled={disabled || isSaving}
        className={cn('h-9 cursor-pointer rounded-md border px-2.5 text-xs font-medium transition-colors focus:border-[#A61F24] focus:outline-none focus:ring-2 focus:ring-[#A61F24]/15 disabled:cursor-not-allowed disabled:opacity-60', getSelectStyle(currentNormalized), className)}
      >
        {!currentNormalized && <option value="" disabled>Status não informado</option>}
        <option value="ACTIVE">{STANDARD_STATUS_LABELS.ACTIVE}</option>
        <option value="PAUSED">{STANDARD_STATUS_LABELS.PAUSED}</option>
        <option value="FINISHED">{STANDARD_STATUS_LABELS.FINISHED}</option>
        <option value="CANCELLED">{STANDARD_STATUS_LABELS.CANCELLED}</option>
      </select>

      {targetStatus && (
        <StatusChangeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleConfirm}
          currentStatus={currentNormalized}
          targetStatus={targetStatus}
          entityName={entityName}
          entityTitle={entityTitle}
          isLoading={isSaving}
        />
      )}
    </>
  );
};
