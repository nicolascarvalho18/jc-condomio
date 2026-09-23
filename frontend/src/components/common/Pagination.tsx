import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  page: number; // 0-indexed
  size: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (newPage: number) => void;
  onSizeChange?: (newSize: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  size,
  totalPages,
  totalElements,
  onPageChange,
  onSizeChange,
  pageSizeOptions = [10, 25, 50],
}) => {
  if (totalElements === 0) return null;

  const startItem = page * size + 1;
  const endItem = Math.min((page + 1) * size, totalElements);

  // Calcula páginas visíveis para paginação compacta
  const getVisiblePages = () => {
    const delta = 1;
    const range: (number | string)[] = [];
    for (
      let i = Math.max(0, page - delta);
      i <= Math.min(totalPages - 1, page + delta);
      i++
    ) {
      range.push(i);
    }

    if (typeof range[0] === 'number' && range[0] > 0) {
      if (range[0] > 1) {
        range.unshift('...');
      }
      range.unshift(0);
    }

    if (
      typeof range[range.length - 1] === 'number' &&
      (range[range.length - 1] as number) < totalPages - 1
    ) {
      if ((range[range.length - 1] as number) < totalPages - 2) {
        range.push('...');
      }
      range.push(totalPages - 1);
    }

    return range;
  };

  const visiblePages = totalPages > 1 ? getVisiblePages() : [0];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-600 select-none">
      {/* Informações de Registro e Itens por página */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span>
          Mostrando <span className="font-semibold text-slate-900">{startItem}</span> a{' '}
          <span className="font-semibold text-slate-900">{endItem}</span> de{' '}
          <span className="font-semibold text-slate-900">{totalElements}</span> registros
        </span>

        {onSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-slate-500">Exibir:</span>
            <select
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              aria-label="Registros por página"
              className="bg-slate-50 border border-slate-200 text-slate-700 py-1 px-2 rounded focus:outline-none focus:ring-1 focus:ring-[#A61F24] text-xs font-medium cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / pág
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Controles de navegação de páginas */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(0)}
            disabled={page === 0}
            title="Primeira página"
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            title="Página anterior"
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 mx-1">
            {visiblePages.map((p, idx) => {
              if (typeof p === 'string') {
                return (
                  <span key={`dots-${idx}`} className="px-1 text-slate-400">
                    ...
                  </span>
                );
              }
              const isActive = p === page;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`min-w-[28px] h-7 px-2 text-xs font-medium rounded transition cursor-pointer ${
                    isActive
                      ? 'bg-[#172033] text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            title="Próxima página"
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onPageChange(totalPages - 1)}
            disabled={page >= totalPages - 1}
            title="Última página"
            className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
