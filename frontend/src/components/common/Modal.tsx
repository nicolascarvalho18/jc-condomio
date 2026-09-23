import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { DetailHeader } from './DetailModal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  detail?: boolean;
  children: React.ReactNode;
  maxWidth?: string;
  widthClassName?: string;
  contentClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  detail = false,
  children,
  maxWidth = 'max-w-2xl',
  widthClassName = 'w-full',
  contentClassName = 'p-5 max-h-[82vh] overflow-y-auto',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center overflow-y-auto bg-slate-950/35 p-4">
      <div className={`relative ${widthClassName} ${maxWidth} bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden my-8 animate-in fade-in-50 duration-150`}>
        {detail ? <DetailHeader title={title} subtitle={subtitle} onClose={onClose} /> : (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A61F24]" aria-label="Fechar modal"><X className="size-[18px]" /></button>
          </div>
        )}
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  );
};
