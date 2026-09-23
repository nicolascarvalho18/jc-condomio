import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Info, Loader2 } from 'lucide-react';
import { StandardStatus, STANDARD_STATUS_LABELS, normalizeStandardStatus } from '../../types';
import { Modal } from './Modal';

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    status: StandardStatus;
    reason?: string;
    notes?: string;
    statusDate: string;
  }) => Promise<void> | void;
  currentStatus?: string | null;
  targetStatus: StandardStatus;
  entityName: string;
  entityTitle?: string;
  isLoading?: boolean;
}

const statusStyles: Record<StandardStatus, string> = {
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  PAUSED: 'border-amber-200 bg-amber-50 text-amber-800',
  FINISHED: 'border-slate-200 bg-slate-100 text-slate-700',
  CANCELLED: 'border-rose-200 bg-rose-50 text-rose-800',
};

const descriptions: Record<StandardStatus, string> = {
  ACTIVE: 'Retoma a operação normal e libera o acompanhamento do cadastro.',
  PAUSED: 'Interrompe temporariamente as atividades e cobranças. O cadastro poderá ser reativado depois.',
  FINISHED: 'Finaliza as atividades deste cadastro. Essa ação indica que o processo foi concluído.',
  CANCELLED: 'Interrompe definitivamente este cadastro e registra a justificativa na auditoria.',
};

const getToday = () => new Date().toISOString().split('T')[0];

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  targetStatus,
  entityName,
  entityTitle,
  isLoading = false,
}) => {
  const currentNormalized = normalizeStandardStatus(currentStatus);
  const [selectedStatus, setSelectedStatus] = useState<StandardStatus>(targetStatus);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [statusDate, setStatusDate] = useState(getToday);
  const [showNotes, setShowNotes] = useState(false);
  const [confirmedImpact, setConfirmedImpact] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ date?: string; reason?: string; confirmation?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedStatus(targetStatus);
    setReason('');
    setNotes('');
    setStatusDate(getToday());
    setShowNotes(false);
    setConfirmedImpact(false);
    setFieldErrors({});
    setSubmitError(null);
  }, [isOpen, targetStatus]);

  const requiresConfirmation = selectedStatus === 'FINISHED' || selectedStatus === 'CANCELLED';
  const subject = useMemo(() => {
    if (entityName.toLowerCase().includes('cliente')) return 'cliente';
    if (entityName.toLowerCase().includes('contrato')) return 'contrato';
    if (entityName.toLowerCase().includes('parcela')) return 'parcela';
    return 'condomínio';
  }, [entityName]);

  const actionVerbs: Record<StandardStatus, string> = {
    ACTIVE: 'Ativar',
    PAUSED: 'Pausar',
    FINISHED: 'Encerrar',
    CANCELLED: 'Cancelar',
  };
  const actionLabel = `${actionVerbs[selectedStatus]} ${subject}`;
  const canSubmit = Boolean(isValidDate(statusDate) && reason.trim().length > 0 && reason.trim().length <= 250 && (!requiresConfirmation || confirmedImpact));

  const validate = () => {
    const errors: typeof fieldErrors = {};
    if (!isValidDate(statusDate)) errors.date = 'Informe uma data válida.';
    if (!reason.trim()) errors.reason = 'Informe o motivo da alteração.';
    else if (reason.trim().length > 250) errors.reason = 'O motivo deve ter no máximo 250 caracteres.';
    if (requiresConfirmation && !confirmedImpact) errors.confirmation = 'Confirme que você compreendeu o impacto desta ação.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    try {
      await onConfirm({
        status: selectedStatus,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        statusDate,
      });
      onClose();
    } catch (error: any) {
      console.error('Erro ao alterar status', error);
      setSubmitError('Não foi possível salvar a alteração. Tente novamente.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Alterar status" maxWidth="max-w-[560px]" widthClassName="w-[90%]" contentClassName="p-6 max-h-[82vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold leading-5 text-[#172033]">{entityTitle || entityName.replace(/^[^\s]+\s+["“]?(.+?)["”]?$/, '$1')}</p>
        </div>

        <section aria-label="Comparação dos status" className="flex items-center gap-2.5">
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs font-medium text-[#64748B]">Atual</span>
            <span className="inline-flex items-center rounded-md border border-[#D7DCE3] bg-slate-100 px-2.5 py-1 text-xs font-medium text-[#475569]">{currentNormalized ? STANDARD_STATUS_LABELS[currentNormalized] : 'Status não informado'}</span>
          </div>
          <ArrowRight className="size-4 shrink-0 text-[#98A2B3]" aria-hidden="true" />
          <div className="flex min-w-0 items-center gap-2">
            <label htmlFor="new-status" className="shrink-0 text-xs font-medium text-[#64748B]">Novo</label>
            <select id="new-status" autoFocus value={selectedStatus} onChange={(event) => { setSelectedStatus(event.target.value as StandardStatus); setConfirmedImpact(false); setFieldErrors({}); }} disabled={isLoading} className={`h-9 w-auto min-w-[112px] rounded-md border px-2.5 text-xs font-medium focus:border-[#315B8A] focus:outline-none focus:ring-2 focus:ring-[#315B8A]/15 ${statusStyles[selectedStatus]}`}>
              {(Object.keys(STANDARD_STATUS_LABELS) as StandardStatus[]).filter((status) => status !== currentNormalized).map((status) => <option key={status} value={status}>{STANDARD_STATUS_LABELS[status]}</option>)}
            </select>
          </div>
        </section>

        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-4 text-amber-900">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
          <p>{descriptions[selectedStatus]}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="status-date" className="mb-1.5 block text-xs font-semibold text-[#172033]">Data da alteração <span className="text-[#A61F24]">*</span></label>
            <input id="status-date" type="date" value={statusDate} onChange={(event) => { setStatusDate(event.target.value); setFieldErrors((current) => ({ ...current, date: undefined })); }} disabled={isLoading} required aria-invalid={Boolean(fieldErrors.date)} className="h-10 w-full rounded-md border border-[#D7DCE3] bg-white px-3 text-xs text-[#172033] outline-none transition focus:border-[#A61F24] focus:ring-2 focus:ring-[#A61F24]/15" />
            {fieldErrors.date && <p className="mt-1 text-[11px] text-[#A61F24]">{fieldErrors.date}</p>}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="status-reason" className="text-xs font-semibold text-[#172033]">Motivo <span className="text-[#A61F24]">*</span></label>
              <span className={`text-[11px] ${reason.length > 250 ? 'text-[#A61F24]' : 'text-[#64748B]'}`}>{reason.length}/250</span>
            </div>
            <textarea id="status-reason" value={reason} maxLength={250} onChange={(event) => { setReason(event.target.value); setFieldErrors((current) => ({ ...current, reason: undefined })); }} disabled={isLoading} required rows={3} placeholder="Explique resumidamente o motivo da alteração" aria-invalid={Boolean(fieldErrors.reason)} className="w-full resize-none rounded-md border border-[#D7DCE3] bg-white px-3 py-2.5 text-xs text-[#172033] outline-none transition placeholder:text-[#98A2B3] focus:border-[#A61F24] focus:ring-2 focus:ring-[#A61F24]/15" />
            {fieldErrors.reason && <p className="mt-1 text-[11px] text-[#A61F24]">{fieldErrors.reason}</p>}
          </div>

          {!showNotes ? (
            <button type="button" onClick={() => setShowNotes(true)} disabled={isLoading} className="text-xs font-medium text-[#A61F24] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A61F24]">Adicionar observação</button>
          ) : (
            <div>
              <label htmlFor="status-notes" className="mb-1.5 block text-xs font-semibold text-[#172033]">Observações adicionais <span className="font-normal text-[#64748B]">(opcional)</span></label>
              <textarea id="status-notes" value={notes} onChange={(event) => setNotes(event.target.value)} disabled={isLoading} rows={3} placeholder="Inclua detalhes importantes para a auditoria" className="w-full resize-none rounded-md border border-[#D7DCE3] bg-white px-3 py-2.5 text-xs text-[#172033] outline-none transition placeholder:text-[#98A2B3] focus:border-[#A61F24] focus:ring-2 focus:ring-[#A61F24]/15" />
            </div>
          )}
        </div>

        {requiresConfirmation && (
          <div>
            <label className="flex items-start gap-2 rounded-md border border-[#D7DCE3] bg-slate-50 px-3 py-2.5 text-xs text-[#344054]">
              <input type="checkbox" checked={confirmedImpact} onChange={(event) => { setConfirmedImpact(event.target.checked); setFieldErrors((current) => ({ ...current, confirmation: undefined })); }} disabled={isLoading} className="mt-0.5 size-4 accent-[#A61F24]" />
              <span>Confirmo que esta alteração {selectedStatus === 'CANCELLED' ? 'cancelará definitivamente' : 'encerrará'} o cadastro do {subject}.</span>
            </label>
            {fieldErrors.confirmation && <p className="mt-1 text-[11px] text-[#A61F24]">{fieldErrors.confirmation}</p>}
          </div>
        )}

        {submitError && <div role="alert" className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800"><AlertCircle className="mt-0.5 size-4 shrink-0" />{submitError}</div>}

        <div className="sticky bottom-[-20px] z-10 -mx-5 flex items-center justify-end gap-2 border-t border-[#E6E8EC] bg-white px-5 pt-4 pb-1">
          <button type="button" onClick={onClose} disabled={isLoading} className="h-10 rounded-md border border-[#D7DCE3] bg-white px-4 text-xs font-medium text-[#344054] transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A61F24] disabled:cursor-not-allowed disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={isLoading || !canSubmit} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-xs font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-45 ${selectedStatus === 'CANCELLED' ? 'bg-[#A61F24] hover:bg-[#8E1B20] focus-visible:ring-[#A61F24]' : 'bg-[#172033] hover:bg-[#25324A] focus-visible:ring-[#172033]'}`}>
            {isLoading && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />}
            {isLoading ? 'Salvando...' : actionLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
};
