import React from 'react';

export interface BadgeProps {
  status?: string;
  variant?: 'neutral' | 'blue' | 'dark' | 'outline' | string;
  className?: string;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ status, variant = 'neutral', className = '', children }) => {
  const getStyle = (s?: string) => {
    if (!s) {
      switch (variant) {
        case 'blue':
          return 'bg-blue-50 text-blue-800 border-blue-200';
        case 'dark':
          return 'bg-slate-800 text-white border-slate-800';
        case 'outline':
          return 'bg-transparent text-slate-600 border-slate-300';
        case 'neutral':
        default:
          return 'bg-slate-100 text-slate-700 border-slate-200';
      }
    }

    switch (s) {
      // Status de Unidade
      case 'AVAILABLE':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'RESERVED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'SOLD':
        return 'bg-slate-800 text-white border-slate-800';
      case 'BLOCKED':
        return 'bg-slate-100 text-slate-500 border-slate-200';

      // Status de Parcela
      case 'PAID':
        return 'bg-slate-900 text-white border-slate-900';
      case 'PENDING':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'PARTIALLY_PAID':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'OVERDUE':
        return 'bg-slate-200 text-slate-800 border-slate-300 font-semibold';
      case 'RENEGOTIATED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-500 border-slate-200 line-through';

      // Status de Contrato
      case 'ACTIVE':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'SETTLED':
        return 'bg-slate-900 text-white border-slate-900';
      case 'DRAFT':
        return 'bg-slate-100 text-slate-600 border-slate-200';

      // Papéis
      case 'ADMIN':
        return 'bg-slate-800 text-white border-slate-800';
      case 'FINANCEIRO':
      case 'OPERADOR':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'CONSULTA':
        return 'bg-slate-100 text-slate-600 border-slate-200';

      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getLabel = (s?: string) => {
    if (!s) return null;
    switch (s) {
      case 'AVAILABLE': return 'Disponível';
      case 'RESERVED': return 'Reservada';
      case 'SOLD': return 'Vendida';
      case 'BLOCKED': return 'Bloqueada';
      case 'PAID': return 'Pago';
      case 'PENDING': return 'A Vencer';
      case 'PARTIALLY_PAID': return 'Pago Parcial';
      case 'OVERDUE': return 'Vencido';
      case 'RENEGOTIATED': return 'Renegociado';
      case 'CANCELLED': return 'Cancelado';
      case 'ACTIVE': return 'Ativo';
      case 'SETTLED': return 'Quitado';
      case 'DRAFT': return 'Rascunho';
      default: return s;
    }
  };

  const content = children || getLabel(status);

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${getStyle(status)} ${className}`}>
      {content}
    </span>
  );
};
