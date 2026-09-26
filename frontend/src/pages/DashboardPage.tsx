import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { DashboardSummary, Contract, Installment, Condominium, Customer } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Building2,
  Home,
  FileText,
  BarChart3,
  FileSignature,
  ArrowRight,
  Users,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
  onNavigateWithAction?: (tab: string, action: 'condominium' | 'customer' | 'contract') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentContracts, setRecentContracts] = useState<Contract[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [recentCondos, setRecentCondos] = useState<Condominium[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (isSupabaseConfigured) {
        const client = getSupabase();
        const [contractsResult, installmentsResult, condosResult, customersResult] = await Promise.all([
          client.from('contracts').select('*').order('created_at', { ascending: false }).limit(5),
          client.from('installments').select('*').order('business_due_date', { ascending: true }).limit(5),
          client.from('condominiums').select('*').eq('deleted', false).order('created_at', { ascending: false }).limit(5),
          client.from('customers').select('*').eq('deleted', false).order('created_at', { ascending: false }).limit(5),
        ]);

        const errors = [contractsResult.error, installmentsResult.error, condosResult.error, customersResult.error].filter(Boolean);
        if (errors.length) {
          throw errors[0];
        }

        const toNumber = (value: unknown) => Number(value || 0);
        const contracts = contractsResult.data || [];
        const installmentsData = installmentsResult.data || [];
        const condos = condosResult.data || [];
        const customers = customersResult.data || [];
        const currentMonth = new Date().toISOString().slice(0, 7);

        setSummary({
          totalVgv: contracts.reduce((total, contract) => total + toNumber(contract.total_amount), 0),
          totalReceived: installmentsData.reduce((total, installment) => total + toNumber(installment.paid_amount), 0),
          totalReceivable: installmentsData.filter((installment) => !['PAID', 'CANCELLED'].includes(installment.status)).reduce((total, installment) => total + toNumber(installment.balance_amount), 0),
          totalOverdueAmount: installmentsData.filter((installment) => installment.status === 'OVERDUE').reduce((total, installment) => total + toNumber(installment.balance_amount), 0),
          totalOverdueCount: installmentsData.filter((installment) => installment.status === 'OVERDUE').length,
          currentMonthExpected: installmentsData.filter((installment) => installment.due_date?.startsWith(currentMonth)).reduce((total, installment) => total + toNumber(installment.updated_amount), 0),
          currentMonthReceived: installmentsData.filter((installment) => installment.updated_at?.startsWith(currentMonth)).reduce((total, installment) => total + toNumber(installment.paid_amount), 0),
          totalCondominiums: condos.length,
          totalUnits: 0,
          availableUnits: 0,
          soldUnits: 0,
          reservedUnits: 0,
          activeContracts: contracts.filter((contract) => contract.status === 'ACTIVE').length,
          unitsByStatus: {},
          totalCustomers: customers.length,
          customersByStatus: {
            ACTIVE: customers.filter((customer) => customer.status === 'ACTIVE').length,
            PAUSED: customers.filter((customer) => customer.status === 'PAUSED').length,
            FINISHED: customers.filter((customer) => customer.status === 'FINISHED').length,
            CANCELLED: customers.filter((customer) => customer.status === 'CANCELLED').length,
          },
          installmentsBySituation: {},
        });
        setRecentContracts(contracts.map((contract) => ({
          id: contract.id,
          contractNumber: contract.contract_number,
          customerName: undefined,
          condominiumName: undefined,
          totalAmount: toNumber(contract.total_amount),
          status: contract.status,
        })) as Contract[]);
        setInstallments(installmentsData.map((installment) => ({
          id: installment.id,
          customerName: '',
          condominiumName: '',
          installmentNumber: installment.installment_number,
          businessDueDate: installment.business_due_date,
          baseAmount: toNumber(installment.base_amount),
          totalPayable: toNumber(installment.updated_amount),
          financialSituation: installment.status === 'PAID' ? 'PAGA' : installment.status === 'CANCELLED' ? 'CANCELADA' : installment.status === 'PARTIALLY_PAID' ? 'PARCIALMENTE_PAGA' : installment.status === 'OVERDUE' ? 'VENCIDA' : installment.status === 'DUE_TODAY' ? 'VENCE_HOJE' : 'EM_ABERTO',
        })) as Installment[]);
        setRecentCondos(condos.map((condo) => ({ id: condo.id, name: condo.name, type: condo.type, status: condo.status })) as Condominium[]);
        setRecentCustomers(customers.map((customer) => ({ id: customer.id, name: customer.name, document: customer.document, phone: customer.phone, customerType: customer.customer_type === 'COMPANY' ? 'LEGAL_ENTITY' : 'INDIVIDUAL', status: customer.status })) as Customer[]);
        return;
      }

      const [summaryRes, contractsRes, installmentsRes, condosRes, custsRes] = await Promise.allSettled([
        api.get<DashboardSummary>('/dashboard/summary'),
        api.get('/contracts', { params: { size: 5, sort: 'createdAt,desc' } }),
        api.get('/installments', { params: { size: 5, sort: 'businessDueDate,asc' } }),
        api.get('/condominiums', { params: { size: 5 } }),
        api.get('/customers', { params: { size: 5 } }),
      ]);

      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value.data);
      } else {
        setSummary(null);
        setLoadError('Não foi possível atualizar os indicadores. Tente novamente.');
      }
      if (contractsRes.status === 'fulfilled') {
        setRecentContracts(contractsRes.value.data?.content || contractsRes.value.data || []);
      }
      if (installmentsRes.status === 'fulfilled') {
        setInstallments(installmentsRes.value.data?.content || installmentsRes.value.data || []);
      }
      if (condosRes.status === 'fulfilled') {
        setRecentCondos(condosRes.value.data?.content || condosRes.value.data || []);
      }
      if (custsRes.status === 'fulfilled') {
        setRecentCustomers(custsRes.value.data?.content || custsRes.value.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard', err);
      setLoadError('Não foi possível atualizar os indicadores. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const refreshDashboard = () => fetchData();
    window.addEventListener('data:changed', refreshDashboard);
    return () => window.removeEventListener('data:changed', refreshDashboard);
  }, [fetchData]);

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null || val === 0) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const totalCondominiums = summary?.totalCondominiums ?? 0;
  const totalUnits = summary?.totalUnits ?? 0;
  const totalContracts = summary?.activeContracts ?? 0;
  const currentMonthReceived = summary?.currentMonthReceived ?? 0;
  const customerCounts = summary?.customersByStatus;

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Visão geral da sua operação.
        </p>
      </div>

      {loadError && (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {loadError}
        </div>
      )}

      {/* 4 Cards de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Condomínios */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs flex flex-col justify-between">
          <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">Condomínios</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {loading ? '—' : totalCondominiums > 0 ? totalCondominiums : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">total cadastrado</div>
          </div>
        </div>

        {/* Card 2: Unidades */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs flex flex-col justify-between">
          <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Home className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">Unidades</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {loading ? '—' : totalUnits > 0 ? totalUnits : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">total cadastrado</div>
          </div>
        </div>

        {/* Card 3: Contratos */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs flex flex-col justify-between">
          <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">Contratos</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {loading ? '—' : totalContracts > 0 ? totalContracts : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">total cadastrado</div>
          </div>
        </div>

        {/* Card 4: Receitas (mês) */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs flex flex-col justify-between">
          <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">Receitas (mês)</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {loading ? '—' : currentMonthReceived > 0 ? formatCurrency(currentMonthReceived) : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">valor total</div>
          </div>
        </div>
      </div>

      {/* Seção de Acesso Rápido: Empreendimentos & Clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bloco Empreendimentos */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs flex flex-col justify-between min-h-[260px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Empreendimentos & Condomínios ({recentCondos.length})
              </h2>
            </div>
            <button
              onClick={() => onNavigate('condominiums')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 transition"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {recentCondos.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs mt-3">
              {recentCondos.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onNavigate('condominiums')}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer rounded px-2 -mx-2 transition"
                >
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>{c.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
                        {c.type === 'COMMERCIAL_CONDOMINIUM' ? 'Comercial' : 'Residencial'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{c.city}/{c.state}</span>
                      {c.managerName && <span>• Síndico: {c.managerName}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center mb-2">
                <Building2 className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-500">Nenhum empreendimento cadastrado.</p>
            </div>
          )}
        </div>

        {/* Bloco Clientes & Compradores */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs flex flex-col justify-between min-h-[260px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Clientes & Compradores ({summary?.totalCustomers ?? 0})
              </h2>
            </div>
            <button
              onClick={() => onNavigate('customers')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1 transition"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {!loading && customerCounts && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600" aria-label="Contagem de clientes por status">
              <span>Ativos: {customerCounts.ACTIVE ?? 0}</span>
              <span>Pausados: {customerCounts.PAUSED ?? 0}</span>
              <span>Encerrados: {customerCounts.FINISHED ?? 0}</span>
              <span>Cancelados: {customerCounts.CANCELLED ?? 0}</span>
            </div>
          )}

          {recentCustomers.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs mt-3">
              {recentCustomers.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => onNavigate('customers')}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer rounded px-2 -mx-2 transition"
                >
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>{cust.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
                        {cust.customerType === 'LEGAL_ENTITY' ? 'PJ' : 'PF'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span className="font-mono">{cust.document}</span>
                      {cust.phone && <span>• {cust.phone}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={cust.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center mb-2">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-500">Nenhum cliente cadastrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* 2 Grandes Blocos Inferiores: Contratos & Receitas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bloco 1: Contratos por status */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs flex flex-col justify-between min-h-[260px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Contratos por status
            </h2>
            {recentContracts.length > 0 && (
              <button
                onClick={() => onNavigate('contracts')}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 transition"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {recentContracts.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs mt-3">
              {recentContracts.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900">{c.contractNumber}</span>
                    <span className="text-slate-500 ml-2">{c.customerName || c.condominiumName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={c.status} />
                    <span className="text-slate-700 font-medium">{formatCurrency(c.totalAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center mb-2">
                <FileSignature className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-slate-800 mb-1">—</div>
              <p className="text-xs text-slate-500">Nenhum contrato cadastrado.</p>
            </div>
          )}
        </div>

        {/* Bloco 2: Receitas e despesas */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs flex flex-col justify-between min-h-[260px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Receitas e despesas
            </h2>
            {installments.length > 0 && (
              <button
                onClick={() => onNavigate('financial')}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 transition"
              >
                Ver financeiro <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {installments.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs mt-3">
              {installments.slice(0, 5).map((inst) => {
                const isOverdue = inst.financialSituation === 'VENCIDA';
                return (
                  <div key={inst.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">{inst.customerName || inst.condominiumName}</span>
                      <span className="text-slate-400 ml-2">Parcela #{inst.installmentNumber}</span>
                      <div className="text-[11px] text-slate-400">
                        Venc: {inst.businessDueDate ? new Date(inst.businessDueDate).toLocaleDateString('pt-BR') : '—'}
                        {isOverdue && (
                          <span className="ml-1.5 text-red-600 font-semibold">(Em atraso)</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-800 font-medium font-mono">
                        {formatCurrency(inst.totalPayable || inst.baseAmount)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center mb-2">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-slate-800 mb-1">—</div>
              <p className="text-xs text-slate-500">Nenhum lançamento financeiro para exibir.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
