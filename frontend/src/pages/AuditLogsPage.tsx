import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { AuditLog } from '../types';
import { ShieldAlert, RefreshCw, Search } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs', { params: { size: 100 } });
      setLogs(res.data.content || []);
    } catch (err) {
      console.error('Erro ao carregar trilha de auditoria', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !search ||
      log.performedByEmail?.toLowerCase().includes(search.toLowerCase()) ||
      log.entityName?.toLowerCase().includes(search.toLowerCase()) ||
      log.ipAddress?.toLowerCase().includes(search.toLowerCase()) ||
      log.details?.toLowerCase().includes(search.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Trilha de Auditoria e Conformidade</h2>
          <p className="text-xs text-slate-500">
            Registro imutável de ações operacionais, alterações cadastrais, liquidações e eventos do sistema.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
          Atualizar Registros
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por usuário, entidade, IP ou detalhes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: 'Todas as Ações' },
            { id: 'STATUS_CHANGE', label: 'Mudança de Status' },
            { id: 'CREATE', label: 'Criação' },
            { id: 'UPDATE', label: 'Atualização' },
            { id: 'DELETE', label: 'Exclusão' },
            { id: 'PAYMENT', label: 'Pagamento' },
            { id: 'RENEGOTIATE', label: 'Renegociação' },
          ].map((act) => (
            <button
              key={act.id}
              onClick={() => setActionFilter(act.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition whitespace-nowrap ${
                actionFilter === act.id
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Carregando registros de auditoria...</div>
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Nenhum registro de auditoria encontrado"
          description={
            search || actionFilter !== 'ALL'
              ? 'Nenhum log encontrado para os critérios selecionados.'
              : 'Os eventos de auditoria são gerados automaticamente quando operadores executam operações no sistema.'
          }
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Data e Hora</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Entidade</th>
                  <th className="px-4 py-3">Usuário Responsável</th>
                  <th className="px-4 py-3">Endereço IP</th>
                  <th className="px-4 py-3">Detalhes da Operação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition font-sans">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral">
                        {log.action === 'STATUS_CHANGE' ? 'MUDANÇA DE STATUS' : log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {log.entityName} {log.entityId ? `#${log.entityId}` : ''}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-sans">
                      {log.performedByEmail}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                      {log.ipAddress}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-sans max-w-md truncate">
                      {log.details}
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
