import React from 'react';
import { CheckCircle2, CircleAlert, Pencil, X } from 'lucide-react';

export interface DetailFieldProps {
  label: string;
  value?: React.ReactNode;
  fullWidth?: boolean;
}

export const DetailHeader: React.FC<{ title: string; subtitle?: string; onClose: () => void }> = ({ title, subtitle, onClose }) => (
  <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[#E5E7EB] bg-white">
    <div className="min-w-0">
      <h2 className="text-lg font-semibold text-[#172033] tracking-tight">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-[#64748B] truncate">{subtitle}</p>}
    </div>
    <button type="button" onClick={onClose} aria-label="Fechar ficha" className="shrink-0 min-h-10 min-w-10 inline-flex items-center justify-center rounded-md text-[#64748B] hover:bg-[#F8F9FB] hover:text-[#172033] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#A61F24]">
      <X className="h-5 w-5" aria-hidden="true" />
    </button>
  </div>
);

export const DetailSummary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-md bg-[#F8F9FB] px-4 py-3 text-sm">{children}</div>
);

export const DetailSection: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; fullWidth?: boolean }> = ({ title, icon, children, fullWidth }) => (
  <section className={fullWidth ? 'md:col-span-2' : ''}>
    <h3 className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2 text-sm font-semibold text-[#172033]">{icon}<span>{title}</span></h3>
    <div className="grid grid-cols-1 gap-x-8 gap-y-4 pt-4 sm:grid-cols-2">{children}</div>
  </section>
);

export const DetailField: React.FC<DetailFieldProps> = ({ label, value, fullWidth }) => (
  <div className={fullWidth ? 'sm:col-span-2 min-w-0' : 'min-w-0'}>
    <dt className="text-xs font-medium text-[#64748B]">{label}</dt>
    <dd className="mt-1 break-words text-sm text-[#172033]">{value === null || value === undefined || value === '' ? 'Não informado' : value}</dd>
  </div>
);

export const DetailStatus: React.FC<{ children: React.ReactNode; tone?: 'success' | 'warning' | 'danger' | 'neutral' }> = ({ children, tone = 'neutral' }) => {
  const styles = { success: 'bg-emerald-50 text-emerald-700', warning: 'bg-amber-50 text-amber-700', danger: 'bg-[#FBEDEE] text-[#A61F24]', neutral: 'bg-slate-100 text-slate-600' };
  return <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${styles[tone]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{children}</span>;
};

export const DetailFooter: React.FC<{ onClose: () => void; onEdit?: () => void; children?: React.ReactNode }> = ({ onClose, onEdit, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7EB] px-6 py-4">
    <button type="button" onClick={onClose} className="min-h-10 rounded-md border border-[#D7DCE3] bg-white px-4 text-sm font-medium text-[#344054] hover:bg-[#F8F9FB] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#A61F24]">Fechar</button>
    <div className="flex flex-wrap items-center gap-2">
      {onEdit && <button type="button" onClick={onEdit} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#172033] px-4 text-sm font-medium text-white hover:bg-[#27344B] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#A61F24]"><Pencil className="h-4 w-4" aria-hidden="true" />Editar dados</button>}
      {children}
    </div>
  </div>
);

export const DetailFeedback: React.FC<{ kind?: 'success' | 'warning'; children: React.ReactNode }> = ({ kind = 'warning', children }) => (
  <div className={`flex items-start gap-2 rounded-md px-3 py-2.5 text-sm ${kind === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
    {kind === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
    <span>{children}</span>
  </div>
);
