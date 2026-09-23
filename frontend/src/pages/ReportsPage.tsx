import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Contract, StandardStatus } from '../types';
import { FileSpreadsheet, Search } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { StatusFilter } from '../components/common/StatusFilter';
import { useToast } from '../context/ToastContext';
import { DocumentDownloadButton } from '../components/common/DocumentDownloadButton';

export const ReportsPage: React.FC = () => {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StandardStatus | 'ALL'>('ALL');
  const handleDownloadSuccess = (fileName: string, type: 'pdf' | 'excel') => {
    toast.success(fileName, type === 'pdf' ? 'PDF baixado com sucesso' : 'Planilha exportada com sucesso');
  };

  const handleDownloadError = () => {
    toast.error('Não foi possível gerar o arquivo', 'Download não concluído');
  };

  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true);
      try {
        const res = await api.get('/contracts', { params: { size: 100 } });
        setContracts(res.data.content || []);
      } catch (err) {
        console.error('Erro ao carregar contratos', err);
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, []);

  const filtered = contracts.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    const term = search.toLowerCase();
    return (
      c.contractNumber?.toLowerCase().includes(term) ||
      c.customerName?.toLowerCase().includes(term) ||
      c.condominiumName?.toLowerCase().includes(term) ||
      c.unitNumber?.toLowerCase().includes(term)
    );
  });

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Relatórios e Extratos Oficiais</h2>
        <p className="text-xs text-slate-500">
          Geração de extratos financeiros consolidados por contrato em formato PDF e planilhas estruturadas em Excel (.xlsx).
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar por contrato, cliente, empreendimento ou unidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none transition"
            />
          </div>
          <div className="text-xs text-slate-500">
            Total de contratos disponíveis: <span className="font-semibold text-slate-900">{filtered.length}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500">Filtrar por Status:</span>
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Carregando carteira de contratos...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="Nenhum relatório disponível"
          description={
            search
              ? 'Nenhum contrato corresponde aos termos da busca.'
              : 'Cadastre clientes e emita contratos de venda para gerar extratos em PDF e planilhas em Excel.'
          }
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Contrato</th>
                  <th className="px-4 py-3">Cliente / Sacado</th>
                  <th className="px-4 py-3">Empreendimento & Unidade</th>
                  <th className="px-4 py-3 text-right">Valor Total</th>
                  <th className="px-4 py-3 text-right">Saldo Devedor</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Documentos Oficiais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3">
                      <div className="font-mono font-medium text-slate-900">{c.contractNumber}</div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(c.contractDate).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{c.customerName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{c.customerDocument}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{c.condominiumName} - Unidade {c.unitNumber}</div>
                      <div className="text-[11px] text-slate-400">Bloco {c.buildingBlockName}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                      {formatCurrency(c.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">
                      {formatCurrency(c.totalOutstandingBalance)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                        <DocumentDownloadButton type="pdf" contractId={c.id} contractNumber={c.contractNumber} onSuccess={handleDownloadSuccess} onError={handleDownloadError} />
                        <DocumentDownloadButton type="excel" contractId={c.id} contractNumber={c.contractNumber} onSuccess={handleDownloadSuccess} onError={handleDownloadError} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
