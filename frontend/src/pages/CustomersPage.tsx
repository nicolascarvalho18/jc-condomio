import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { Customer, CustomerType, Contract, StandardStatus, StatusChangePayload } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { StatusSelect } from '../components/common/StatusSelect';
import { StatusFilter } from '../components/common/StatusFilter';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Eye,
  Pencil,
  Trash2,
  FileText,
  UserCheck,
  CircleDollarSign,
  TrendingUp,
  CreditCard,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { Badge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import { useToast } from '../context/ToastContext';
import { maskCpf, maskCnpj, maskCep, maskPhone } from '../utils/masks';

interface CustomersPageProps {
  initialOpenModal?: boolean;
  onModalClose?: () => void;
  onNavigateToContracts?: () => void;
}

const INITIAL_FORM_STATE = {
  customerType: 'INDIVIDUAL' as CustomerType,
  name: '',
  document: '',
  stateOrIdDocument: '',
  maritalStatus: 'Casado(a)',
  profession: '',
  spouseName: '',
  spouseDocument: '',
  email: '',
  phone: '',
  secondaryPhone: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: 'SP',
  lgpdConsent: true,
};

export const CustomersPage: React.FC<CustomersPageProps> = ({
  initialOpenModal = false,
  onModalClose,
  onNavigateToContracts: _onNavigateToContracts,
}) => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INDIVIDUAL' | 'LEGAL_ENTITY'>('ALL');
  const [statusFilter, setStatusFilter] = useState<StandardStatus | 'ALL'>('ALL');

  // Paginação
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(initialOpenModal);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [customerContracts, setCustomerContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);

  // Delete confirmation
  const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState(INITIAL_FORM_STATE);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM_STATE);
  }, []);

  useEffect(() => {
    if (initialOpenModal) {
      setEditingCustomer(null);
      resetForm();
      setIsFormModalOpen(true);
    }
  }, [initialOpenModal, resetForm]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers', {
        params: {
          search: search || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          page,
          size,
        }
      });
      setCustomers(res.data.content || []);
      setTotalPages(res.data.totalPages || 0);
      setTotalElements(res.data.totalElements || 0);
    } catch (err) {
      console.error('Erro ao listar clientes', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, size]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleStatusChange = async (customerId: number, payload: StatusChangePayload) => {
    try {
      await api.patch(`/customers/${customerId}/status`, payload);
      toast.success('Status do cliente atualizado com sucesso.', 'Status Alterado');
      fetchCustomers();
      if (viewingCustomer && viewingCustomer.id === customerId) {
        setViewingCustomer({
          ...viewingCustomer,
          status: payload.status,
          statusReason: payload.reason,
          statusNotes: payload.notes,
          statusDate: payload.statusDate
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao alterar status do cliente.', 'Erro no Status');
    }
  };

  const handleOpenNewModal = () => {
    setEditingCustomer(null);
    resetForm();
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setForm({
      customerType: c.customerType,
      name: c.name || '',
      document: c.document || '',
      stateOrIdDocument: c.stateOrIdDocument || '',
      maritalStatus: c.maritalStatus || 'Casado(a)',
      profession: c.profession || '',
      spouseName: c.spouseName || '',
      spouseDocument: c.spouseDocument || '',
      email: c.email || '',
      phone: c.phone || '',
      secondaryPhone: c.secondaryPhone || '',
      zipCode: c.zipCode || '',
      street: c.street || '',
      number: c.number || '',
      complement: c.complement || '',
      neighborhood: c.neighborhood || '',
      city: c.city || '',
      state: c.state || 'SP',
      lgpdConsent: c.lgpdConsent ?? true,
    });
    if (viewingCustomer) {
      setViewingCustomer(null);
    }
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingCustomer(null);
    resetForm();
    if (onModalClose) onModalClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, form);
        toast.success('Cadastro do cliente atualizado com sucesso.', 'Cliente Atualizado');
      } else {
        await api.post('/customers', form);
        toast.success('Novo cliente cadastrado com sucesso.', 'Cliente Cadastrado');
      }
      handleCloseFormModal();
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar cliente. Verifique os dados informados.', 'Erro ao Salvar');
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomerId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/customers/${deletingCustomerId}`);
      toast.success('Cliente removido com sucesso.', 'Excluído');
      setDeletingCustomerId(null);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Não foi possível excluir o cliente. Verifique se existem contratos vinculados.', 'Falha na Exclusão');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenDetails = async (c: Customer) => {
    setViewingCustomer(c);
    setLoadingContracts(true);
    try {
      const res = await api.get('/contracts', { params: { size: 100 } });
      const allContracts: Contract[] = res.data.content || [];
      setCustomerContracts(allContracts.filter(ct => ct.customerId === c.id));
    } catch (err) {
      console.error('Erro ao buscar contratos do cliente', err);
      setCustomerContracts([]);
    } finally {
      setLoadingContracts(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    if (typeFilter === 'INDIVIDUAL') return c.customerType === 'INDIVIDUAL';
    if (typeFilter === 'LEGAL_ENTITY') return c.customerType === 'LEGAL_ENTITY';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Clientes e Compradores</h2>
          <p className="text-xs text-slate-500">Gestão de cadastros de clientes compradores (Pessoa Física e Jurídica).</p>
        </div>
        <button
          onClick={handleOpenNewModal}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF/CNPJ, e-mail ou telefone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => {
                setTypeFilter('ALL');
                setPage(0);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                typeFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({customers.length})
            </button>
            <button
              onClick={() => {
                setTypeFilter('INDIVIDUAL');
                setPage(0);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                typeFilter === 'INDIVIDUAL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pessoa Física ({customers.filter(c => c.customerType === 'INDIVIDUAL').length})
            </button>
            <button
              onClick={() => {
                setTypeFilter('LEGAL_ENTITY');
                setPage(0);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                typeFilter === 'LEGAL_ENTITY'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pessoa Jurídica ({customers.filter(c => c.customerType === 'LEGAL_ENTITY').length})
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500">Filtrar por Status:</span>
          <StatusFilter
            value={statusFilter}
            onChange={(s) => {
              setStatusFilter(s);
              setPage(0);
            }}
          />
        </div>
      </div>

      {/* List / Empty State */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Carregando base de clientes...</div>
      ) : filteredCustomers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente cadastrado"
          description={
            search || typeFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Nenhum cliente encontrado com os filtros aplicados.'
              : 'Você ainda não possui compradores cadastrados na base de dados. Cadastre o primeiro cliente para iniciar a emissão de contratos e parcelas.'
          }
          actionLabel={search || typeFilter !== 'ALL' || statusFilter !== 'ALL' ? undefined : 'Cadastrar Primeiro Cliente'}
          onAction={search || typeFilter !== 'ALL' || statusFilter !== 'ALL' ? undefined : handleOpenNewModal}
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Cliente / Razão Social</th>
                  <th className="px-4 py-3">Documento (CPF / CNPJ)</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Localização</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">LGPD</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Badge variant="neutral">
                          {c.customerType === 'INDIVIDUAL' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                        </Badge>
                        {c.profession && <span>• {c.profession}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {c.document}
                      {c.stateOrIdDocument && (
                        <div className="text-[10px] text-slate-400 font-sans">
                          {c.customerType === 'INDIVIDUAL' ? 'RG: ' : 'IE: '}
                          {c.stateOrIdDocument}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{c.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{c.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{c.city ? `${c.city}/${c.state}` : 'Não informado'}</span>
                      </div>
                      {c.neighborhood && (
                        <div className="text-[10px] text-slate-400 pl-5">{c.neighborhood}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <StatusSelect
                          currentStatus={c.status}
                          entityName={`cliente "${c.name}"`}
                          onStatusChange={(payload) => handleStatusChange(c.id, payload)}
                        />
                        {c.statusReason && c.status !== 'ACTIVE' && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5" title={c.statusReason}>
                            {c.statusReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.lgpdConsent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <ShieldCheck className="w-3 h-3 text-slate-600" /> Autorizado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-400 border border-slate-200">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenDetails(c)}
                          title="Visualizar detalhes do cliente"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          title="Editar cadastro"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingCustomerId(c.id)}
                          title="Excluir cliente"
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* Screen 7: Detalhes do Cliente Modal */}
      {viewingCustomer && (
        <Modal
          isOpen={true}
          onClose={() => setViewingCustomer(null)}
          title="Ficha do cliente"
          subtitle={viewingCustomer.name}
          detail
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5">
            {/* Header info card */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">{viewingCustomer.name}</h3>
                  <Badge variant="neutral">
                    {viewingCustomer.customerType === 'INDIVIDUAL' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </Badge>
                  <StatusBadge status={viewingCustomer.status} />
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Documento: {viewingCustomer.document}
                  {viewingCustomer.stateOrIdDocument && ` • RG/IE: ${viewingCustomer.stateOrIdDocument}`}
                </p>
                {viewingCustomer.status !== 'ACTIVE' && viewingCustomer.statusReason && (
                  <p className="text-[11px] text-slate-600 mt-1 bg-white px-2 py-1 rounded border border-slate-200 inline-block">
                    <span className="font-semibold text-slate-700">Motivo ({viewingCustomer.status}):</span> {viewingCustomer.statusReason}
                    {viewingCustomer.statusDate && <span className="text-slate-400"> • Data: {viewingCustomer.statusDate}</span>}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleOpenEditModal(viewingCustomer)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition shadow-xs"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar Dados
              </button>
            </div>

            {/* Visão Financeira 360° do Cliente */}
            <div className="bg-slate-900 text-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <CircleDollarSign className="w-4 h-4 text-blue-400" />
                  Visão Financeira 360°
                </span>
                <span className="text-[11px] text-slate-400">
                  {customerContracts.length} contrato(s) vinculado(s)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/50">
                  <div className="text-[11px] text-slate-400 mb-1">Total em Contratos</div>
                  <div className="text-sm font-semibold font-mono text-white">
                    {customerContracts
                      .reduce((acc, c) => acc + (c.totalAmount || 0), 0)
                      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/50">
                  <div className="text-[11px] text-emerald-400 mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Total Já Quitado
                  </div>
                  <div className="text-sm font-semibold font-mono text-emerald-300">
                    {customerContracts
                      .reduce((acc, c) => acc + (c.totalPaidAmount != null ? Number(c.totalPaidAmount) : Math.max(0, (c.totalAmount || 0) - (c.totalOutstandingBalance || 0))), 0)
                      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/50">
                  <div className="text-[11px] text-blue-400 mb-1 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Saldo Devedor Atual
                  </div>
                  <div className="text-sm font-semibold font-mono text-blue-300">
                    {customerContracts
                      .reduce((acc, c) => acc + (c.totalOutstandingBalance || 0), 0)
                      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              </div>
            </div>

            {/* Grid of details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Personal / Legal Info */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                  Dados Cadastrais
                </h4>
                <div className="text-xs space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estado Civil:</span>
                    <span className="font-medium text-slate-800">{viewingCustomer.maritalStatus || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Profissão:</span>
                    <span className="font-medium text-slate-800">{viewingCustomer.profession || '—'}</span>
                  </div>
                  {viewingCustomer.spouseName && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nome do Cônjuge:</span>
                        <span className="font-medium text-slate-800">{viewingCustomer.spouseName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">CPF do Cônjuge:</span>
                        <span className="font-mono text-slate-800">{viewingCustomer.spouseDocument || '—'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Contact & Address */}
              <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  Contato & Localização
                </h4>
                <div className="text-xs space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">E-mail:</span>
                    <span className="font-medium text-slate-800">{viewingCustomer.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Telefone Principal:</span>
                    <span className="font-medium text-slate-800">{viewingCustomer.phone}</span>
                  </div>
                  {viewingCustomer.secondaryPhone && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Telefone Secundário:</span>
                      <span className="font-medium text-slate-800">{viewingCustomer.secondaryPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-400">Endereço:</span>
                    <span className="font-medium text-slate-800 text-right">
                      {viewingCustomer.street
                        ? `${viewingCustomer.street}, ${viewingCustomer.number || 'S/N'}${viewingCustomer.complement ? ` - ${viewingCustomer.complement}` : ''}`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bairro / Cidade:</span>
                    <span className="font-medium text-slate-800 text-right">
                      {viewingCustomer.city ? `${viewingCustomer.neighborhood || ''} - ${viewingCustomer.city}/${viewingCustomer.state}` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">CEP:</span>
                    <span className="font-mono text-slate-800">{viewingCustomer.zipCode || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Linked Contracts */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3">
              <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Contratos de Compra e Venda Vinculados ({customerContracts.length})
              </h4>

              {loadingContracts ? (
                <div className="py-4 text-center text-xs text-slate-400">Carregando contratos vinculados...</div>
              ) : customerContracts.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Nenhum contrato de venda ativo para este cliente.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {customerContracts.map((ct) => (
                    <div key={ct.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-medium text-slate-900 flex items-center gap-2">
                          <span>Contrato {ct.contractNumber}</span>
                          <Badge variant="neutral">{ct.status}</Badge>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {ct.condominiumName} • {ct.buildingBlockName} • Unidade {ct.unitNumber}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-medium text-slate-900">
                          {ct.totalAmount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {ct.paidInstallmentsCount || 0} de {ct.totalInstallmentsCount || 0} parcelas quitadas
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Screen 6/Modal: Cadastro & Edição de Cliente */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        title={editingCustomer ? 'Editar Dados do Cliente' : 'Cadastrar Novo Cliente'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Radio Selector PF / PJ */}
          <div className="flex gap-4 p-2.5 bg-slate-50 rounded-md border border-slate-200 text-xs font-semibold text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="customerType"
                checked={form.customerType === 'INDIVIDUAL'}
                onChange={() => setForm({ ...form, customerType: 'INDIVIDUAL' })}
                className="text-slate-900"
              />
              Pessoa Física (CPF)
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="customerType"
                checked={form.customerType === 'LEGAL_ENTITY'}
                onChange={() => setForm({ ...form, customerType: 'LEGAL_ENTITY' })}
                className="text-slate-900"
              />
              Pessoa Jurídica (CNPJ)
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {form.customerType === 'INDIVIDUAL' ? 'Nome Completo *' : 'Razão Social *'}
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {form.customerType === 'INDIVIDUAL' ? 'CPF *' : 'CNPJ *'}
              </label>
              <input
                type="text"
                required
                placeholder={form.customerType === 'INDIVIDUAL' ? '000.000.000-00' : '00.000.000/0001-00'}
                value={form.document}
                onChange={(e) =>
                  setForm({
                    ...form,
                    document:
                      form.customerType === 'INDIVIDUAL'
                        ? maskCpf(e.target.value)
                        : maskCnpj(e.target.value),
                  })
                }
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">E-mail Corporativo / Principal *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Telefone / WhatsApp *</label>
              <input
                type="text"
                required
                placeholder="(00) 00000-0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {form.customerType === 'INDIVIDUAL' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">RG / Identidade (Opcional)</label>
                  <input
                    type="text"
                    value={form.stateOrIdDocument}
                    onChange={(e) => setForm({ ...form, stateOrIdDocument: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Estado Civil</label>
                  <select
                    value={form.maritalStatus}
                    onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                  >
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="União Estável">União Estável</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Profissão (Opcional)</label>
                  <input
                    type="text"
                    value={form.profession}
                    onChange={(e) => setForm({ ...form, profession: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {form.maritalStatus === 'Casado(a)' || form.maritalStatus === 'União Estável' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nome do Cônjuge (Opcional)</label>
                    <input
                      type="text"
                      value={form.spouseName}
                      onChange={(e) => setForm({ ...form, spouseName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">CPF do Cônjuge (Opcional)</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={form.spouseDocument}
                      onChange={(e) => setForm({ ...form, spouseDocument: maskCpf(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Inscrição Estadual (IE) (Opcional)</label>
                <input
                  type="text"
                  value={form.stateOrIdDocument}
                  onChange={(e) => setForm({ ...form, stateOrIdDocument: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Telefone Secundário / Ramal (Opcional)</label>
                <input
                  type="text"
                  value={form.secondaryPhone}
                  onChange={(e) => setForm({ ...form, secondaryPhone: maskPhone(e.target.value) })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Endereço */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">CEP (Opcional)</label>
              <input
                type="text"
                placeholder="00000-000"
                value={form.zipCode}
                onChange={(e) => setForm({ ...form, zipCode: maskCep(e.target.value) })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Logradouro (Rua / Av.) (Opcional)</label>
              <input
                type="text"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Número (Opcional)</label>
              <input
                type="text"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Complemento (Opcional)</label>
              <input
                type="text"
                value={form.complement}
                onChange={(e) => setForm({ ...form, complement: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Bairro (Opcional)</label>
              <input
                type="text"
                value={form.neighborhood}
                onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Cidade (Opcional)</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Estado (UF) (Opcional)</label>
            <input
              type="text"
              maxLength={2}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              className="w-20 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none uppercase font-mono"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCloseFormModal}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deletingCustomerId !== null}
        onClose={() => setDeletingCustomerId(null)}
        onConfirm={handleDelete}
        title="Excluir Cliente"
        message="Tem certeza que deseja excluir o cadastro deste cliente? A operação só será concluída caso não existam contratos ativos ou pendentes vinculados ao titular."
        confirmLabel="Confirmar Exclusão"
        cancelLabel="Cancelar"
        isLoading={isDeleting}
      />
    </div>
  );
};
