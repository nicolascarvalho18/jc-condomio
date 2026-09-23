import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
  Installment,
  PaymentMethod,
  Contract,
  DashboardSummary,
  Customer,
  Condominium,
  SERVICE_TYPE_LABELS,
} from '../types';
import {
  CircleDollarSign,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  Receipt,
  FileCheck2,
  Search,
  ArrowUpRight,
  X,
  FileText,
  CalendarClock,
  SlidersHorizontal,
  Clock,
  CircleAlert,
  CircleDashed,
  CircleCheck,
  CircleX,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { Pagination } from '../components/common/Pagination';
import { useToast } from '../context/ToastContext';

export const FinancialPage: React.FC = () => {
  const { toast } = useToast();
  const initialParams = new URLSearchParams(window.location.search);
  const initialStatus = initialParams.get('status');
  const [activeTab, setActiveTab] = useState<'RECEIVABLES' | 'CASH_FLOW' | 'RENEGOTIATIONS'>('RECEIVABLES');
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);

  // Paginação
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(15);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Advanced Filters
  const [statusGroup, setStatusGroup] = useState<'ALL' | 'OPEN' | 'OVERDUE' | 'PAID' | 'PARTIAL' | 'CANCELLED'>(
    ['ALL', 'OPEN', 'OVERDUE', 'PAID', 'PARTIAL', 'CANCELLED'].includes(initialStatus || '')
      ? (initialStatus as 'ALL' | 'OPEN' | 'OVERDUE' | 'PAID' | 'PARTIAL' | 'CANCELLED')
      : 'ALL',
  );
  const [dueFilter, setDueFilter] = useState<'' | 'OVERDUE' | 'TODAY' | 'NEXT_7' | 'NEXT_30'>(() => {
    const value = initialParams.get('vencimento');
    if (value === 'atraso') return 'OVERDUE';
    if (value === 'hoje') return 'TODAY';
    if (value === '7-dias') return 'NEXT_7';
    if (value === '30-dias') return 'NEXT_30';
    return '';
  });
  const [search, setSearch] = useState(initialParams.get('q') || '');
  const [searchInput, setSearchInput] = useState(initialParams.get('q') || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>(initialParams.get('cliente') ? Number(initialParams.get('cliente')) : '');
  const [selectedCondoId, setSelectedCondoId] = useState<number | ''>(initialParams.get('obra') ? Number(initialParams.get('obra')) : '');
  const [selectedServiceType, setSelectedServiceType] = useState<string>(initialParams.get('servico') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contractStatus, setContractStatus] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showPeriod, setShowPeriod] = useState(false);

  // Dropdown data sources
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [condominiumsList, setCondominiumsList] = useState<Condominium[]>([]);

  // Dashboard / Summary KPI State
  const [kpiSummary, setKpiSummary] = useState<DashboardSummary | null>(null);

  // Payment Modal State (Baixa)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amountReceived: 0,
    penaltyApplied: 0,
    interestApplied: 0,
    discountApplied: 0,
    paymentMethod: 'PIX' as PaymentMethod,
    transactionReference: '',
    notes: '',
  });
  const [chargesInfo, setChargesInfo] = useState<{
    penaltyAmount: number;
    interestAmount: number;
    totalPayable: number;
    daysLate: number;
  } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Renegotiation Modal State
  const [isRenegotiateModalOpen, setIsRenegotiateModalOpen] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<number | ''>('');
  const [contractInstallments, setContractInstallments] = useState<Installment[]>([]);
  const [selectedInstIds, setSelectedInstIds] = useState<number[]>([]);
  const [renegotiateForm, setRenegotiateForm] = useState({
    renegotiationDate: new Date().toISOString().split('T')[0],
    agreedInterestAmount: 0,
    agreedDiscountAmount: 0,
    newInstallmentsCount: 12,
    firstDueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    dueDayOfMonth: 10,
    reason: '',
  });
  const [isProcessingRenegotiation, setIsProcessingRenegotiation] = useState(false);

  // Receipt Modal State
  const [viewingReceiptInstallment, setViewingReceiptInstallment] = useState<Installment | null>(null);

  const SituationBadge = ({ installment }: { installment: Installment }) => {
    const situation = installment.financialSituation;
    const config = {
      EM_ABERTO: { Icon: Clock, style: 'bg-blue-50 text-blue-800', label: 'Não paga' },
      VENCE_HOJE: { Icon: CalendarClock, style: 'bg-amber-50 text-amber-900', label: 'Vence hoje' },
      VENCIDA: { Icon: CircleAlert, style: 'bg-[#FBEDEE] text-[#A61F24]', label: 'Vencida' },
      PARCIALMENTE_PAGA: { Icon: CircleDashed, style: 'bg-orange-50 text-orange-800', label: 'Pagamento parcial' },
      PAGA: { Icon: CircleCheck, style: 'bg-emerald-50 text-emerald-800', label: 'Paga' },
      CANCELADA: { Icon: CircleX, style: 'bg-slate-100 text-slate-700', label: 'Cancelada' },
    }[situation];
    if (!config) return <span className="inline-flex h-6 items-center rounded-md bg-slate-100 px-2 text-xs font-medium text-slate-700">Status indisponível</span>;
    const Icon = config.Icon;
    return <span className={`inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-medium ${config.style}`}><Icon className="h-3.5 w-3.5" />{installment.financialSituationLabel || config.label}</span>;
  };

  // Load KPI summary
  const fetchKpis = async () => {
    try {
      const res = await api.get('/dashboard/summary');
      setKpiSummary(res.data);
    } catch (e) {
      console.error('Erro ao carregar resumo financeiro', e);
    }
  };

  // Load auxiliary dropdowns
  const fetchAuxData = async () => {
    try {
      const [custRes, condoRes] = await Promise.all([
        api.get('/customers', { params: { size: 200 } }),
        api.get('/condominiums', { params: { size: 200 } }),
      ]);
      setCustomersList(custRes.data?.content || custRes.data || []);
      setCondominiumsList(condoRes.data?.content || condoRes.data || []);
    } catch (e) {
      console.error('Erro ao carregar listas auxiliares', e);
    }
  };

  const fetchInstallments = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        size,
      };
      if (statusGroup && statusGroup !== 'ALL') {
        const situationParam: Record<Exclude<typeof statusGroup, 'ALL'>, string> = {
          OPEN: 'EM_ABERTO', OVERDUE: 'VENCIDA', PAID: 'PAGA', PARTIAL: 'PARCIALMENTE_PAGA', CANCELLED: 'CANCELADA',
        };
        params.financialSituation = situationParam[statusGroup as keyof typeof situationParam];
      }
      if (dueFilter) params.statusGroup = dueFilter;
      if (selectedCustomerId) params.customerId = selectedCustomerId;
      if (selectedCondoId) params.condominiumId = selectedCondoId;
      if (selectedServiceType) params.serviceType = selectedServiceType;
      if (contractStatus) params.contractStatus = contractStatus;
      if (minAmount) params.minAmount = minAmount;
      if (maxAmount) params.maxAmount = maxAmount;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (search) params.search = search;

      const res = await api.get('/installments', { params });
      const data = res.data;
      if (Array.isArray(data)) {
        setInstallments(data);
        setTotalPages(1);
        setTotalElements(data.length);
      } else if (data && Array.isArray(data.content)) {
        setInstallments(data.content);
        setTotalPages(data.totalPages || 0);
        setTotalElements(data.totalElements || 0);
      } else {
        setInstallments([]);
        setTotalPages(0);
        setTotalElements(0);
      }
    } catch (err) {
      console.error('Erro ao listar parcelas', err);
      setInstallments([]);
    } finally {
      setLoading(false);
    }
  }, [page, size, statusGroup, dueFilter, selectedCustomerId, selectedCondoId, selectedServiceType, contractStatus, minAmount, maxAmount, startDate, endDate, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput);
        setPage(0);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusGroup !== 'ALL') params.set('status', statusGroup);
    if (dueFilter) params.set('vencimento', ({ OVERDUE: 'atraso', TODAY: 'hoje', NEXT_7: '7-dias', NEXT_30: '30-dias' } as const)[dueFilter]);
    if (search) params.set('q', search);
    if (selectedCustomerId) params.set('cliente', String(selectedCustomerId));
    if (selectedCondoId) params.set('obra', String(selectedCondoId));
    if (selectedServiceType) params.set('servico', selectedServiceType);
    window.history.replaceState(null, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`);
  }, [statusGroup, dueFilter, search, selectedCustomerId, selectedCondoId, selectedServiceType]);

  useEffect(() => {
    fetchKpis();
    fetchAuxData();
  }, []);

  useEffect(() => {
    fetchInstallments();
  }, [fetchInstallments]);

  const clearFilters = () => {
    setStatusGroup('ALL');
    setDueFilter('');
    setSearch('');
    setSearchInput('');
    setSelectedCustomerId('');
    setSelectedCondoId('');
    setSelectedServiceType('');
    setStartDate('');
    setEndDate('');
    setContractStatus('');
    setMinAmount('');
    setMaxAmount('');
  };

  const hasActiveFilters =
    statusGroup !== 'ALL' ||
    Boolean(dueFilter) ||
    Boolean(search) ||
    Boolean(selectedCustomerId) ||
    Boolean(selectedCondoId) ||
    Boolean(selectedServiceType) ||
    Boolean(startDate) ||
    Boolean(endDate);

  const openPaymentModal = async (inst: Installment) => {
    setSelectedInstallment(inst);
    setIsPaymentModalOpen(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      const res = await api.get(`/installments/${inst.id}/calculate-charges`, {
        params: { paymentDate: today },
      });
      setChargesInfo(res.data);
      setPaymentForm({
        paymentDate: today,
        amountReceived: res.data.totalPayable,
        penaltyApplied: res.data.penaltyAmount,
        interestApplied: res.data.interestAmount,
        discountApplied: 0,
        paymentMethod: 'PIX',
        transactionReference: '',
        notes: '',
      });
    } catch (e) {
      console.error('Erro ao calcular encargos', e);
      setChargesInfo(null);
      setPaymentForm({
        paymentDate: today,
        amountReceived: inst.balanceAmount,
        penaltyApplied: 0,
        interestApplied: 0,
        discountApplied: 0,
        paymentMethod: 'PIX',
        transactionReference: '',
        notes: '',
      });
    }
  };

  const handleDateChangeInPayment = async (newDate: string) => {
    setPaymentForm((prev) => ({ ...prev, paymentDate: newDate }));
    if (!selectedInstallment) return;

    try {
      const res = await api.get(`/installments/${selectedInstallment.id}/calculate-charges`, {
        params: { paymentDate: newDate },
      });
      setChargesInfo(res.data);
      setPaymentForm((prev) => ({
        ...prev,
        amountReceived: res.data.totalPayable,
        penaltyApplied: res.data.penaltyAmount,
        interestApplied: res.data.interestAmount,
      }));
    } catch (e) {
      console.error('Erro ao recalcular juros', e);
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallment) return;
    setIsProcessingPayment(true);
    try {
      await api.post(`/installments/${selectedInstallment.id}/payments`, paymentForm);
      toast.success('Pagamento registrado e baixado com sucesso.', 'Baixa Efetuada');
      setIsPaymentModalOpen(false);
      fetchInstallments();
      fetchKpis();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao registrar pagamento.', 'Erro no Pagamento');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const openRenegotiateModal = async () => {
    setIsRenegotiateModalOpen(true);
    setSelectedContractId('');
    setSelectedInstIds([]);
    try {
      const res = await api.get('/contracts', { params: { size: 100 } });
      setContracts(res.data.content || []);
    } catch (e) {
      console.error('Erro ao carregar contratos', e);
    }
  };

  const handleContractSelectInRenegotiation = async (contractId: number) => {
    setSelectedContractId(contractId);
    setSelectedInstIds([]);
    try {
      const res = await api.get(`/contracts/${contractId}/installments`);
      const eligible = (res.data || []).filter(
        (i: Installment) => ['VENCIDA', 'EM_ABERTO', 'VENCE_HOJE', 'PARCIALMENTE_PAGA'].includes(i.financialSituation)
      );
      setContractInstallments(eligible);
    } catch (e) {
      console.error('Erro ao carregar parcelas', e);
    }
  };

  const toggleSelectInst = (id: number) => {
    setSelectedInstIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedBalanceSum = contractInstallments
    .filter((i) => selectedInstIds.includes(i.id))
    .reduce((acc, curr) => acc + curr.balanceAmount, 0);

  const renegotiatedFinalTotal =
    selectedBalanceSum +
    (Number(renegotiateForm.agreedInterestAmount) || 0) -
    (Number(renegotiateForm.agreedDiscountAmount) || 0);

  const handleProcessRenegotiation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId || selectedInstIds.length === 0) {
      toast.warning('Selecione ao menos uma parcela para renegociar.', 'Parcelas Não Selecionadas');
      return;
    }
    setIsProcessingRenegotiation(true);
    try {
      await api.post('/installments/renegotiate', {
        contractId: selectedContractId,
        renegotiationDate: renegotiateForm.renegotiationDate,
        installmentIds: selectedInstIds,
        agreedInterestAmount: renegotiateForm.agreedInterestAmount,
        agreedDiscountAmount: renegotiateForm.agreedDiscountAmount,
        newInstallmentsCount: renegotiateForm.newInstallmentsCount,
        firstDueDate: renegotiateForm.firstDueDate,
        dueDayOfMonth: renegotiateForm.dueDayOfMonth,
        reason: renegotiateForm.reason,
      });

      toast.success('Acordo de renegociação firmado com sucesso.', 'Renegociação Concluída');
      setIsRenegotiateModalOpen(false);
      fetchInstallments();
      fetchKpis();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao processar renegociação.', 'Erro na Renegociação');
    } finally {
      setIsProcessingRenegotiation(false);
    }
  };

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Collect all paid payments across loaded installments for Cash Flow
  const allPaidMovements = installments
    .filter((i) => Boolean(i.payments && i.payments.length > 0))
    .flatMap((i) =>
      (i.payments || []).map((p) => ({
        ...p,
        contractNumber: i.contractNumber,
        customerName: i.customerName,
        condominiumName: i.condominiumName,
        serviceLabel: i.serviceLabel,
        unitNumber: i.unitNumber,
        installmentNumber: i.installmentNumber,
        totalInstallments: i.totalInstallments,
      }))
    )
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Módulo Financeiro & Contas a Receber</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestão integral de parcelas, liquidação de títulos, fluxo de caixa e renegociações de clientes e condomínios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openRenegotiateModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            Renegociar Débitos
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Saldo a Receber Total</div>
          <div className="mt-1 text-xl font-bold font-mono text-slate-900">
            {kpiSummary ? formatCurrency(kpiSummary.totalReceivable) : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Carteira ativa de contratos</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Total Arrecadado</div>
          <div className="mt-1 text-xl font-bold font-mono text-slate-900">
            {kpiSummary ? formatCurrency(kpiSummary.totalReceived) : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Receitas quitadas no sistema</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Inadimplência (Vencido)</div>
          <div className="mt-1 text-xl font-bold font-mono text-slate-900">
            {kpiSummary ? formatCurrency(kpiSummary.totalOverdueAmount) : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {kpiSummary?.totalOverdueCount ? `${kpiSummary.totalOverdueCount} parcela(s) em atraso` : 'Nenhum atraso pendente'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Previsão Mês Atual</div>
          <div className="mt-1 text-xl font-bold font-mono text-slate-900">
            {kpiSummary ? formatCurrency(kpiSummary.currentMonthExpected) : '—'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Realizado: {kpiSummary?.currentMonthReceived ? formatCurrency(kpiSummary.currentMonthReceived) : '—'}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('RECEIVABLES')}
          className={`pb-2.5 transition flex items-center gap-1.5 ${
            activeTab === 'RECEIVABLES'
              ? 'border-b-2 border-slate-900 text-slate-900'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CircleDollarSign className="w-3.5 h-3.5" />
          Parcelas a Receber (Contas a Receber)
        </button>
        <button
          onClick={() => setActiveTab('CASH_FLOW')}
          className={`pb-2.5 transition flex items-center gap-1.5 ${
            activeTab === 'CASH_FLOW'
              ? 'border-b-2 border-slate-900 text-slate-900'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Fluxo de Caixa (Baixas Efetuadas)
        </button>
      </div>

      {/* TAB 1: PARCELAS A RECEBER */}
      {activeTab === 'RECEIVABLES' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[#E2E6EC] bg-white p-3 space-y-3">
            <div className="flex flex-col lg:flex-row gap-2">
              <div className="relative flex-1 min-w-0"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(0); } }} placeholder="Buscar contrato, cliente, CPF/CNPJ ou obra" className="h-9 w-full rounded-md border border-[#E2E6EC] pl-9 pr-8 text-sm outline-none focus:border-[#A61F24]" aria-label="Buscar parcelas" />{searchInput && <button onClick={() => { setSearchInput(''); setSearch(''); }} className="absolute right-2 top-2 text-slate-400" aria-label="Limpar busca"><X className="h-4 w-4" /></button>}</div>
              <select value={statusGroup} onChange={(e) => { setStatusGroup(e.target.value as typeof statusGroup); setPage(0); }} className="h-9 rounded-md border border-[#E2E6EC] px-2 text-sm text-slate-700" aria-label="Situação da parcela"><option value="ALL">Situação: Todas ({kpiSummary?.installmentsBySituation?.ALL ?? '—'})</option><option value="OPEN">Em aberto ({kpiSummary?.installmentsBySituation?.OPEN ?? '—'})</option><option value="OVERDUE">Vencidas ({kpiSummary?.installmentsBySituation?.OVERDUE ?? '—'})</option><option value="PAID">Pagas ({kpiSummary?.installmentsBySituation?.PAID ?? '—'})</option><option value="PARTIAL">Pagamento parcial ({kpiSummary?.installmentsBySituation?.PARTIAL ?? '—'})</option><option value="CANCELLED">Canceladas ({kpiSummary?.installmentsBySituation?.CANCELLED ?? '—'})</option></select>
              <select value={dueFilter} onChange={(e) => { const value = e.target.value as typeof dueFilter; setDueFilter(value); if (value) { setStartDate(''); setEndDate(''); } setShowPeriod(value === ''); setPage(0); }} className="h-9 rounded-md border border-[#E2E6EC] px-2 text-sm text-slate-700" aria-label="Vencimento"><option value="">Vencimento: qualquer data</option><option value="OVERDUE">Em atraso</option><option value="TODAY">Hoje</option><option value="NEXT_7">Próximos 7 dias</option><option value="NEXT_30">Próximos 30 dias</option></select>
              <button onClick={() => setShowPeriod(!showPeriod)} className="h-9 rounded-md border border-[#E2E6EC] px-3 text-sm text-slate-700">Período</button>
              <button onClick={() => setShowMoreFilters(!showMoreFilters)} className="h-9 rounded-md border border-[#E2E6EC] px-3 text-sm text-slate-700 inline-flex items-center gap-1"><SlidersHorizontal className="h-4 w-4" /> Mais filtros</button>
              {hasActiveFilters && <button onClick={() => { clearFilters(); setPage(0); }} className="h-9 px-2 text-sm text-slate-500">Limpar</button>}
            </div>
            {showPeriod && <div className="flex flex-wrap items-end gap-2 rounded-md bg-slate-50 p-2"><label className="text-xs text-slate-600">Data inicial<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block h-9 rounded border border-[#E2E6EC] px-2" /></label><label className="text-xs text-slate-600">Data final<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block h-9 rounded border border-[#E2E6EC] px-2" /></label><button onClick={() => { setPage(0); setShowPeriod(false); }} className="h-9 rounded bg-slate-900 px-3 text-sm text-white">Aplicar</button></div>}
            {showMoreFilters && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 rounded-md border border-[#E2E6EC] p-2"><select value={selectedCustomerId} onChange={(e) => { setSelectedCustomerId(e.target.value ? Number(e.target.value) : ''); setPage(0); }} className="h-9 rounded border border-[#E2E6EC] px-2 text-sm"><option value="">Cliente</option>{customersList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select value={selectedCondoId} onChange={(e) => { setSelectedCondoId(e.target.value ? Number(e.target.value) : ''); setPage(0); }} className="h-9 rounded border border-[#E2E6EC] px-2 text-sm"><option value="">Condomínio ou obra</option>{condominiumsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select value={selectedServiceType} onChange={(e) => { setSelectedServiceType(e.target.value); setPage(0); }} className="h-9 rounded border border-[#E2E6EC] px-2 text-sm"><option value="">Tipo de serviço</option>{Object.entries(SERVICE_TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select><input type="number" min="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="Valor mínimo" className="h-9 rounded border border-[#E2E6EC] px-2 text-sm" /><input type="number" min="0" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="Valor máximo" className="h-9 rounded border border-[#E2E6EC] px-2 text-sm" /></div>}
            {hasActiveFilters && <div className="flex flex-wrap gap-1.5 text-xs">{statusGroup !== 'ALL' && <button onClick={() => setStatusGroup('ALL')} className="rounded bg-[#FBEDEE] px-2 py-1 text-[#A61F24]">{({ OPEN: 'Em aberto', OVERDUE: 'Vencidas', PAID: 'Pagas', PARTIAL: 'Pagamento parcial', CANCELLED: 'Canceladas' } as const)[statusGroup]} ×</button>}{dueFilter && <button onClick={() => setDueFilter('')} className="rounded bg-slate-100 px-2 py-1">{({ OVERDUE: 'Em atraso', TODAY: 'Hoje', NEXT_7: 'Próximos 7 dias', NEXT_30: 'Próximos 30 dias' } as const)[dueFilter]} ×</button>}{search && <button onClick={() => { setSearch(''); setSearchInput(''); }} className="rounded bg-slate-100 px-2 py-1">Busca: {search} ×</button>}{selectedCustomerId && <button onClick={() => setSelectedCustomerId('')} className="rounded bg-slate-100 px-2 py-1">Cliente: {customersList.find(c => c.id === selectedCustomerId)?.name} ×</button>}{selectedCondoId && <button onClick={() => setSelectedCondoId('')} className="rounded bg-slate-100 px-2 py-1">Obra: {condominiumsList.find(c => c.id === selectedCondoId)?.name} ×</button>}<button onClick={clearFilters} className="px-2 py-1 text-slate-500 underline">Limpar todos</button></div>}
          </div>
          <p className="text-sm text-slate-600">{totalElements} {totalElements === 1 ? 'parcela encontrada' : 'parcelas encontradas'}</p>

          {/* Installments Table */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Carregando carteira de parcelas...</div>
          ) : installments.length === 0 ? (
            <EmptyState
              icon={CircleDollarSign}
              title="Nenhuma parcela encontrada"
              description="Nenhuma parcela corresponde aos filtros aplicados. Ao emitir contratos de obras com Clientes ou Condomínios, as parcelas serão sincronizadas imediatamente."
            />
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Contrato / Parcela</th>
                      <th className="px-4 py-3">Contratante</th>
                      <th className="px-4 py-3">Obra & Serviço</th>
                      <th className="px-4 py-3">Vencimento</th>
                      <th className="px-4 py-3 text-right">Valor da parcela</th>
                      <th className="px-4 py-3 text-right">Valor pago</th>
                      <th className="px-4 py-3 text-right">Saldo Devedor</th>
                      <th className="px-4 py-3 text-center">Situação da parcela</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {installments.map((inst) => {
                      const situation = inst.financialSituation;
                      const dueDate = new Date(`${inst.businessDueDate}T00:00:00`);
                      const today = new Date();
                      const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      const daysDifference = Math.round((dueDate.getTime() - currentDate.getTime()) / 86400000);
                      const isPayable =
                        situation === 'EM_ABERTO' || situation === 'VENCIDA' || situation === 'VENCE_HOJE' || situation === 'PARCIALMENTE_PAGA';

                      // Contractor display logic (Cliente vs Condomínio)
                      const isClientContract = Boolean(inst.customerName);
                      const contractorName = inst.customerName || inst.condominiumName || '—';
                      const contractorTypeLabel = isClientContract ? 'Cliente' : 'Condomínio';

                      return (
                        <tr key={inst.id} className="hover:bg-slate-50/60 transition">
                          {/* Contrato / Parcela */}
                          <td className="px-4 py-3">
                            <div className="font-mono font-semibold text-slate-900">
                              {inst.contractNumber}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              Parcela {inst.installmentNumber} de {inst.totalInstallments}
                            </div>
                          </td>

                          {/* Contratante */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                                {contractorName}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 font-medium shrink-0">
                                {contractorTypeLabel}
                              </span>
                            </div>
                            {isClientContract && inst.condominiumName && (
                              <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                Obra: {inst.condominiumName}
                              </div>
                            )}
                          </td>

                          {/* Obra & Serviço */}
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">
                              {inst.serviceLabel || inst.serviceType || (inst.unitNumber ? `Unidade ${inst.unitNumber}` : 'Construção Civil')}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {inst.condominiumName || 'Obra Direta'}
                            </div>
                          </td>

                          {/* Vencimento */}
                          <td className="px-4 py-3 font-mono text-slate-700">
                            <div>{new Date(inst.businessDueDate).toLocaleDateString('pt-BR')}</div>
                            {situation === 'VENCE_HOJE' && <div className="text-[10px] text-amber-700 font-sans font-medium">Vence hoje</div>}
                            {situation === 'VENCIDA' && <div className="text-[10px] text-[#A61F24] font-sans font-medium">{Math.abs(daysDifference)} {Math.abs(daysDifference) === 1 ? 'dia' : 'dias'} em atraso</div>}
                            {situation === 'EM_ABERTO' && daysDifference <= 7 && <div className="text-[10px] text-slate-500 font-sans font-medium">Em {daysDifference} {daysDifference === 1 ? 'dia' : 'dias'}</div>}
                            {situation === 'PAGA' && inst.financialSituationDate && <div className="text-[10px] text-emerald-700 font-sans font-medium">Pago em {new Date(`${inst.financialSituationDate}T00:00:00`).toLocaleDateString('pt-BR')}</div>}
                            {situation === 'CANCELADA' && inst.financialSituationDate && <div className="text-[10px] text-slate-500 font-sans font-medium">Cancelada em {new Date(`${inst.financialSituationDate}T00:00:00`).toLocaleDateString('pt-BR')}</div>}
                          </td>

                          {/* Valor Base */}
                          <td className="px-4 py-3 text-right font-mono text-slate-600">
                            {formatCurrency(inst.totalPayable)}
                          </td>

                          <td className={`px-4 py-3 text-right font-mono ${situation === 'PAGA' ? 'text-emerald-700 font-medium' : situation === 'CANCELADA' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {formatCurrency(inst.paidAmount)}
                          </td>

                          {/* Saldo Devedor */}
                          <td className={`px-4 py-3 text-right font-mono font-semibold ${situation === 'VENCIDA' ? 'text-[#A61F24]' : situation === 'CANCELADA' ? 'text-slate-400' : 'text-slate-900'}`}>
                            {formatCurrency(inst.balanceAmount)}
                            {situation === 'PARCIALMENTE_PAGA' && (
                              <div className="mt-1 h-1.5 w-20 ml-auto overflow-hidden rounded bg-slate-100" aria-label={`${Math.round((inst.paidAmount / Math.max(inst.totalPayable, 1)) * 100)}% pago`}>
                                <div className="h-full bg-orange-500" style={{ width: `${Math.min(100, Math.round((inst.paidAmount / Math.max(inst.totalPayable, 1)) * 100))}%` }} />
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 text-center">
                            <SituationBadge installment={inst} />
                          </td>


                          {/* Ações */}
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {isPayable ? (
                                <button
                                  onClick={() => openPaymentModal(inst)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs"
                                >
                                  <Receipt className="w-3 h-3" /> {situation === 'PARCIALMENTE_PAGA' ? 'Registrar pagamento' : 'Dar baixa'}
                                </button>
                              ) : situation === 'PAGA' ? (
                                <button
                                  onClick={() => setViewingReceiptInstallment(inst)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                                >
                                  <FileText className="w-3 h-3" /> Recibo
                                </button>
                              ) : situation === 'CANCELADA' ? (
                                <button onClick={() => setViewingReceiptInstallment(inst)} className="text-[11px] font-medium text-slate-600 hover:text-slate-900">Ver detalhes</button>
                              ) : <button onClick={() => setViewingReceiptInstallment(inst)} className="text-[11px] font-medium text-slate-600 hover:text-slate-900">Ver detalhes</button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                size={size}
                totalPages={totalPages}
                totalElements={totalElements}
                onPageChange={setPage}
                onSizeChange={(newSize) => {
                  setSize(newSize);
                  setPage(0);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FLUXO DE CAIXA / BAIXAS EFETUADAS */}
      {activeTab === 'CASH_FLOW' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registro Histórico de Movimentações (Fluxo de Caixa)</h3>
              <p className="text-xs text-slate-500">
                Auditoria contábil de liquidações registradas, discriminando juros, multas, descontos e operador.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Total de Entradas Computadas</span>
              <span className="text-base font-mono font-bold text-slate-900">
                {kpiSummary ? formatCurrency(kpiSummary.totalReceived) : '—'}
              </span>
            </div>
          </div>

          {allPaidMovements.length === 0 ? (
            <EmptyState
              icon={ArrowUpRight}
              title="Nenhuma movimentação financeira registrada"
              description="Ainda não foram efetuadas baixas de pagamento nesta empresa. Ao registrar recebimentos de parcelas, o fluxo de caixa será alimentado automaticamente."
            />
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Data Baixa</th>
                      <th className="px-4 py-3">Contrato / Parcela</th>
                      <th className="px-4 py-3">Contratante</th>
                      <th className="px-4 py-3">Meio</th>
                      <th className="px-4 py-3 text-right">Multa / Juros</th>
                      <th className="px-4 py-3 text-right">Valor Líquido Recebido</th>
                      <th className="px-4 py-3">Operador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allPaidMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-mono text-slate-800">
                          {new Date(m.paymentDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono font-semibold text-slate-900">
                            {m.contractNumber} (Parc. {m.installmentNumber}/{m.totalInstallments})
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {m.serviceLabel || m.condominiumName || 'Obra'}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {m.customerName || m.condominiumName || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {m.paymentMethod}
                          </span>
                          {m.transactionReference && (
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              Ref: {m.transactionReference}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">
                          {formatCurrency((m.penaltyApplied || 0) + (m.interestApplied || 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(m.amountReceived)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {m.registeredByUserName || 'Sistema'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Baixa de Pagamento */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Registrar Baixa de Pagamento"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleProcessPayment} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Parcela:</span>
              <span className="font-mono font-medium text-slate-900">
                {selectedInstallment?.installmentNumber}/{selectedInstallment?.totalInstallments} ({selectedInstallment?.contractNumber})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Contratante:</span>
              <span className="font-medium text-slate-900">
                {selectedInstallment?.customerName || selectedInstallment?.condominiumName || '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vencimento Bancário:</span>
              <span className="font-mono text-slate-800">
                {selectedInstallment && new Date(selectedInstallment.businessDueDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-500">Saldo em Aberto:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(selectedInstallment?.balanceAmount)}
              </span>
            </div>
          </div>

          {chargesInfo && chargesInfo.daysLate > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-md text-xs space-y-1">
              <div className="font-medium text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-600" /> Parcela com {chargesInfo.daysLate} dia(s) de atraso
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Multa por atraso contratual:</span>
                <span className="font-mono">{formatCurrency(chargesInfo.penaltyAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Juros de mora pro-rata dia:</span>
                <span className="font-mono">{formatCurrency(chargesInfo.interestAmount)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Data do Pagamento *</label>
              <input
                type="date"
                required
                value={paymentForm.paymentDate}
                onChange={(e) => handleDateChangeInPayment(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Valor Recebido (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={paymentForm.amountReceived}
                onChange={(e) => setPaymentForm({ ...paymentForm, amountReceived: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono font-bold"
              />
            </div>
          </div>

          {selectedInstallment && (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs" aria-live="polite">
              <div className="flex justify-between"><span className="text-slate-500">Saldo atual</span><strong>{formatCurrency(selectedInstallment.balanceAmount)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Valor desta baixa</span><strong>{formatCurrency(paymentForm.amountReceived)}</strong></div>
              <div className="mt-1 flex justify-between border-t border-slate-200 pt-1"><span className="text-slate-600">Saldo após a baixa</span><strong className={paymentForm.amountReceived < selectedInstallment.balanceAmount ? 'text-amber-700' : 'text-emerald-700'}>{formatCurrency(Math.max(0, selectedInstallment.balanceAmount - paymentForm.amountReceived))}</strong></div>
              {paymentForm.amountReceived > selectedInstallment.balanceAmount + paymentForm.penaltyApplied + paymentForm.interestApplied - paymentForm.discountApplied && <p className="mt-1 text-[#A61F24]">O valor não pode ser maior que o total devido.</p>}
              {paymentForm.amountReceived > 0 && paymentForm.amountReceived < selectedInstallment.balanceAmount && <p className="mt-1 text-amber-700">Esta baixa será parcial e a parcela continuará em aberto.</p>}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Multa Cobrada</label>
              <input
                type="number"
                step="0.01"
                value={paymentForm.penaltyApplied}
                onChange={(e) => setPaymentForm({ ...paymentForm, penaltyApplied: Number(e.target.value) })}
                className="w-full px-3 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Juros Cobrados</label>
              <input
                type="number"
                step="0.01"
                value={paymentForm.interestApplied}
                onChange={(e) => setPaymentForm({ ...paymentForm, interestApplied: Number(e.target.value) })}
                className="w-full px-3 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Desconto</label>
              <input
                type="number"
                step="0.01"
                value={paymentForm.discountApplied}
                onChange={(e) => setPaymentForm({ ...paymentForm, discountApplied: Number(e.target.value) })}
                className="w-full px-3 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Forma de Liquidação *</label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as PaymentMethod })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              >
                <option value="PIX">PIX</option>
                <option value="BOLETO">Boleto Bancário</option>
                <option value="BANK_TRANSFER">TED / Transferência Bancária</option>
                <option value="CASH">Dinheiro em Espécie</option>
                <option value="CREDIT_CARD">Cartão de Crédito</option>
                <option value="DEBIT_CARD">Cartão de Débito</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Cód. Autenticação Bancária</label>
              <input
                type="text"
                placeholder="Ex: NSU-88219"
                value={paymentForm.transactionReference}
                onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Observações Contábeis</label>
            <input
              type="text"
              placeholder="Notas de conciliação bancária ou comprovante de depósito"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessingPayment || paymentForm.amountReceived <= 0 || Boolean(selectedInstallment && paymentForm.amountReceived > selectedInstallment.balanceAmount + paymentForm.penaltyApplied + paymentForm.interestApplied - paymentForm.discountApplied)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {isProcessingPayment ? 'Registrando...' : 'Confirmar Quitação'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Renegociação de Débitos */}
      <Modal
        isOpen={isRenegotiateModalOpen}
        onClose={() => setIsRenegotiateModalOpen(false)}
        title="Renegociação de Débitos & Repactuação"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleProcessRenegotiation} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Contrato de Origem *</label>
            <select
              required
              value={selectedContractId}
              onChange={(e) => handleContractSelectInRenegotiation(Number(e.target.value))}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
            >
              <option value="">Escolha o contrato para renegociação...</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.contractNumber} - {c.customerName || c.condominiumName} ({c.serviceLabel || c.condominiumName || 'Contrato'})
                </option>
              ))}
            </select>
          </div>

          {selectedContractId && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Selecione as Parcelas para Consolidar ({contractInstallments.length} elegíveis)
              </label>

              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-md p-2 space-y-1 text-xs">
                {contractInstallments.map((i) => (
                  <label
                    key={i.id}
                    className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedInstIds.includes(i.id)}
                        onChange={() => toggleSelectInst(i.id)}
                        className="rounded text-slate-900"
                      />
                      <span className="font-medium text-slate-800">
                        Parc. {i.installmentNumber}/{i.totalInstallments} (Venc:{' '}
                        {new Date(i.businessDueDate).toLocaleDateString('pt-BR')})
                      </span>
                    </div>
                    <span className="font-mono font-medium text-slate-900">{formatCurrency(i.balanceAmount)}</span>
                  </label>
                ))}
              </div>

              {selectedInstIds.length > 0 && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs flex justify-between font-medium text-slate-800">
                  <span>{selectedInstIds.length} parcela(s) selecionada(s)</span>
                  <span className="font-mono">Saldo Consolidado: {formatCurrency(selectedBalanceSum)}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Juros Acordados (+ R$)</label>
              <input
                type="number"
                step="0.01"
                value={renegotiateForm.agreedInterestAmount}
                onChange={(e) =>
                  setRenegotiateForm({ ...renegotiateForm, agreedInterestAmount: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Desconto Concedido (- R$)</label>
              <input
                type="number"
                step="0.01"
                value={renegotiateForm.agreedDiscountAmount}
                onChange={(e) =>
                  setRenegotiateForm({ ...renegotiateForm, agreedDiscountAmount: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="p-2.5 bg-slate-100 rounded-md text-xs flex justify-between font-medium text-slate-900">
            <span>Novo Saldo Total Renegociado:</span>
            <span className="font-mono font-bold">{formatCurrency(renegotiatedFinalTotal)}</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Qtd Novas Parcelas *</label>
              <input
                type="number"
                min={1}
                required
                value={renegotiateForm.newInstallmentsCount}
                onChange={(e) =>
                  setRenegotiateForm({ ...renegotiateForm, newInstallmentsCount: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">1º Vencimento *</label>
              <input
                type="date"
                required
                value={renegotiateForm.firstDueDate}
                onChange={(e) => setRenegotiateForm({ ...renegotiateForm, firstDueDate: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Dia Fixo *</label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={renegotiateForm.dueDayOfMonth}
                onChange={(e) =>
                  setRenegotiateForm({ ...renegotiateForm, dueDayOfMonth: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Motivo da Renegociação *</label>
            <textarea
              required
              placeholder="Ex: Repactuação de parcelas em atraso referente a serviços de pintura de fachada."
              rows={2}
              value={renegotiateForm.reason}
              onChange={(e) => setRenegotiateForm({ ...renegotiateForm, reason: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRenegotiateModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessingRenegotiation}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs disabled:opacity-50"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              {isProcessingRenegotiation ? 'Salvando...' : 'Concluir Renegociação'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Recibo de Quitação */}
      {viewingReceiptInstallment && (
        <Modal
          isOpen={true}
          onClose={() => setViewingReceiptInstallment(null)}
          title="Ficha da parcela"
          subtitle={`Comprovante de quitação · Contrato ${viewingReceiptInstallment.contractNumber}`}
          detail
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Contrato:</span>
                <span className="font-mono font-bold text-slate-900">{viewingReceiptInstallment.contractNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Parcela:</span>
                <span className="font-mono text-slate-800">
                  {viewingReceiptInstallment.installmentNumber}/{viewingReceiptInstallment.totalInstallments}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contratante:</span>
                <span className="font-medium text-slate-900">
                  {viewingReceiptInstallment.customerName || viewingReceiptInstallment.condominiumName || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Obra / Serviço:</span>
                <span className="text-slate-800">
                  {viewingReceiptInstallment.serviceLabel || viewingReceiptInstallment.condominiumName || 'Construção Civil'}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500">Valor Total Pago:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(viewingReceiptInstallment.paidAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo Remanescente:</span>
                <span className="font-mono text-slate-800">
                  {formatCurrency(viewingReceiptInstallment.balanceAmount)}
                </span>
              </div>
            </div>

            {viewingReceiptInstallment.payments && viewingReceiptInstallment.payments.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-slate-700">Histórico de Pagamentos</h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-md p-2 text-xs">
                  {viewingReceiptInstallment.payments.map((p) => (
                    <div key={p.id} className="py-1.5 flex justify-between items-center">
                      <div>
                        <div className="font-mono text-slate-800">
                          {new Date(p.paymentDate).toLocaleDateString('pt-BR')} • {p.paymentMethod}
                        </div>
                        {p.transactionReference && (
                          <div className="text-[10px] text-slate-400 font-mono">Ref: {p.transactionReference}</div>
                        )}
                      </div>
                      <div className="font-mono font-bold text-slate-900">{formatCurrency(p.amountReceived)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingReceiptInstallment(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
