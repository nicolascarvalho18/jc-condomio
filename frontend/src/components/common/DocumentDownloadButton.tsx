import React, { useEffect, useRef, useState } from 'react';
import { Check, FileText, Loader2, RefreshCw, TableProperties } from 'lucide-react';
import { cn } from '../../utils/cn';
import api from '../../api/client';

type DocumentType = 'pdf' | 'excel';
type DownloadState = 'idle' | 'loading' | 'success' | 'error';

interface DocumentDownloadButtonProps {
  type: DocumentType;
  contractId: number;
  contractNumber: string;
  available?: boolean;
  onSuccess?: (fileName: string, type: DocumentType) => void;
  onError?: (type: DocumentType) => void;
}

const getDownloadDate = () => {
  const date = new Date();
  return [date.getDate(), date.getMonth() + 1, date.getFullYear()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
};

const getFileName = (type: DocumentType, contractNumber: string) => {
  const safeContractNumber = contractNumber.replace(/[^a-zA-Z0-9-]/g, '-');
  const extension = type === 'pdf' ? 'pdf' : 'xlsx';
  return `Contrato_${safeContractNumber}_${getDownloadDate()}.${extension}`;
};

export const DocumentDownloadButton: React.FC<DocumentDownloadButtonProps> = ({
  type,
  contractId,
  contractNumber,
  available = true,
  onSuccess,
  onError,
}) => {
  const [state, setState] = useState<DownloadState>('idle');
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPdf = type === 'pdf';
  const fileName = getFileName(type, contractNumber);
  const label = isPdf ? 'PDF' : 'Excel';
  const ariaLabel = isPdf ? 'Baixar contrato em PDF' : 'Exportar relatório para Excel';
  const endpoint = isPdf ? `/reports/contracts/${contractId}/pdf` : `/reports/contracts/${contractId}/excel`;

  useEffect(() => () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
  }, []);

  const handleDownload = async () => {
    if (!available || state === 'loading' || state === 'success') return;

    setState('loading');
    try {
      const response = await api.get(endpoint, { responseType: 'blob' });
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
      if (blob.size === 0) throw new Error('Empty document response');

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);

      setState('success');
      onSuccess?.(fileName, type);
      resetTimerRef.current = setTimeout(() => setState('idle'), 1000);
    } catch (error) {
      console.error(`Erro ao gerar ${type.toUpperCase()} do contrato ${contractNumber}`, error);
      setState('error');
      onError?.(type);
    }
  };

  const Icon = state === 'loading'
    ? Loader2
    : state === 'success'
      ? Check
      : state === 'error'
        ? RefreshCw
        : isPdf
          ? FileText
          : TableProperties;

  const tooltip = !available
    ? 'Documento indisponível'
    : state === 'error'
      ? 'Tentar novamente'
      : isPdf
        ? 'Baixar PDF'
        : 'Exportar para Excel';

  return (
    <div className="group relative inline-flex">
      <button
        type="button"
        onClick={handleDownload}
        disabled={!available || state === 'loading' || state === 'success'}
        aria-label={ariaLabel}
        title={tooltip}
        className={cn(
          'inline-flex h-8 min-w-[84px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md border bg-white px-3 text-xs font-medium transition duration-150 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-45',
          isPdf
            ? 'border-[#D7DCE3] text-[#344054] hover:-translate-y-px hover:border-[#A61F24] hover:bg-[#FBEDEE] hover:text-[#A61F24] hover:shadow-sm focus-visible:ring-[#A61F24]'
            : 'border-[#D7DCE3] text-[#344054] hover:-translate-y-px hover:border-[#25834B] hover:bg-[#EDF7F0] hover:text-[#25834B] hover:shadow-sm focus-visible:ring-[#25834B]',
          state === 'success' && (isPdf ? 'border-[#A61F24] bg-[#FBEDEE] text-[#A61F24]' : 'border-[#25834B] bg-[#EDF7F0] text-[#25834B]'),
          state === 'error' && 'border-[#A61F24] bg-[#FBEDEE] text-[#A61F24]',
          'sm:min-w-[84px] sm:px-3',
        )}
      >
        <Icon className={cn('size-4 shrink-0', state === 'loading' && 'animate-spin motion-reduce:animate-none')} strokeWidth={1.8} />
        <span className="hidden sm:inline">{state === 'loading' ? 'Gerando...' : state === 'success' ? 'Baixado' : state === 'error' ? 'Tentar novamente' : label}</span>
      </button>
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#172033] px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
        {tooltip}
      </span>
    </div>
  );
};
