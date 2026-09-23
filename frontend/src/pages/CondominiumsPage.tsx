import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
  Condominium,
  CondominiumType,
  ConstructionStatus,
  StandardStatus,
  CONDOMINIUM_TYPE_LABELS,
  CONSTRUCTION_STATUS_LABELS,
} from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { StatusSelect } from '../components/common/StatusSelect';
import { StatusFilter } from '../components/common/StatusFilter';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  UserCheck,
  HardHat,
  CheckCircle,
  AlertCircle,
  MapPin,
  Eye,
  FileSignature,
  ArrowRight,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';
import { maskCpf, maskCnpj, maskCep, maskPhone } from '../utils/masks';

interface CondominiumsPageProps {
  initialOpenModal?: boolean;
  onModalClose?: () => void;
  onNavigateToContracts?: () => void;
}

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const WORK_TYPES = [
  'Construção Nova',
  'Reforma Estrutural',
  'Manutenção Predial',
  'Pintura de Fachada',
  'Ampliação',
  'Instalações Elétricas / Hidráulicas',
  'Restauração Patrimonial',
  'Infraestrutura & Pavimentação',
  'Outro',
];

const INITIAL_CONDO_FORM_STATE = {
  // Seção 1: Dados do Condomínio / Empreendimento
  name: '',
  cnpj: '',
  type: 'RESIDENTIAL_CONDOMINIUM' as CondominiumType,
  registrationNumber: '',
  permitNumber: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: 'GO',

  // Seção 2: Responsáveis
  managerName: '',
  managerCpf: '',
  managerPhone: '',
  managerEmail: '',
  administratorName: '',
  administratorCnpj: '',
  financialContactName: '',
  financialContactPhone: '',
  financialContactEmail: '',

  // Seção 3: Dados da Obra
  workType: 'Construção Nova',
  constructionStatus: 'IN_PROGRESS' as ConstructionStatus,
  startDate: '',
  expectedCompletionDate: '',
  haltReason: '',
  constructionCompany: '',
  chiefEngineer: '',
  creaCau: '',
  notes: '',

  // Seção 4: Estrutura
  totalBlocks: 1,
  totalTowers: 1,
  totalUnitsPlanned: 10,
  parkingSpaces: 10,
  totalArea: 1000.0,
};

export const CondominiumsPage: React.FC<CondominiumsPageProps> = ({
  initialOpenModal = false,
  onModalClose,
  onNavigateToContracts,
}) => {
  const { toast } = useToast();
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // View Details Modal State
  const [viewingCondo, setViewingCondo] = useState<Condominium | null>(null);

  // Form Modal State (Creation / Edition)
  const [isCondoModalOpen, setIsCondoModalOpen] = useState(initialOpenModal);
  const [editingCondo, setEditingCondo] = useState<Condominium | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: number;
    title: string;
    message: string;
  }>({
    isOpen: false,
    id: 0,
    title: '',
    message: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const [condoForm, setCondoForm] = useState(INITIAL_CONDO_FORM_STATE);

  const handleOpenCreateCondo = useCallback(() => {
    setEditingCondo(null);
    setCondoForm(INITIAL_CONDO_FORM_STATE);
    setCurrentStep(1);
    setFormError(null);
    setIsCondoModalOpen(true);
  }, []);

  useEffect(() => {
    if (initialOpenModal) {
      handleOpenCreateCondo();
    }
  }, [initialOpenModal, handleOpenCreateCondo]);

  const handleOpenEditCondo = (condo: Condominium, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCondo(condo);
    setCondoForm({
      name: condo.name || '',
      cnpj: condo.cnpj || '',
      type: condo.type || 'RESIDENTIAL_CONDOMINIUM',
      registrationNumber: condo.registrationNumber || '',
      permitNumber: condo.permitNumber || '',
      zipCode: condo.zipCode || '',
      street: condo.street || '',
      number: condo.number || '',
      complement: condo.complement || '',
      neighborhood: condo.neighborhood || '',
      city: condo.city || '',
      state: condo.state || 'GO',

      managerName: condo.managerName || '',
      managerCpf: condo.managerCpf || '',
      managerPhone: condo.managerPhone || '',
      managerEmail: condo.managerEmail || '',
      administratorName: condo.administratorName || '',
      administratorCnpj: condo.administratorCnpj || '',
      financialContactName: condo.financialContactName || '',
      financialContactPhone: condo.financialContactPhone || '',
      financialContactEmail: condo.financialContactEmail || '',

      workType: condo.workType || 'Construção Nova',
      constructionStatus: condo.constructionStatus || 'IN_PROGRESS',
      startDate: condo.startDate || '',
      expectedCompletionDate: condo.expectedCompletionDate || '',
      haltReason: condo.haltReason || '',
      constructionCompany: condo.constructionCompany || '',
      chiefEngineer: condo.chiefEngineer || '',
      creaCau: condo.creaCau || '',
      notes: condo.notes || '',

      totalBlocks: condo.totalBlocks ?? 1,
      totalTowers: condo.totalTowers ?? 1,
      totalUnitsPlanned: condo.totalUnitsPlanned ?? 10,
      parkingSpaces: condo.parkingSpaces ?? 0,
      totalArea: condo.totalArea ?? 0,
    });
    setCurrentStep(1);
    setFormError(null);
    setIsCondoModalOpen(true);
  };

  const handleCloseCondoModal = () => {
    setIsCondoModalOpen(false);
    setEditingCondo(null);
    setCondoForm(INITIAL_CONDO_FORM_STATE);
    setCurrentStep(1);
    setFormError(null);
    if (onModalClose) onModalClose();
  };

  const [statusFilter, setStatusFilter] = useState<'ALL' | StandardStatus>('ALL');

  const fetchCondominiums = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/condominiums', {
        params: {
          search: search ? search.trim() : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          size: 100,
        },
      });
      const list = res.data.content || res.data || [];
      setCondominiums(list);
    } catch (err) {
      console.error('Erro ao listar condomínios', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchCondominiums();
  }, [fetchCondominiums]);

  const handleCondoStatusChange = async (condoId: number, payload: any) => {
    try {
      await api.patch(`/condominiums/${condoId}/status`, payload);
      toast.success('Status do condomínio/obra atualizado com sucesso!', 'Status Alterado');
      fetchCondominiums();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao alterar status', 'Erro no Status');
    }
  };

  // Validation functions
  const validateStep = (step: number): boolean => {
    setFormError(null);

    if (step === 1) {
      if (!condoForm.name.trim()) {
        setFormError('O nome do condomínio ou empreendimento é obrigatório.');
        return false;
      }
      if (!condoForm.city.trim()) {
        setFormError('A cidade é obrigatória.');
        return false;
      }
      if (!condoForm.state.trim() || condoForm.state.trim().length !== 2) {
        setFormError('O estado (UF) é obrigatório e deve ter 2 letras.');
        return false;
      }
    } else if (step === 2) {
      if (!condoForm.managerName.trim()) {
        setFormError('O nome do síndico ou gestor é obrigatório.');
        return false;
      }
      if (condoForm.managerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(condoForm.managerEmail.trim())) {
        setFormError('E-mail do síndico inválido.');
        return false;
      }
      if (condoForm.financialContactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(condoForm.financialContactEmail.trim())) {
        setFormError('E-mail do responsável financeiro inválido.');
        return false;
      }
    } else if (step === 3) {
      if (!condoForm.workType.trim()) {
        setFormError('O tipo de obra é obrigatório.');
        return false;
      }
      if (
        (condoForm.constructionStatus === 'PAUSED' || condoForm.constructionStatus === 'CANCELLED') &&
        !condoForm.haltReason.trim()
      ) {
        setFormError('O motivo da paralisação ou cancelamento é obrigatório para este status.');
        return false;
      }
      if (condoForm.startDate && condoForm.expectedCompletionDate) {
        if (new Date(condoForm.expectedCompletionDate) < new Date(condoForm.startDate)) {
          setFormError('A previsão de conclusão não pode ser anterior à data de início da obra.');
          return false;
        }
      }
    }

    return true;
  };

  // Save handler (called directly or on last step)
  const submitCondoForm = async () => {
    // Validate all 3 sections
    for (let s = 1; s <= 3; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s as 1 | 2 | 3);
        return;
      }
    }

    setIsSaving(true);
    setFormError(null);

    const payload = {
      ...condoForm,
      name: condoForm.name.trim(),
      cnpj: condoForm.cnpj.trim() || null,
      city: condoForm.city.trim(),
      state: condoForm.state.trim().toUpperCase(),
      street: condoForm.street.trim() || null,
      number: condoForm.number.trim() || null,
      complement: condoForm.complement.trim() || null,
      neighborhood: condoForm.neighborhood.trim() || null,
      zipCode: condoForm.zipCode.trim() || null,

      managerName: condoForm.managerName.trim(),
      managerCpf: condoForm.managerCpf.trim() || null,
      managerPhone: condoForm.managerPhone.trim() || null,
      managerEmail: condoForm.managerEmail.trim() || null,
      administratorName: condoForm.administratorName.trim() || null,
      administratorCnpj: condoForm.administratorCnpj.trim() || null,
      financialContactName: condoForm.financialContactName.trim() || null,
      financialContactPhone: condoForm.financialContactPhone.trim() || null,
      financialContactEmail: condoForm.financialContactEmail.trim() || null,

      workType: condoForm.workType.trim(),
      constructionStatus: condoForm.constructionStatus,
      startDate: condoForm.startDate || null,
      expectedCompletionDate: condoForm.expectedCompletionDate || null,
      haltReason: condoForm.haltReason.trim() || null,
      constructionCompany: condoForm.constructionCompany.trim() || null,
      chiefEngineer: condoForm.chiefEngineer.trim() || null,
      creaCau: condoForm.creaCau.trim() || null,
      notes: condoForm.notes.trim() || null,

      totalBlocks: Number(condoForm.totalBlocks) || 0,
      totalTowers: Number(condoForm.totalTowers) || 0,
      totalUnitsPlanned: Number(condoForm.totalUnitsPlanned) || 0,
      parkingSpaces: Number(condoForm.parkingSpaces) || 0,
      totalArea: Number(condoForm.totalArea) || 0,
    };

    try {
      if (editingCondo) {
        await api.put(`/condominiums/${editingCondo.id}`, payload);
        setSuccessMessage('Empreendimento atualizado com sucesso!');
      } else {
        await api.post('/condominiums', payload);
        setSuccessMessage('Empreendimento cadastrado com sucesso no banco de dados!');
      }

      handleCloseCondoModal();
      fetchCondominiums();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Erro ao persistir dados do empreendimento.');
    } finally {
      setIsSaving(false);
    }
  };

  // "Salvar e continuar" button handler
  const handleSaveAndContinue = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3);
    } else {
      submitCondoForm();
    }
  };

  const handleOpenDelete = (id: number, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteModal({
      isOpen: true,
      id,
      title: 'Confirmar Exclusão',
      message: `Tem certeza que deseja excluir o empreendimento "${name}"? Esta ação desativará os vínculos não formalizados.`,
    });
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/condominiums/${deleteModal.id}`);
      toast.success('Empreendimento excluído com sucesso.', 'Excluído');
      if (viewingCondo?.id === deleteModal.id) {
        setViewingCondo(null);
      }
      fetchCondominiums();
      setDeleteModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao excluir registro', 'Erro na Exclusão');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* 1. Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Empreendimentos, Condomínios & Obras
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro técnico completo, corpo diretivo, acompanhamento de obras e dados cadastrais.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreateCondo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Cadastrar Novo Empreendimento
          </button>
        </div>
      </div>

      {/* Alerta de Sucesso */}
      {successMessage && (
        <div className="p-3 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-slate-700" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Barra de Busca e Filtros */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, cidade ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        </div>
        <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
          Total: <span className="font-semibold text-slate-900">{condominiums.length}</span> empreendimentos
        </div>
      </div>

      {/* 3. Tabela de Empreendimentos */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-lg border border-slate-200">
          Carregando empreendimentos...
        </div>
      ) : condominiums.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhum empreendimento cadastrado"
          description="Cadastre seu primeiro condomínio ou obra civil para gerenciar prazos e emitir contratos comerciais."
          actionLabel="+ Cadastrar Novo Empreendimento"
          onAction={handleOpenCreateCondo}
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Empreendimento / Tipo</th>
                  <th className="px-4 py-3">Localização</th>
                  <th className="px-4 py-3">Síndico / Responsável</th>
                  <th className="px-4 py-3">Status da Obra</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {condominiums.map((c) => {
                  const typeLabel = CONDOMINIUM_TYPE_LABELS[c.type] || c.typeLabel || c.type;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/70 transition"
                    >
                      {/* Empreendimento / Tipo */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{c.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {typeLabel} {c.cnpj ? `• ${c.cnpj}` : ''}
                        </div>
                      </td>

                      {/* Localização */}
                      <td className="px-4 py-3 text-slate-700">
                        <div>{c.city} - {c.state}</div>
                        <div className="text-[11px] text-slate-400">
                          {c.neighborhood || c.street || 'Endereço registrado'}
                        </div>
                      </td>

                      {/* Síndico / Responsável */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {c.managerName || 'Não informado'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {c.managerPhone || c.administratorName || '—'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusSelect
                          status={c.status || c.constructionStatus}
                          onStatusChange={(payload) => handleCondoStatusChange(c.id, payload)}
                          entityName="Condomínio/Obra"
                          entityTitle={c.name}
                        />
                        {c.workType && (
                          <div className="text-[10px] text-slate-400 mt-1">{c.workType}</div>
                        )}
                        {(c.statusReason || c.haltReason) && (
                          <div className="text-[10px] text-slate-500 mt-0.5 max-w-[160px] truncate" title={c.statusReason || c.haltReason}>
                            Motivo: {c.statusReason || c.haltReason}
                          </div>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Detalhes */}
                          <button
                            onClick={() => setViewingCondo(c)}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                            title="Ver Detalhes do Empreendimento"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Editar */}
                          <button
                            onClick={(e) => handleOpenEditCondo(c, e)}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                            title="Editar Dados do Empreendimento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={(e) => handleOpenDelete(c.id, c.name, e)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                            title="Excluir Empreendimento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CADASTRO / EDIÇÃO COMPLETA DE EMPREENDIMENTO (4 ETAPAS/SEÇÕES) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCondoModalOpen}
        onClose={handleCloseCondoModal}
        title={editingCondo ? 'Editar Dados do Empreendimento / Obra' : 'Cadastrar Novo Empreendimento / Obra'}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-5">
          {/* Navegação por Etapas / Seções (Step Wizard) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-2 border-b border-slate-200">
            {[
              { id: 1, label: '1. Dados do Condomínio', icon: Building2 },
              { id: 2, label: '2. Responsáveis', icon: UserCheck },
              { id: 3, label: '3. Dados da Obra', icon: HardHat },
            ].map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isPassed = currentStep > step.id;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(step.id as any)}
                  className={`p-2.5 rounded-lg text-left transition flex items-center gap-2 border ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-xs'
                      : isPassed
                      ? 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="text-xs truncate">{step.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mensagem de Erro Inline */}
          {formError && (
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Conteúdo do Formulário */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitCondoForm();
            }}
            className="space-y-4"
          >
            {/* ETAPA 1: DADOS DO CONDOMÍNIO / EMPREENDIMENTO */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  Identificação Geral e Endereço
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Nome * */}
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-medium mb-1">
                      Nome do Condomínio ou Empreendimento *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Condomínio Residencial Horizon Tower"
                      value={condoForm.name}
                      onChange={(e) => setCondoForm({ ...condoForm, name: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium text-slate-900"
                    />
                  </div>

                  {/* CNPJ */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">CNPJ do Condomínio</label>
                    <input
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={condoForm.cnpj}
                      onChange={(e) => setCondoForm({ ...condoForm, cnpj: maskCnpj(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none font-mono"
                    />
                  </div>

                  {/* Tipo de Empreendimento */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Tipo de Empreendimento *</label>
                    <select
                      value={condoForm.type}
                      onChange={(e) => setCondoForm({ ...condoForm, type: e.target.value as CondominiumType })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none font-medium text-slate-800"
                    >
                      <option value="RESIDENTIAL_CONDOMINIUM">Condomínio Residencial</option>
                      <option value="COMMERCIAL_CONDOMINIUM">Condomínio Comercial</option>
                      <option value="BUILDING">Edifício</option>
                      <option value="LOT">Loteamento</option>
                      <option value="PRIVATE_WORK">Obra Particular</option>
                      <option value="OTHER">Outro</option>
                    </select>
                  </div>

                  {/* Endereço / Logradouro */}
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-medium mb-1">Endereço Completo (Rua / Logradouro)</label>
                    <input
                      type="text"
                      placeholder="Ex: Alameda Santos"
                      value={condoForm.street}
                      onChange={(e) => setCondoForm({ ...condoForm, street: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none"
                    />
                  </div>

                  {/* Número */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Número</label>
                    <input
                      type="text"
                      placeholder="Ex: 500 ou S/N"
                      value={condoForm.number}
                      onChange={(e) => setCondoForm({ ...condoForm, number: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none"
                    />
                  </div>

                  {/* Complemento */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Complemento</label>
                    <input
                      type="text"
                      placeholder="Ex: Quadra 10, Lote 15"
                      value={condoForm.complement}
                      onChange={(e) => setCondoForm({ ...condoForm, complement: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none"
                    />
                  </div>

                  {/* Bairro */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Bairro</label>
                    <input
                      type="text"
                      placeholder="Ex: Cerqueira César"
                      value={condoForm.neighborhood}
                      onChange={(e) => setCondoForm({ ...condoForm, neighborhood: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none"
                    />
                  </div>

                  {/* CEP */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">CEP</label>
                    <input
                      type="text"
                      placeholder="00000-000"
                      value={condoForm.zipCode}
                      onChange={(e) => setCondoForm({ ...condoForm, zipCode: maskCep(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none font-mono"
                    />
                  </div>

                  {/* Cidade * */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Cidade *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Goiânia"
                      value={condoForm.city}
                      onChange={(e) => setCondoForm({ ...condoForm, city: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none font-medium"
                    />
                  </div>

                  {/* Estado (UF) * */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Estado (UF) *</label>
                    <select
                      value={condoForm.state}
                      onChange={(e) => setCondoForm({ ...condoForm, state: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none font-medium"
                    >
                      {BRAZILIAN_STATES.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 2: RESPONSÁVEIS */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                  Corpo Diretivo, Administradora & Contato Financeiro
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Nome do Síndico * */}
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-medium mb-1">Nome do Síndico / Gestor *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Eduardo de Oliveira"
                      value={condoForm.managerName}
                      onChange={(e) => setCondoForm({ ...condoForm, managerName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none font-medium"
                    />
                  </div>

                  {/* CPF do Síndico */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">CPF do Síndico</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={condoForm.managerCpf}
                      onChange={(e) => setCondoForm({ ...condoForm, managerCpf: maskCpf(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none font-mono"
                    />
                  </div>

                  {/* Telefone do Síndico */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Telefone / WhatsApp do Síndico</label>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={condoForm.managerPhone}
                      onChange={(e) => setCondoForm({ ...condoForm, managerPhone: maskPhone(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none"
                    />
                  </div>

                  {/* E-mail do Síndico */}
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-medium mb-1">E-mail do Síndico</label>
                    <input
                      type="email"
                      placeholder="sindico@condominio.com.br"
                      value={condoForm.managerEmail}
                      onChange={(e) => setCondoForm({ ...condoForm, managerEmail: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none"
                    />
                  </div>

                  {/* Separador Administradora */}
                  <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Empresa Administradora</span>
                  </div>

                  {/* Nome da Administradora */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Nome da Administradora</label>
                    <input
                      type="text"
                      placeholder="Ex: Gestão Predial & Soluções Ltda"
                      value={condoForm.administratorName}
                      onChange={(e) => setCondoForm({ ...condoForm, administratorName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none"
                    />
                  </div>

                  {/* CNPJ da Administradora */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">CNPJ da Administradora</label>
                    <input
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={condoForm.administratorCnpj}
                      onChange={(e) => setCondoForm({ ...condoForm, administratorCnpj: maskCnpj(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none font-mono"
                    />
                  </div>

                  {/* Separador Responsável Financeiro */}
                  <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase">Contato / Responsável Financeiro</span>
                  </div>

                  {/* Nome Financeiro */}
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-medium mb-1">Nome do Responsável Financeiro</label>
                    <input
                      type="text"
                      placeholder="Ex: Mariana Santos (Contabilidade)"
                      value={condoForm.financialContactName}
                      onChange={(e) => setCondoForm({ ...condoForm, financialContactName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none"
                    />
                  </div>

                  {/* Telefone Financeiro */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Telefone do Financeiro</label>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={condoForm.financialContactPhone}
                      onChange={(e) => setCondoForm({ ...condoForm, financialContactPhone: maskPhone(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none"
                    />
                  </div>

                  {/* E-mail Financeiro */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">E-mail do Financeiro</label>
                    <input
                      type="email"
                      placeholder="financeiro@condominio.com.br"
                      value={condoForm.financialContactEmail}
                      onChange={(e) => setCondoForm({ ...condoForm, financialContactEmail: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 3: DADOS DA OBRA */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <HardHat className="w-3.5 h-3.5 text-slate-500" />
                  Engenharia, Cronograma e Status da Obra
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Tipo de Obra * */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Tipo de Obra *</label>
                    <select
                      value={condoForm.workType}
                      onChange={(e) => setCondoForm({ ...condoForm, workType: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none font-medium"
                    >
                      {WORK_TYPES.map((wt) => (
                        <option key={wt} value={wt}>
                          {wt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status da Obra * */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Status da Obra *</label>
                    <select
                      value={condoForm.constructionStatus}
                      onChange={(e) => setCondoForm({ ...condoForm, constructionStatus: e.target.value as ConstructionStatus })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none font-semibold text-slate-900"
                    >
                      <option value="PLANNING">Planejamento</option>
                      <option value="IN_PROGRESS">Em Andamento</option>
                      <option value="PAUSED">Paralisada</option>
                      <option value="COMPLETED">Concluída</option>
                      <option value="CANCELLED">Cancelada</option>
                    </select>
                  </div>

                  {/* Data de Início */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Data de Início da Obra</label>
                    <input
                      type="date"
                      value={condoForm.startDate}
                      onChange={(e) => setCondoForm({ ...condoForm, startDate: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none"
                    />
                  </div>

                  {/* Previsão de Conclusão */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Previsão de Conclusão</label>
                    <input
                      type="date"
                      value={condoForm.expectedCompletionDate}
                      onChange={(e) => setCondoForm({ ...condoForm, expectedCompletionDate: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none"
                    />
                  </div>

                  {/* Motivo da Paralisação ou Cancelamento (Condicional Obrigatório) */}
                  {(condoForm.constructionStatus === 'PAUSED' || condoForm.constructionStatus === 'CANCELLED') && (
                    <div className="sm:col-span-2 p-3 bg-slate-50 border border-slate-300 rounded-md">
                      <label className="block text-slate-900 font-semibold mb-1">
                        Motivo da Paralisação ou Cancelamento *
                      </label>
                      <textarea
                        rows={2}
                        required
                        placeholder="Descreva obrigatoriamente as razões técnicas, financeiras ou jurídicas para a paralisação ou cancelamento da obra..."
                        value={condoForm.haltReason}
                        onChange={(e) => setCondoForm({ ...condoForm, haltReason: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none text-xs"
                      />
                    </div>
                  )}

                  {/* Construtora Responsável */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Construtora Responsável</label>
                    <input
                      type="text"
                      placeholder="Ex: Construtora JC Engenharia"
                      value={condoForm.constructionCompany}
                      onChange={(e) => setCondoForm({ ...condoForm, constructionCompany: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none"
                    />
                  </div>

                  {/* Engenheiro Responsável */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Engenheiro Responsável</label>
                    <input
                      type="text"
                      placeholder="Ex: Eng. Roberto Silveira"
                      value={condoForm.chiefEngineer}
                      onChange={(e) => setCondoForm({ ...condoForm, chiefEngineer: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none"
                    />
                  </div>

                  {/* CREA / CAU */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">CREA / CAU</label>
                    <input
                      type="text"
                      placeholder="Ex: CREA-GO 12345/D"
                      value={condoForm.creaCau}
                      onChange={(e) => setCondoForm({ ...condoForm, creaCau: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none font-mono"
                    />
                  </div>

                  {/* Alvará de Construção */}
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Nº do Alvará de Construção</label>
                    <input
                      type="text"
                      placeholder="Ex: ALV-2026/889"
                      value={condoForm.permitNumber}
                      onChange={(e) => setCondoForm({ ...condoForm, permitNumber: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none font-mono"
                    />
                  </div>

                  {/* Observações Gerais */}
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-medium mb-1">Observações Técnicas / Gerais</label>
                    <textarea
                      rows={2}
                      placeholder="Notas sobre memoriais descritivos, licenças ambientais, vistorias..."
                      value={condoForm.notes}
                      onChange={(e) => setCondoForm({ ...condoForm, notes: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* BARRA INFERIOR DE AÇÕES / BOTÕES */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCloseCondoModal}
                disabled={isSaving}
                className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition disabled:opacity-50"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Salvar condomínio direto (em qualquer etapa) */}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar condomínio'}
                </button>

                {/* Salvar e continuar */}
                <button
                  type="button"
                  onClick={handleSaveAndContinue}
                  disabled={isSaving}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs disabled:opacity-50"
                >
                  <span>{currentStep === 3 ? (isSaving ? 'Finalizando...' : 'Concluir Cadastro') : 'Salvar e continuar'}</span>
                  {currentStep < 3 && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: TELA DE DETALHES COMPLETOS DO CONDOMÍNIO (VISUALIZAÇÃO TÉCNICA) */}
      {/* ========================================================================= */}
      {viewingCondo && (
        <Modal
          isOpen={true}
          onClose={() => setViewingCondo(null)}
          title="Ficha do condomínio/obra"
          subtitle={viewingCondo.name}
          detail
          maxWidth="max-w-4xl"
        >
          <div className="space-y-5 text-xs">
            {/* Cabeçalho do Detalhe com Badges */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{viewingCondo.name}</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 text-white">
                    {CONSTRUCTION_STATUS_LABELS[viewingCondo.constructionStatus] || viewingCondo.constructionStatus}
                  </span>
                </div>
                <div className="text-slate-500 mt-1 flex items-center gap-2">
                  <span>{CONDOMINIUM_TYPE_LABELS[viewingCondo.type] || viewingCondo.type}</span>
                  {viewingCondo.cnpj && <span className="font-mono">• CNPJ: {viewingCondo.cnpj}</span>}
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <StatusBadge status={viewingCondo.status || viewingCondo.constructionStatus} />
                <span className="text-[11px] text-slate-500 font-medium">{viewingCondo.city} / {viewingCondo.state}</span>
              </div>
            </div>

            {/* 3 Blocos Informativos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Bloco 1: Localização & Registros */}
              <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  1. Localização e Licenças
                </span>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Logradouro:</span>
                    <span className="font-medium text-slate-900">{viewingCondo.street || '—'} {viewingCondo.number ? `, ${viewingCondo.number}` : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Complemento:</span>
                    <span className="text-slate-800">{viewingCondo.complement || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bairro:</span>
                    <span className="text-slate-800">{viewingCondo.neighborhood || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CEP:</span>
                    <span className="font-mono text-slate-800">{viewingCondo.zipCode || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Alvará de Construção:</span>
                    <span className="font-mono text-slate-800">{viewingCondo.permitNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Matrícula / Registro:</span>
                    <span className="font-mono text-slate-800">{viewingCondo.registrationNumber || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Bloco 2: Responsáveis & Administradora */}
              <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                  2. Corpo Diretivo & Contatos
                </span>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Síndico / Gestor:</span>
                    <span className="font-semibold text-slate-900">{viewingCondo.managerName || '—'}</span>
                  </div>
                  {viewingCondo.managerCpf && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">CPF do Síndico:</span>
                      <span className="font-mono text-slate-800">{viewingCondo.managerCpf}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Telefone do Síndico:</span>
                    <span className="text-slate-800">{viewingCondo.managerPhone || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">E-mail do Síndico:</span>
                    <span className="text-slate-800">{viewingCondo.managerEmail || '—'}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Administradora:</span>
                    <span className="font-medium text-slate-800">{viewingCondo.administratorName || '—'}</span>
                  </div>
                  {viewingCondo.administratorCnpj && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">CNPJ Administradora:</span>
                      <span className="font-mono text-slate-800">{viewingCondo.administratorCnpj}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Contato Financeiro:</span>
                    <span className="font-medium text-slate-800">{viewingCondo.financialContactName || '—'}</span>
                  </div>
                  {viewingCondo.financialContactPhone && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tel. Financeiro:</span>
                      <span className="text-slate-800">{viewingCondo.financialContactPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bloco 3: Dados Técnicos da Obra */}
              <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <HardHat className="w-3.5 h-3.5 text-slate-500" />
                  3. Dados Técnicos da Obra
                </span>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tipo de Obra:</span>
                    <span className="font-medium text-slate-900">{viewingCondo.workType || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Início da Obra:</span>
                    <span className="font-mono text-slate-800">{viewingCondo.startDate ? new Date(viewingCondo.startDate).toLocaleDateString('pt-BR') : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Previsão Conclusão:</span>
                    <span className="font-mono text-slate-800">{viewingCondo.expectedCompletionDate ? new Date(viewingCondo.expectedCompletionDate).toLocaleDateString('pt-BR') : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Construtora:</span>
                    <span className="text-slate-800">{viewingCondo.constructionCompany || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Engenheiro Responsável:</span>
                    <span className="text-slate-800">{viewingCondo.chiefEngineer || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Registro CREA/CAU:</span>
                    <span className="font-mono text-slate-800">{viewingCondo.creaCau || '—'}</span>
                  </div>
                  {(viewingCondo.statusReason || viewingCondo.haltReason) && (
                    <div className="mt-2 p-2 bg-slate-50 border border-slate-300 rounded text-slate-800 space-y-1 text-xs">
                      <div>
                        <span className="font-semibold text-slate-700">Motivo da Alteração:</span>{' '}
                        <span>{viewingCondo.statusReason || viewingCondo.haltReason}</span>
                      </div>
                      {viewingCondo.statusNotes && (
                        <div>
                          <span className="font-semibold text-slate-700">Observação:</span>{' '}
                          <span>{viewingCondo.statusNotes}</span>
                        </div>
                      )}
                      {viewingCondo.statusDate && (
                        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                          Data da alteração: {new Date(viewingCondo.statusDate).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ações do Modal de Detalhes */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setViewingCondo(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition"
              >
                Fechar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const c = viewingCondo;
                    setViewingCondo(null);
                    handleOpenEditCondo(c);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar Dados
                </button>
                {onNavigateToContracts && (
                  <button
                    type="button"
                    onClick={() => {
                      setViewingCondo(null);
                      onNavigateToContracts();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    Emitir Contrato
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title={deleteModal.title}
        message={deleteModal.message}
        confirmLabel="Excluir Condomínio"
        isLoading={isDeleting}
      />
    </div>
  );
};
