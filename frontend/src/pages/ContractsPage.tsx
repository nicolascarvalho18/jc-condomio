import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
  Contract,
  Customer,
  Condominium,
  SimulationResponse,
  AdjustmentIndex,
  ServiceType,
  SERVICE_TYPE_LABELS,
  PricingModel,
  PaymentMethod,
  StandardStatus,
  StatusChangePayload,
} from '../types';
import { StatusSelect } from '../components/common/StatusSelect';
import { StatusFilter } from '../components/common/StatusFilter';
import {
  FileSignature,
  Search,
  Calculator,
  Eye,
  XCircle,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  Edit2,
  StopCircle,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { Pagination } from '../components/common/Pagination';
import { useToast } from '../context/ToastContext';
import { DocumentDownloadButton } from '../components/common/DocumentDownloadButton';

interface ContractsPageProps {
  onNavigateToReports?: () => void;
  initialOpenModal?: boolean;
  onModalClose?: () => void;
  preselectedContractor?: {
    type: 'CUSTOMER' | 'CONDOMINIUM';
    id: number;
  } | null;
}

export const ContractsPage: React.FC<ContractsPageProps> = ({
  onNavigateToReports: _onNavigateToReports,
  initialOpenModal = false,
  onModalClose,
  preselectedContractor = null,
}) => {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StandardStatus | 'ALL'>('ALL');

  // Paginação
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Dados auxiliares para o formulário
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);

  // Wizard de Cadastro de Contrato
  const [isNewModalOpen, setIsNewModalOpen] = useState(initialOpenModal);
  const [contractorChoice, setContractorChoice] = useState<'CUSTOMER' | 'CONDOMINIUM'>(
    preselectedContractor?.type === 'CONDOMINIUM' ? 'CONDOMINIUM' : 'CUSTOMER'
  );

  // Form: Dados Comuns e Específicos
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>(
    preselectedContractor?.type === 'CUSTOMER' ? preselectedContractor.id : ''
  );
  const [selectedCondoId, setSelectedCondoId] = useState<number | ''>(
    preselectedContractor?.type === 'CONDOMINIUM' ? preselectedContractor.id : ''
  );
  const [selectedWorkId, setSelectedWorkId] = useState<number | ''>(''); // Empreendimento ou Obra relacionada
  const [serviceType, setServiceType] = useState<ServiceType>('CONSTRUCTION');
  const [serviceDescription, setServiceDescription] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [contractDate, setContractDate] = useState(new Date().toISOString().split('T')[0]);

  // Valores e Modelo de Cobrança
  const [pricingModel, setPricingModel] = useState<PricingModel>('TOTAL_VALUE');
  const [amountInput, setAmountInput] = useState<number | ''>(''); // Valor total ou Valor mensal
  const [downPaymentAmount, setDownPaymentAmount] = useState<number | ''>(0);
  const [downPaymentInstallmentsCount, setDownPaymentInstallmentsCount] = useState<number>(1);
  const [installmentsCount, setInstallmentsCount] = useState<number | ''>(12);
  const [firstDueDate, setFirstDueDate] = useState(
    new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]
  );
  const [dueDayOfMonth, setDueDayOfMonth] = useState<number | ''>(10);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BOLETO');
  const [adjustmentIndex, setAdjustmentIndex] = useState<AdjustmentIndex>('INCC');
  const [discountAmount, setDiscountAmount] = useState<number | ''>(0);
  const [penaltyPercent, setPenaltyPercent] = useState<number>(2.0);
  const [interestPercentMonthly, setInterestPercentMonthly] = useState<number>(1.0);
  const [notes, setNotes] = useState('');

  // Simulação de parcelas
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSavingContract, setIsSavingContract] = useState(false);

  // Modal: Detalhes do Contrato
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [contractInstallments, setContractInstallments] = useState<any[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);

  // Modal: Editar Contrato
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    serviceType: 'CONSTRUCTION' as ServiceType,
    serviceDescription: '',
    paymentCondition: '',
    adjustmentIndex: 'INCC' as AdjustmentIndex,
    penaltyPercent: 2.0,
    interestPercentMonthly: 1.0,
    notes: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal: Encerrar Contrato
  const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [cancelFutureInstallments, setCancelFutureInstallments] = useState(true);
  const [isTerminating, setIsTerminating] = useState(false);

  // Modal: Cancelar Contrato
  const [cancelingContractId, setCancelingContractId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);

  // Busca e Carregamento
  const fetchAuxData = async () => {
    try {
      const [custRes, condoRes] = await Promise.allSettled([
        api.get('/customers', { params: { size: 100 } }),
        api.get('/condominiums', { params: { size: 100 } }),
      ]);
      if (custRes.status === 'fulfilled') {
        const data = custRes.value.data;
        setCustomers(Array.isArray(data) ? data : data.content || []);
      }
      if (condoRes.status === 'fulfilled') {
        const data = condoRes.value.data;
        setCondominiums(Array.isArray(data) ? data : data.content || []);
      }
    } catch (e) {
      console.error('Erro ao buscar clientes/condomínios', e);
    }
  };

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, size };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/contracts', { params });
      const data = res.data;
      setContracts(Array.isArray(data) ? data : data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (e) {
      console.error('Erro ao listar contratos', e);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page, size]);

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Contratante selecionado para exibição instantânea
  const activeCustomer = customers.find((c) => c.id === Number(selectedCustomerId));
  const activeCondominium = condominiums.find((c) => c.id === Number(selectedCondoId));

  // Reset e Abertura de Modal de Criação
  const handleOpenNewModal = (type: 'CUSTOMER' | 'CONDOMINIUM' = 'CUSTOMER') => {
    setContractorChoice(type);
    setSelectedCustomerId('');
    setSelectedCondoId('');
    setSelectedWorkId('');
    setServiceType('CONSTRUCTION');
    setServiceDescription('');
    const rnd = Math.floor(1000 + Math.random() * 9000);
    setContractNumber(`CTR-${new Date().getFullYear()}-${rnd}`);
    setContractDate(new Date().toISOString().split('T')[0]);
    setPricingModel('TOTAL_VALUE');
    setAmountInput('');
    setDownPaymentAmount(0);
    setDownPaymentInstallmentsCount(1);
    setInstallmentsCount(12);
    setFirstDueDate(new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]);
    setDueDayOfMonth(10);
    setPaymentMethod('BOLETO');
    setAdjustmentIndex('INCC');
    setDiscountAmount(0);
    setPenaltyPercent(2.0);
    setInterestPercentMonthly(1.0);
    setNotes('');
    setSimulation(null);
    setValidationError(null);
    setIsNewModalOpen(true);
  };

  const handleCloseNewModal = () => {
    setIsNewModalOpen(false);
    if (onModalClose) onModalClose();
  };

  // Cálculo de Simulação
  const handleSimulate = async () => {
    setValidationError(null);

    if (contractorChoice === 'CUSTOMER' && !selectedCustomerId) {
      setValidationError('Selecione um cliente cadastrado.');
      return;
    }
    if (contractorChoice === 'CONDOMINIUM' && !selectedCondoId) {
      setValidationError('Selecione um condomínio cadastrado.');
      return;
    }
    if (!amountInput || Number(amountInput) <= 0) {
      setValidationError('Informe um valor válido e positivo.');
      return;
    }
    if (!installmentsCount || Number(installmentsCount) <= 0) {
      setValidationError('Informe a quantidade de parcelas (mínimo 1).');
      return;
    }
    if (!firstDueDate) {
      setValidationError('Informe a data do primeiro vencimento.');
      return;
    }
    if (!dueDayOfMonth || Number(dueDayOfMonth) < 1 || Number(dueDayOfMonth) > 31) {
      setValidationError('Informe um dia fixo de vencimento válido (entre 1 e 31).');
      return;
    }

    setIsSimulating(true);

    try {
      let simTotal: number;
      let simDownPayment = Number(downPaymentAmount) || 0;
      let simMonths = Number(installmentsCount);

      if (pricingModel === 'MONTHLY_VALUE') {
        simTotal = Number(amountInput) * simMonths;
        simDownPayment = 0;
      } else {
        simTotal = Number(amountInput);
      }

      const res = await api.post('/contracts/simulate', {
        totalAmount: simTotal,
        downPayment: simDownPayment,
        downPaymentInstallmentsCount: Number(downPaymentInstallmentsCount) || 1,
        downPaymentFirstDueDate: contractDate,
        monthlyInstallmentsCount: simMonths,
        firstDueDate: firstDueDate,
        dueDayOfMonth: Number(dueDayOfMonth),
        hasIntermediateInstallments: false,
        intermediateInstallmentsCount: 0,
        intermediateFrequencyMonths: 0,
        intermediateAmountPerInstallment: 0,
        keysInstallmentAmount: 0,
      });

      setSimulation(res.data);
    } catch (err: any) {
      setValidationError(err.response?.data?.message || 'Erro ao simular parcelas. Verifique os valores informados.');
      setSimulation(null);
    } finally {
      setIsSimulating(false);
    }
  };

  // Salvar Contrato
  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulation) {
      setValidationError('Gere a simulação de parcelas antes de formalizar o contrato.');
      return;
    }

    setIsSavingContract(true);
    setValidationError(null);

    try {
      let totalValue = Number(amountInput);
      if (pricingModel === 'MONTHLY_VALUE') {
        totalValue = Number(amountInput) * Number(installmentsCount);
      }

      const payload: any = {
        contractType: contractorChoice === 'CUSTOMER' ? 'CUSTOMER_PURCHASE' : 'CONDOMINIUM',
        customerId: contractorChoice === 'CUSTOMER' ? Number(selectedCustomerId) : null,
        condominiumId: contractorChoice === 'CONDOMINIUM' ? Number(selectedCondoId) : (selectedWorkId ? Number(selectedWorkId) : null),
        serviceType: serviceType,
        serviceDescription: serviceDescription,
        pricingModel: pricingModel,
        billingType: pricingModel === 'MONTHLY_VALUE' ? 'MONTHLY_RECURRING' : (Number(installmentsCount) === 1 ? 'SINGLE' : 'PARCELED'),
        paymentMethod: paymentMethod,
        discountAmount: Number(discountAmount) || 0,
        contractNumber: contractNumber.trim(),
        contractDate: contractDate,
        description: serviceDescription ? `${SERVICE_TYPE_LABELS[serviceType]}: ${serviceDescription}` : SERVICE_TYPE_LABELS[serviceType],
        paymentCondition: pricingModel === 'MONTHLY_VALUE' ? `${installmentsCount}x de R$ ${amountInput} (Mensal)` : `${installmentsCount} parcelas`,
        adjustmentIndex: adjustmentIndex,
        penaltyPercent: penaltyPercent,
        interestPercentMonthly: interestPercentMonthly,
        graceDays: 0,
        notes: notes,
        financialPlan: {
          totalAmount: pricingModel === 'MONTHLY_VALUE' ? Number(amountInput) : totalValue,
          downPayment: pricingModel === 'MONTHLY_VALUE' ? 0 : (Number(downPaymentAmount) || 0),
          downPaymentInstallmentsCount: Number(downPaymentInstallmentsCount) || 1,
          downPaymentFirstDueDate: contractDate,
          monthlyInstallmentsCount: Number(installmentsCount),
          firstDueDate: firstDueDate,
          dueDayOfMonth: Number(dueDayOfMonth),
          hasIntermediateInstallments: false,
          intermediateInstallmentsCount: 0,
          intermediateFrequencyMonths: 0,
          intermediateAmountPerInstallment: 0,
          keysInstallmentAmount: 0,
        },
      };

      await api.post('/contracts', payload);
      handleCloseNewModal();
      fetchContracts();
    } catch (err: any) {
      setValidationError(err.response?.data?.message || 'Erro ao registrar contrato no banco.');
    } finally {
      setIsSavingContract(false);
    }
  };

  // Ver Detalhes do Contrato
  const viewContractDetails = async (c: Contract) => {
    setSelectedContract(c);
    setIsDetailsModalOpen(true);
    setLoadingInstallments(true);
    try {
      const res = await api.get(`/contracts/${c.id}/installments`);
      setContractInstallments(res.data || []);
    } catch (e) {
      console.error('Erro ao carregar parcelas do contrato', e);
      setContractInstallments([]);
    } finally {
      setLoadingInstallments(false);
    }
  };

  // Abrir Modal de Edição
  const openEditModal = () => {
    if (!selectedContract) return;
    setEditForm({
      serviceType: selectedContract.serviceType || 'CONSTRUCTION',
      serviceDescription: selectedContract.serviceDescription || selectedContract.description || '',
      paymentCondition: selectedContract.paymentCondition || '',
      adjustmentIndex: selectedContract.adjustmentIndex || 'INCC',
      penaltyPercent: selectedContract.penaltyPercent || 2.0,
      interestPercentMonthly: selectedContract.interestPercentMonthly || 1.0,
      notes: selectedContract.notes || '',
    });
    setIsEditModalOpen(true);
  };

  // Salvar Edição de Contrato
  const handleUpdateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;
    setIsUpdating(true);
    try {
      const res = await api.put(`/contracts/${selectedContract.id}`, editForm);
      setSelectedContract(res.data);
      setIsEditModalOpen(false);
      toast.success('Contrato atualizado com sucesso.', 'Contrato Atualizado');
      fetchContracts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar dados do contrato.', 'Erro ao Atualizar');
    } finally {
      setIsUpdating(false);
    }
  };

  // Abrir Modal de Encerramento
  const openTerminateModal = () => {
    setTerminateReason('');
    setCancelFutureInstallments(true);
    setIsTerminateModalOpen(true);
  };

  // Confirmar Encerramento
  const handleTerminateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract || !terminateReason.trim()) {
      toast.warning('Informe o motivo do encerramento do contrato.', 'Campo Obrigatório');
      return;
    }
    setIsTerminating(true);
    try {
      const res = await api.post(`/contracts/${selectedContract.id}/terminate`, {
        reason: terminateReason.trim(),
        cancelPendingInstallments: cancelFutureInstallments,
      });
      setSelectedContract(res.data);
      setIsTerminateModalOpen(false);
      toast.success('Contrato encerrado com sucesso.', 'Contrato Encerrado');
      // Recarregar parcelas
      const instRes = await api.get(`/contracts/${selectedContract.id}/installments`);
      setContractInstallments(instRes.data || []);
      fetchContracts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao encerrar contrato.', 'Erro no Encerramento');
    } finally {
      setIsTerminating(false);
    }
  };

  // Alterar Status do Contrato (Ativo, Pausado, Encerrado, Cancelado)
  const handleContractStatusChange = async (contractId: number, payload: StatusChangePayload) => {
    try {
      const res = await api.patch(`/contracts/${contractId}/status`, payload);
      toast.success('Status do contrato alterado com sucesso.', 'Status Alterado');
      fetchContracts();
      if (selectedContract && selectedContract.id === contractId) {
        setSelectedContract(res.data);
        const instRes = await api.get(`/contracts/${contractId}/installments`);
        setContractInstallments(instRes.data || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao alterar status do contrato.', 'Erro no Status');
    }
  };

  // Confirmar Cancelamento via Modal Legado
  const handleCancelContract = async () => {
    if (!cancelingContractId) return;
    setIsCanceling(true);
    try {
      await handleContractStatusChange(cancelingContractId, {
        status: 'CANCELLED',
        reason: cancelReason || 'Cancelado pelo usuário',
        statusDate: new Date().toISOString().split('T')[0],
      });
      setCancelingContractId(null);
      toast.success('Contrato cancelado com sucesso.', 'Contrato Cancelado');
      if (selectedContract && selectedContract.id === cancelingContractId) {
        setIsDetailsModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Não foi possível cancelar o contrato.', 'Falha ao Cancelar');
    } finally {
      setIsCanceling(false);
    }
  };

  const formatCurrency = (val: number | undefined | null) => {
    if (val === undefined || val === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Contratos e Obras</h2>
          <p className="text-xs text-slate-500">
            Emissão de contratos de construção civil, reformas, serviços de engenharia e condomínios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenNewModal('CUSTOMER')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition shadow-xs"
          >
            <Users className="w-3.5 h-3.5 text-slate-600" />
            + Contrato com Cliente
          </button>
          <button
            onClick={() => handleOpenNewModal('CONDOMINIUM')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs"
          >
            <Building2 className="w-3.5 h-3.5" />
            + Contrato com Condomínio
          </button>
        </div>
      </div>

      {/* Toolbar: Filtros de Status e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Status:</span>
          <StatusFilter
            value={statusFilter}
            onChange={(s) => {
              setStatusFilter(s);
              setPage(0);
            }}
          />
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar contrato, cliente, condomínio ou serviço..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none transition"
          />
        </div>
      </div>

      {/* Tabela de Contratos */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-lg border border-slate-200">
          Carregando contratos...
        </div>
      ) : contracts.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="Nenhum contrato cadastrado"
          description="Formalize novos contratos de prestação de serviços, obras ou contratos de compra e venda."
          actionLabel="+ Emitir Contrato"
          onAction={() => handleOpenNewModal('CUSTOMER')}
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Contrato / Emissão</th>
                  <th className="px-4 py-3">Contratante</th>
                  <th className="px-4 py-3">Serviço / Obra</th>
                  <th className="px-4 py-3 text-right">Valor Total</th>
                  <th className="px-4 py-3 text-right">Saldo Devedor</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map((c) => {
                  const isClient = c.contractType === 'CUSTOMER_PURCHASE' || Boolean(c.customerId);
                  const contractorName = isClient ? (c.customerName || 'Cliente') : (c.condominiumName || 'Condomínio');
                  const serviceTitle = c.serviceType ? SERVICE_TYPE_LABELS[c.serviceType] : (c.description || 'Construção Civil');
                  const workTitle = c.condominiumName || 'Obra Própria';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3">
                        <div className="font-mono font-medium text-slate-900">{c.contractNumber}</div>
                        <div className="text-[11px] text-slate-400">
                          {c.contractDate ? new Date(c.contractDate).toLocaleDateString('pt-BR') : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {isClient ? <Users className="w-3.5 h-3.5 text-slate-500" /> : <Building2 className="w-3.5 h-3.5 text-slate-500" />}
                          {contractorName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {c.customerDocument || c.condominiumCnpj || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800 font-medium">{serviceTitle}</div>
                        <div className="text-[11px] text-slate-400">
                          {workTitle} {c.unitNumber && c.unitNumber !== 'Geral' ? `• Unid. ${c.unitNumber}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(c.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {formatCurrency(c.totalOutstandingBalance)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <StatusSelect
                            currentStatus={c.status}
                            entityName={`contrato "${c.contractNumber}"`}
                            onStatusChange={(payload) => handleContractStatusChange(c.id, payload)}
                          />
                          {c.statusReason && c.status !== 'ACTIVE' && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5" title={c.statusReason}>
                              {c.statusReason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5">
                        <button
                          onClick={() => viewContractDetails(c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition"
                        >
                          <Eye className="w-3 h-3" />
                          Detalhes
                        </button>
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

      {/* ========================================================================= */}
      {/* MODAL DE CADASTRO DE CONTRATO (CONSTRUÇÃO CIVIL / CLIENTE OU CONDOMÍNIO)  */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={handleCloseNewModal}
        title="Emissão de Contrato de Construção Civil e Obras"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSaveContract} className="space-y-5">
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* 1. ESCOLHA DO TIPO DE CONTRATANTE (ESTRITAMENTE UM) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
              1. Escolha do Contratante *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setContractorChoice('CUSTOMER');
                  setSelectedCondoId('');
                  setSimulation(null);
                }}
                className={`p-3 rounded-lg border text-left transition flex items-start gap-3 ${
                  contractorChoice === 'CUSTOMER'
                    ? 'border-slate-900 bg-slate-50/80 ring-1 ring-slate-900'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="p-2 rounded-md bg-slate-100 text-slate-800">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">Cliente (Comprador / Tomador)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Contrato firmado com pessoa física ou jurídica cadastrada.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setContractorChoice('CONDOMINIUM');
                  setSelectedCustomerId('');
                  setSimulation(null);
                }}
                className={`p-3 rounded-lg border text-left transition flex items-start gap-3 ${
                  contractorChoice === 'CONDOMINIUM'
                    ? 'border-slate-900 bg-slate-50/80 ring-1 ring-slate-900'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="p-2 rounded-md bg-slate-100 text-slate-800">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">Condomínio (Administração / Obra)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Contrato de prestação de serviços ou obras prediais para o condomínio.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. DADOS DO CONTRATANTE (AUTO-PREENCHIMENTO) */}
          <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
              2. Dados do Contratante Selecionado
            </span>

            {contractorChoice === 'CUSTOMER' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Selecionar Cliente *</label>
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value === '' ? '' : Number(e.target.value));
                      setSimulation(null);
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                  >
                    <option value="">Selecione um cliente cadastrado...</option>
                    {customers.map((cust) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.name} — {cust.document} ({cust.city ? `${cust.city}/${cust.state || 'GO'}` : 'Geral'})
                      </option>
                    ))}
                  </select>
                </div>

                {activeCustomer && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white border border-slate-200 rounded-md text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">CPF / CNPJ:</span>
                      <span className="font-mono font-semibold text-slate-900">{activeCustomer.document || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Telefone de Contato:</span>
                      <span className="text-slate-800">{activeCustomer.phone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">E-mail Cadastrado:</span>
                      <span className="text-slate-800">{activeCustomer.email || '—'}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Selecionar Condomínio *</label>
                  <select
                    required
                    value={selectedCondoId}
                    onChange={(e) => {
                      setSelectedCondoId(e.target.value === '' ? '' : Number(e.target.value));
                      setSimulation(null);
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                  >
                    <option value="">Selecione um condomínio cadastrado...</option>
                    {condominiums.map((cond) => (
                      <option key={cond.id} value={cond.id}>
                        {cond.name} {cond.cnpj ? `— ${cond.cnpj}` : ''} ({cond.city ? `${cond.city}/${cond.state || 'GO'}` : ''})
                      </option>
                    ))}
                  </select>
                </div>

                {activeCondominium && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-white border border-slate-200 rounded-md text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">CNPJ & Tipo:</span>
                      <span className="font-mono font-semibold text-slate-900 block">{activeCondominium.cnpj || '—'}</span>
                      <span className="text-[11px] text-slate-500">{activeCondominium.typeLabel || activeCondominium.type}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Endereço da Obra:</span>
                      <span className="text-slate-800 font-medium block">
                        {activeCondominium.street ? `${activeCondominium.street}, ${activeCondominium.number || 'S/N'}` : '—'}
                      </span>
                      <span className="text-[11px] text-slate-500">{activeCondominium.city} - {activeCondominium.state}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Síndico / Gestor:</span>
                      <span className="text-slate-900 font-semibold block">
                        {activeCondominium.managerName || 'Não informado'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">{activeCondominium.managerPhone || activeCondominium.managerEmail || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Obra & Engenharia:</span>
                      <span className="text-slate-800 font-medium block">
                        {activeCondominium.workType || 'Construção Civil'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {activeCondominium.chiefEngineer ? `Eng. ${activeCondominium.chiefEngineer}` : (activeCondominium.constructionStatusLabel || activeCondominium.constructionStatus)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. DADOS DA OBRA E SERVIÇO CONTRATADO */}
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
              3. Dados da Obra e Serviço
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Empreendimento / Obra Relacionada
                </label>
                <select
                  value={contractorChoice === 'CONDOMINIUM' ? selectedCondoId : selectedWorkId}
                  disabled={contractorChoice === 'CONDOMINIUM'}
                  onChange={(e) => setSelectedWorkId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none disabled:bg-slate-100"
                >
                  <option value="">Selecione o empreendimento ou obra...</option>
                  {condominiums.map((cond) => (
                    <option key={cond.id} value={cond.id}>
                      {cond.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de Serviço *</label>
                <select
                  value={serviceType}
                  onChange={(e) => {
                    setServiceType(e.target.value as ServiceType);
                    setSimulation(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-medium text-slate-800"
                >
                  {Object.entries(SERVICE_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Descrição do Escopo / Serviço Contratado *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Detalhe o escopo do serviço (Ex: Reforma estrutural da fachada e impermeabilização da cobertura)"
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* 4. VALORES, MODELO DE COBRANÇA E VENCIMENTOS */}
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
              4. Valores e Condições de Pagamento
            </span>

            {/* Alternador de Modelo: Valor Total vs Valor Mensal Recorrente */}
            <div className="flex items-center gap-4 p-2 bg-slate-50 border border-slate-200 rounded-md text-xs">
              <span className="text-slate-600 font-medium">Definição do Valor:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="pricingModel"
                  checked={pricingModel === 'TOTAL_VALUE'}
                  onChange={() => {
                    setPricingModel('TOTAL_VALUE');
                    setSimulation(null);
                  }}
                  className="text-slate-900 focus:ring-slate-500"
                />
                <span className="font-semibold text-slate-800">Valor Total da Obra</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="pricingModel"
                  checked={pricingModel === 'MONTHLY_VALUE'}
                  onChange={() => {
                    setPricingModel('MONTHLY_VALUE');
                    setDownPaymentAmount(0);
                    setSimulation(null);
                  }}
                  className="text-slate-900 focus:ring-slate-500"
                />
                <span className="font-semibold text-slate-800">Valor Mensal Recorrente</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {pricingModel === 'TOTAL_VALUE' ? 'Valor Total do Contrato (R$) *' : 'Valor Mensal (R$) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder={pricingModel === 'TOTAL_VALUE' ? 'Ex: 120000.00' : 'Ex: 5000.00'}
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value === '' ? '' : Number(e.target.value));
                    setSimulation(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono font-medium"
                />
              </div>

              {pricingModel === 'TOTAL_VALUE' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Valor da Entrada / Sinal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={downPaymentAmount}
                    onChange={(e) => {
                      setDownPaymentAmount(e.target.value === '' ? '' : Number(e.target.value));
                      setSimulation(null);
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Desconto Mensal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={discountAmount}
                    onChange={(e) => {
                      setDiscountAmount(e.target.value === '' ? '' : Number(e.target.value));
                      setSimulation(null);
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {pricingModel === 'TOTAL_VALUE' ? 'Quantidade de Parcelas *' : 'Duração (Meses) *'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Ex: 12"
                  value={installmentsCount}
                  onChange={(e) => {
                    setInstallmentsCount(e.target.value === '' ? '' : Number(e.target.value));
                    setSimulation(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Primeiro Vencimento *</label>
                <input
                  type="date"
                  required
                  value={firstDueDate}
                  onChange={(e) => {
                    setFirstDueDate(e.target.value);
                    setSimulation(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Dia Fixo de Vencimento *</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  required
                  value={dueDayOfMonth}
                  onChange={(e) => {
                    setDueDayOfMonth(e.target.value === '' ? '' : Number(e.target.value));
                    setSimulation(null);
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Forma de Pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                >
                  <option value="BOLETO">Boleto Bancário</option>
                  <option value="PIX">PIX</option>
                  <option value="BANK_TRANSFER">Transferência Bancária</option>
                  <option value="CREDIT_CARD">Cartão de Crédito</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Espécie</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Índice de Reajuste</label>
                <select
                  value={adjustmentIndex}
                  onChange={(e) => setAdjustmentIndex(e.target.value as AdjustmentIndex)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                >
                  <option value="NONE">Sem Reajuste</option>
                  <option value="INCC">INCC (Construção Civil)</option>
                  <option value="IPCA">IPCA (Inflação)</option>
                  <option value="IGPM">IGP-M (Geral)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Multa por Atraso (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={penaltyPercent}
                  onChange={(e) => setPenaltyPercent(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Juros de Mora (% / mês)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={interestPercentMonthly}
                  onChange={(e) => setInterestPercentMonthly(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* 5. AÇÃO DE SIMULAÇÃO DE PARCELAS */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Calcule a grade de parcelas antes de gravar o contrato no banco de dados.
              </span>
              <button
                type="button"
                onClick={handleSimulate}
                disabled={isSimulating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition shadow-xs disabled:opacity-50"
              >
                <Calculator className="w-3.5 h-3.5" />
                {isSimulating ? 'Calculando...' : 'Calcular Simulação'}
              </button>
            </div>
          </div>

          {/* QUADRO DE SIMULAÇÃO CONFERIDA */}
          {simulation && (
            <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
                Cronograma de Parcelas Calculado
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-2.5 bg-white border border-slate-200 rounded-md text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[11px] block font-sans">Valor Total:</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(simulation.totalContractAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block font-sans">Parcelas Geradas:</span>
                  <span className="text-slate-800">{simulation.totalInstallmentsCount} parcelas</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block font-sans">Soma das Parcelas:</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(simulation.sumOfInstallments)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block font-sans">Diferença de Centavos:</span>
                  <span className="text-slate-700">{formatCurrency(simulation.difference)}</span>
                </div>
              </div>

              {/* Tabela de Parcelas */}
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-md text-xs bg-white">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="px-3 py-1.5">Nº</th>
                      <th className="px-3 py-1.5">Tipo</th>
                      <th className="px-3 py-1.5">Vencimento Bancário</th>
                      <th className="px-3 py-1.5 text-right">Valor da Parcela</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {simulation.installments.map((inst) => (
                      <tr key={inst.installmentNumber} className="hover:bg-slate-50/60">
                        <td className="px-3 py-1 font-mono text-slate-800">
                          {inst.installmentNumber}/{inst.totalInstallments}
                        </td>
                        <td className="px-3 py-1 text-slate-600">{inst.installmentType}</td>
                        <td className="px-3 py-1 font-mono text-slate-700">
                          {new Date(inst.businessDueDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-3 py-1 text-right font-mono font-medium text-slate-900">
                          {formatCurrency(inst.baseAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BOTÕES DO FORMULÁRIO */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleCloseNewModal}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!simulation || isSavingContract}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition shadow-xs ${
                simulation && !isSavingContract
                  ? 'text-white bg-slate-900 hover:bg-slate-800'
                  : 'text-slate-400 bg-slate-200 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isSavingContract ? 'Salvando no Banco...' : 'Salvar e Formalizar Contrato'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL DE DETALHES DO CONTRATO                                            */}
      {/* ========================================================================= */}
      {selectedContract && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title="Ficha do contrato"
          subtitle={`Contrato ${selectedContract.contractNumber}`}
          detail
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            {/* Informações do Contratante e Obra */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-md text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Contratante:</span>
                <span className="font-semibold text-slate-900">
                  {selectedContract.customerName || selectedContract.condominiumName || '—'}
                </span>
                <span className="text-[11px] text-slate-500 font-mono block">
                  {selectedContract.customerDocument || selectedContract.condominiumCnpj || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Serviço / Escopo:</span>
                <span className="font-medium text-slate-900">
                  {selectedContract.serviceType ? SERVICE_TYPE_LABELS[selectedContract.serviceType] : 'Construção Civil'}
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  {selectedContract.serviceDescription || selectedContract.description || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Obra / Local:</span>
                <span className="font-medium text-slate-900">{selectedContract.condominiumName || 'Obra Própria'}</span>
                <span className="text-[11px] text-slate-500 block">
                  {selectedContract.condominiumAddress || 'Geral'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] mb-1">Status Contratual:</span>
                <StatusSelect
                  currentStatus={selectedContract.status}
                  entityName={`contrato "${selectedContract.contractNumber}"`}
                  onStatusChange={(payload) => handleContractStatusChange(selectedContract.id, payload)}
                />
                {selectedContract.statusReason && selectedContract.status !== 'ACTIVE' && (
                  <div className="text-[11px] text-slate-500 mt-1 bg-white p-1.5 rounded border border-slate-200">
                    <span className="font-semibold text-slate-700">Motivo:</span> {selectedContract.statusReason}
                    {selectedContract.statusDate && <span className="text-slate-400"> • {selectedContract.statusDate}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Painel Financeiro */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-white border border-slate-200 rounded-md text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[11px] font-sans">Valor Total:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(selectedContract.totalAmount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-sans">Total Liquidado:</span>
                <span className="text-slate-800">{formatCurrency(selectedContract.totalPaidAmount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-sans">Saldo em Aberto:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(selectedContract.totalOutstandingBalance)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-sans">Parcelas (Pagas / Total):</span>
                <span className="text-slate-800">
                  {selectedContract.paidInstallmentsCount} de {selectedContract.totalInstallmentsCount}
                </span>
              </div>
            </div>

            {/* Tabela de Parcelas */}
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 mb-4 bg-slate-50 border border-slate-200 rounded-md text-xs">
                <div><span className="text-slate-500 block">Multa padrão</span><span className="font-semibold text-slate-900">{Number(selectedContract.penaltyPercent || 0).toFixed(2)}%</span></div>
                <div><span className="text-slate-500 block">Juros mensais</span><span className="font-semibold text-slate-900">{Number(selectedContract.interestPercentMonthly || 0).toFixed(2)}%</span></div>
                <div><span className="text-slate-500 block">Carência</span><span className="font-semibold text-slate-900">{selectedContract.graceDays || 0} dias</span></div>
                <div><span className="text-slate-500 block">Encargos calculados</span><span className="font-semibold text-slate-900">{formatCurrency(contractInstallments.reduce((sum, i) => sum + (i.penaltyAmount || 0) + (i.interestAmount || 0), 0))}</span></div>
                <div><span className="text-slate-500 block">Total atualizado</span><span className="font-semibold text-slate-900">{formatCurrency(contractInstallments.reduce((sum, i) => sum + (i.updatedAmount || i.totalPayable || i.baseAmount), 0))}</span></div>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-2">
                Cronograma e Liquidações
              </span>

              {loadingInstallments ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-slate-200 rounded-md">
                  Carregando parcelas...
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-md text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="px-3 py-2">Parcela</th>
                        <th className="px-3 py-2">Tipo</th>
                        <th className="px-3 py-2">Vencimento Bancário</th>
                        <th className="px-3 py-2 text-right">Valor original</th>
                        <th className="px-3 py-2 text-right">Multa</th>
                        <th className="px-3 py-2 text-right">Juros</th>
                        <th className="px-3 py-2 text-right">Atualizado</th>
                        <th className="px-3 py-2 text-right">Valor Pago</th>
                        <th className="px-3 py-2 text-right">Saldo</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {contractInstallments.map((i) => (
                        <tr key={i.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-1.5 font-mono font-medium text-slate-800">
                            {i.installmentNumber}/{i.totalInstallments}
                          </td>
                          <td className="px-3 py-1.5 text-slate-600">{i.installmentType}</td>
                          <td className="px-3 py-1.5 font-mono text-slate-700">
                            {new Date(i.businessDueDate).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-900">
                            {formatCurrency(i.originalAmount || i.baseAmount)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-700">
                            {formatCurrency(i.penaltyAmount)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-700">
                            {formatCurrency(i.interestAmount)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-900">
                            {formatCurrency(i.updatedAmount || i.totalPayable)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-700">
                            {formatCurrency(i.paidAmount)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-medium text-slate-900">
                            {formatCurrency(i.balanceAmount)}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <Badge variant="neutral">
                              {i.financialSituationLabel || (
                                i.financialSituation === 'PAGA'
                                  ? 'Paga'
                                  : i.financialSituation === 'VENCIDA'
                                  ? 'Vencida'
                                  : i.financialSituation === 'VENCE_HOJE'
                                  ? 'Vence hoje'
                                  : i.financialSituation === 'PARCIALMENTE_PAGA'
                                  ? 'Pagamento parcial'
                                  : i.financialSituation === 'CANCELADA'
                                  ? 'Cancelada'
                                  : 'Não paga'
                              )}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Barra de Ações do Contrato */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <DocumentDownloadButton type="pdf" contractId={selectedContract.id} contractNumber={selectedContract.contractNumber} />
                <DocumentDownloadButton type="excel" contractId={selectedContract.id} contractNumber={selectedContract.contractNumber} />
              </div>

              <div className="flex items-center gap-2">
                {selectedContract.status === 'ACTIVE' && (
                  <>
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition shadow-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-600" /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={openTerminateModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition shadow-xs"
                    >
                      <StopCircle className="w-3.5 h-3.5 text-slate-600" /> Encerrar contrato
                    </button>
                    {selectedContract.paidInstallmentsCount === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancelingContractId(selectedContract.id);
                          setCancelReason('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition shadow-xs"
                      >
                        <XCircle className="w-3.5 h-3.5 text-slate-500" /> Cancelar
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE EDIÇÃO DE CONTRATO                                               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Dados do Contrato"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleUpdateContract} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de Serviço</label>
            <select
              value={editForm.serviceType}
              onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value as ServiceType })}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
            >
              {Object.entries(SERVICE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Descrição / Escopo do Serviço</label>
            <textarea
              rows={2}
              value={editForm.serviceDescription}
              onChange={(e) => setEditForm({ ...editForm, serviceDescription: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Índice de Reajuste</label>
              <select
                value={editForm.adjustmentIndex}
                onChange={(e) => setEditForm({ ...editForm, adjustmentIndex: e.target.value as AdjustmentIndex })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              >
                <option value="NONE">Sem Reajuste</option>
                <option value="INCC">INCC</option>
                <option value="IPCA">IPCA</option>
                <option value="IGPM">IGP-M</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Condição de Pagamento</label>
              <input
                type="text"
                value={editForm.paymentCondition}
                onChange={(e) => setEditForm({ ...editForm, paymentCondition: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Observações Internas</label>
            <textarea
              rows={2}
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL DE ENCERRAMENTO DE CONTRATO                                         */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isTerminateModalOpen}
        onClose={() => setIsTerminateModalOpen(false)}
        title="Encerrar Contrato"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleTerminateContract} className="space-y-4">
          <p className="text-xs text-slate-600">
            O encerramento formaliza a conclusão ou término antecipado do contrato, impedindo a emissão de cobranças futuras e mantendo todo o histórico financeiro intacto no banco de dados.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Motivo do Encerramento *</label>
            <textarea
              rows={3}
              required
              placeholder="Ex: Conclusão e entrega definitiva da obra / Encerramento consensual"
              value={terminateReason}
              onChange={(e) => setTerminateReason(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer p-2.5 bg-slate-50 border border-slate-200 rounded-md">
            <input
              type="checkbox"
              checked={cancelFutureInstallments}
              onChange={(e) => setCancelFutureInstallments(e.target.checked)}
              className="mt-0.5 rounded text-slate-900 focus:ring-slate-500"
            />
            <span>Cancelar parcelas pendentes futuras não pagas (evitando débitos em aberto pós-encerramento).</span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTerminateModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={isTerminating}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs disabled:opacity-50"
            >
              <StopCircle className="w-3.5 h-3.5" />
              {isTerminating ? 'Encerrando...' : 'Confirmar Encerramento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL DE CANCELAMENTO DE CONTRATO                                         */}
      {/* ========================================================================= */}
      {cancelingContractId && (
        <Modal
          isOpen={Boolean(cancelingContractId)}
          onClose={() => setCancelingContractId(null)}
          title="Cancelar Contrato"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              O cancelamento anulará o contrato e suas parcelas abertas. Esta ação só é permitida caso nenhuma parcela tenha sido quitada.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Motivo do Cancelamento</label>
              <textarea
                rows={2}
                placeholder="Ex: Desistência mútua antes do início das obras"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelingContractId(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleCancelContract}
                disabled={isCanceling}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                {isCanceling ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
