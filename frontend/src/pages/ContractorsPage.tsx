import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Customer, Condominium, CustomerType, CondominiumType, ConstructionStatus, StandardStatus, StatusChangePayload } from '../types';
import { StatusSelect } from '../components/common/StatusSelect';
import { StatusFilter } from '../components/common/StatusFilter';
import {
  Users,
  Building2,
  Search,
  FileSignature,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';

interface ContractorsPageProps {
  onNavigateToContract?: (contractorType: 'CUSTOMER' | 'CONDOMINIUM', id: number) => void;
  onNavigateToCondoDetails?: (condoId: number) => void;
}

export const ContractorsPage: React.FC<ContractorsPageProps> = ({
  onNavigateToContract,
  onNavigateToCondoDetails,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'ALL' | 'CUSTOMERS' | 'CONDOMINIUMS'>('ALL');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StandardStatus | 'ALL'>('ALL');

  // Modais de Criação
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isCondoModalOpen, setIsCondoModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Formulário de Cliente
  const [customerForm, setCustomerForm] = useState({
    name: '',
    customerType: 'INDIVIDUAL' as CustomerType,
    document: '',
    stateOrIdDocument: '',
    phone: '',
    email: '',
    profession: '',
    city: '',
    state: 'GO',
    street: '',
    number: '',
    neighborhood: '',
    zipCode: '',
    lgpdConsent: true,
  });

  // Formulário de Condomínio
  const [condoForm, setCondoForm] = useState({
    name: '',
    cnpj: '',
    type: 'VERTICAL' as CondominiumType,
    constructionStatus: 'IN_PROGRESS' as ConstructionStatus,
    managerName: '',
    managerPhone: '',
    managerEmail: '',
    city: '',
    state: 'GO',
    street: '',
    number: '',
    neighborhood: '',
    zipCode: '',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
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
      console.error('Erro ao listar contratantes', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!customerForm.name.trim() || !customerForm.document.trim() || !customerForm.phone.trim() || !customerForm.email.trim()) {
      setFormError('Preencha os campos obrigatórios (Nome, CPF/CNPJ, Telefone e E-mail).');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/customers', customerForm);
      setIsCustomerModalOpen(false);
      setCustomerForm({
        name: '',
        customerType: 'INDIVIDUAL',
        document: '',
        stateOrIdDocument: '',
        phone: '',
        email: '',
        profession: '',
        city: '',
        state: 'GO',
        street: '',
        number: '',
        neighborhood: '',
        zipCode: '',
        lgpdConsent: true,
      });
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Erro ao cadastrar cliente. Verifique o CPF/CNPJ e dados informados.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCondominium = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!condoForm.name.trim()) {
      setFormError('Nome do condomínio / obra é obrigatório.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/condominiums', condoForm);
      setIsCondoModalOpen(false);
      setCondoForm({
        name: '',
        cnpj: '',
        type: 'VERTICAL',
        constructionStatus: 'IN_PROGRESS',
        managerName: '',
        managerPhone: '',
        managerEmail: '',
        city: '',
        state: 'GO',
        street: '',
        number: '',
        neighborhood: '',
        zipCode: '',
        notes: '',
      });
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Erro ao cadastrar condomínio. Verifique os dados informados.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomerStatusChange = async (customerId: number, payload: StatusChangePayload) => {
    try {
      await api.patch(`/customers/${customerId}/status`, payload);
      toast.success('Status do cliente alterado com sucesso.', 'Status Atualizado');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao alterar status do cliente.', 'Erro no Status');
    }
  };

  const handleCondoStatusChange = async (condoId: number, payload: StatusChangePayload) => {
    try {
      await api.patch(`/condominiums/${condoId}/status`, payload);
      toast.success('Status do condomínio alterado com sucesso.', 'Status Atualizado');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao alterar status do condomínio.', 'Erro no Status');
    }
  };

  // Filtragem
  const filteredCustomers = customers.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.document?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const filteredCondominiums = condominiums.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.cnpj?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.managerName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Contratantes</h2>
          <p className="text-xs text-slate-500">
            Gestão cadastral centralizada de Clientes e Condomínios para emissão de contratos e obras.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFormError(null);
              setIsCustomerModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition shadow-xs"
          >
            <Users className="w-3.5 h-3.5 text-slate-600" />
            + Novo Cliente
          </button>
          <button
            onClick={() => {
              setFormError(null);
              setIsCondoModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs"
          >
            <Building2 className="w-3.5 h-3.5" />
            + Novo Condomínio
          </button>
        </div>
      </div>

      {/* Cartões de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Total de Clientes</div>
          <div className="mt-1 text-2xl font-semibold font-mono text-slate-900">{customers.length}</div>
          <div className="mt-1 text-[11px] text-slate-400">Pessoas Físicas e Jurídicas</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Total de Condomínios / Obras</div>
          <div className="mt-1 text-2xl font-semibold font-mono text-slate-900">{condominiums.length}</div>
          <div className="mt-1 text-[11px] text-slate-400">Empreendimentos cadastrados</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Contratantes na Base</div>
          <div className="mt-1 text-2xl font-semibold font-mono text-slate-900">
            {customers.length + condominiums.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Disponíveis para emissão de contratos</div>
        </div>
      </div>

      {/* Abas e Busca */}
      <div className="flex flex-col gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 border-b sm:border-b-0 pb-2 sm:pb-0">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos ({customers.length + condominiums.length})
            </button>
            <button
              onClick={() => setActiveTab('CUSTOMERS')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'CUSTOMERS'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Clientes ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab('CONDOMINIUMS')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'CONDOMINIUMS'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Condomínios ({condominiums.length})
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, documento, cidade ou responsável..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-slate-400 focus:outline-none transition"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500">Filtrar por Status:</span>
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        </div>
      </div>

      {/* Conteúdo: Listas */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-lg border border-slate-200">
          Carregando contratantes...
        </div>
      ) : (
        <div className="space-y-6">
          {/* SEÇÃO 1: CLIENTES */}
          {(activeTab === 'ALL' || activeTab === 'CUSTOMERS') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  Clientes ({filteredCustomers.length})
                </h3>
              </div>

              {filteredCustomers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Nenhum cliente cadastrado"
                  description="Cadastre clientes compradores ou tomadores de serviços de engenharia e obras."
                  actionLabel="+ Cadastrar Cliente"
                  onAction={() => {
                    setFormError(null);
                    setIsCustomerModalOpen(true);
                  }}
                />
              ) : (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                        <tr>
                          <th className="px-4 py-3">Cliente / Razão Social</th>
                          <th className="px-4 py-3">CPF / CNPJ</th>
                          <th className="px-4 py-3">Contato</th>
                          <th className="px-4 py-3">Localidade</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCustomers.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/60 transition">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">{c.name}</div>
                              <div className="text-[11px] text-slate-400">{c.profession || '—'}</div>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-700">{c.document || '—'}</td>
                            <td className="px-4 py-3">
                              <div className="text-slate-700">{c.phone || '—'}</div>
                              <div className="text-[11px] text-slate-400">{c.email || '—'}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {c.city ? `${c.city}/${c.state || 'GO'}` : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="neutral">
                                {c.customerType === 'INDIVIDUAL' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex flex-col items-center">
                                <StatusSelect
                                  currentStatus={c.status}
                                  entityName={`cliente "${c.name}"`}
                                  onStatusChange={(payload) => handleCustomerStatusChange(c.id, payload)}
                                />
                                {c.statusReason && c.status !== 'ACTIVE' && (
                                  <span className="text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5" title={c.statusReason}>
                                    {c.statusReason}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {onNavigateToContract && (
                                <button
                                  onClick={() => onNavigateToContract('CUSTOMER', c.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition"
                                  title="Emitir novo contrato para este cliente"
                                >
                                  <FileSignature className="w-3 h-3" />
                                  Emitir Contrato
                                </button>
                              )}
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

          {/* SEÇÃO 2: CONDOMÍNIOS */}
          {(activeTab === 'ALL' || activeTab === 'CONDOMINIUMS') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  Condomínios e Obras ({filteredCondominiums.length})
                </h3>
              </div>

              {filteredCondominiums.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="Nenhum condomínio cadastrado"
                  description="Cadastre condomínios residenciais ou comerciais para gestão de obras, contratos e serviços prediais."
                  actionLabel="+ Cadastrar Condomínio"
                  onAction={() => {
                    setFormError(null);
                    setIsCondoModalOpen(true);
                  }}
                />
              ) : (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                        <tr>
                          <th className="px-4 py-3">Condomínio / Empreendimento</th>
                          <th className="px-4 py-3">CNPJ</th>
                          <th className="px-4 py-3">Responsável / Síndico</th>
                          <th className="px-4 py-3">Endereço / Localidade</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCondominiums.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/60 transition">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">{c.name}</div>
                              <div className="text-[11px] text-slate-400">
                                {c.totalUnits || 0} unidades • {c.totalBlocks || 0} blocos
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-700">{c.cnpj || '—'}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-800">{c.managerName || '—'}</div>
                              <div className="text-[11px] text-slate-400">
                                {c.managerPhone ? `${c.managerPhone} ` : ''}
                                {c.managerEmail ? `• ${c.managerEmail}` : ''}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              <div>{c.street ? `${c.street}, ${c.number || 'S/N'}` : '—'}</div>
                              <div className="text-[11px] text-slate-400">
                                {c.city ? `${c.city}/${c.state || 'GO'}` : ''}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex flex-col items-center">
                                <StatusSelect
                                  currentStatus={c.status}
                                  entityName={`condomínio "${c.name}"`}
                                  onStatusChange={(payload) => handleCondoStatusChange(c.id, payload)}
                                />
                                {c.statusReason && c.status !== 'ACTIVE' && (
                                  <span className="text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5" title={c.statusReason}>
                                    {c.statusReason}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right space-x-1.5">
                              {onNavigateToCondoDetails && (
                                <button
                                  onClick={() => onNavigateToCondoDetails(c.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition"
                                  title="Ver blocos e unidades"
                                >
                                  <Eye className="w-3 h-3" />
                                  Unidades
                                </button>
                              )}
                              {onNavigateToContract && (
                                <button
                                  onClick={() => onNavigateToContract('CONDOMINIUM', c.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition"
                                  title="Emitir novo contrato para este condomínio"
                                >
                                  <FileSignature className="w-3 h-3" />
                                  Emitir Contrato
                                </button>
                              )}
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
        </div>
      )}

      {/* MODAL: NOVO CLIENTE */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Cadastrar Novo Cliente"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de Cliente *</label>
              <select
                value={customerForm.customerType}
                onChange={(e) => setCustomerForm({ ...customerForm, customerType: e.target.value as CustomerType })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              >
                <option value="INDIVIDUAL">Pessoa Física</option>
                <option value="LEGAL_ENTITY">Pessoa Jurídica</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {customerForm.customerType === 'INDIVIDUAL' ? 'Nome Completo *' : 'Razão Social *'}
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Carlos Eduardo da Silva"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {customerForm.customerType === 'INDIVIDUAL' ? 'CPF *' : 'CNPJ *'}
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 000.000.000-00"
                value={customerForm.document}
                onChange={(e) => setCustomerForm({ ...customerForm, document: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {customerForm.customerType === 'INDIVIDUAL' ? 'RG / Identidade' : 'Inscrição Estadual'}
              </label>
              <input
                type="text"
                placeholder="Ex: 1234567 SSP-GO"
                value={customerForm.stateOrIdDocument}
                onChange={(e) => setCustomerForm({ ...customerForm, stateOrIdDocument: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Telefone Principal *</label>
              <input
                type="text"
                required
                placeholder="Ex: (62) 98888-7777"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">E-mail Principal *</label>
              <input
                type="email"
                required
                placeholder="Ex: cliente@email.com"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Profissão / Ramo</label>
              <input
                type="text"
                placeholder="Ex: Engenheiro Civil"
                value={customerForm.profession}
                onChange={(e) => setCustomerForm({ ...customerForm, profession: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Cidade</label>
              <input
                type="text"
                placeholder="Ex: Goiânia"
                value={customerForm.city}
                onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">UF</label>
              <input
                type="text"
                maxLength={2}
                placeholder="GO"
                value={customerForm.state}
                onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value.toUpperCase() })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={customerForm.lgpdConsent}
                onChange={(e) => setCustomerForm({ ...customerForm, lgpdConsent: e.target.checked })}
                className="rounded text-slate-900 focus:ring-slate-500"
              />
              <span>Consentimento LGPD para armazenamento de dados cadastrais</span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSaving ? 'Salvando...' : 'Salvar Cliente'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL: NOVO CONDOMÍNIO */}
      <Modal
        isOpen={isCondoModalOpen}
        onClose={() => setIsCondoModalOpen(false)}
        title="Cadastrar Novo Condomínio / Obra"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateCondominium} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nome do Condomínio / Empreendimento *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Residencial Jardins do Lago"
                value={condoForm.name}
                onChange={(e) => setCondoForm({ ...condoForm, name: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">CNPJ</label>
              <input
                type="text"
                placeholder="Ex: 00.000.000/0001-00"
                value={condoForm.cnpj}
                onChange={(e) => setCondoForm({ ...condoForm, cnpj: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tipologia</label>
              <select
                value={condoForm.type}
                onChange={(e) => setCondoForm({ ...condoForm, type: e.target.value as CondominiumType })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              >
                <option value="VERTICAL">Vertical (Edifícios/Torres)</option>
                <option value="HORIZONTAL">Horizontal (Casas/Sobrados)</option>
                <option value="LOT">Loteamento / Terrenos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Fase da Obra</label>
              <select
                value={condoForm.constructionStatus}
                onChange={(e) => setCondoForm({ ...condoForm, constructionStatus: e.target.value as ConstructionStatus })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              >
                <option value="IN_PROGRESS">Em Execução / Construção</option>
                <option value="PLANNING">Planejamento / Projeto</option>
                <option value="COMPLETED">Entregue / Concluído</option>
              </select>
            </div>
          </div>

          {/* Dados do Responsável / Síndico */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-3">
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
              Dados do Responsável / Síndico
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Nome do Síndico / Gestor</label>
                <input
                  type="text"
                  placeholder="Ex: João Roberto"
                  value={condoForm.managerName}
                  onChange={(e) => setCondoForm({ ...condoForm, managerName: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Telefone do Gestor</label>
                <input
                  type="text"
                  placeholder="Ex: (62) 99999-0000"
                  value={condoForm.managerPhone}
                  onChange={(e) => setCondoForm({ ...condoForm, managerPhone: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">E-mail do Gestor</label>
                <input
                  type="email"
                  placeholder="Ex: gestor@condominio.com"
                  value={condoForm.managerEmail}
                  onChange={(e) => setCondoForm({ ...condoForm, managerEmail: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Endereço (Logradouro)</label>
              <input
                type="text"
                placeholder="Ex: Av. das Palmeiras, 100"
                value={condoForm.street}
                onChange={(e) => setCondoForm({ ...condoForm, street: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Cidade / UF</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Goiânia"
                  value={condoForm.city}
                  onChange={(e) => setCondoForm({ ...condoForm, city: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
                <input
                  type="text"
                  maxLength={2}
                  placeholder="GO"
                  value={condoForm.state}
                  onChange={(e) => setCondoForm({ ...condoForm, state: e.target.value.toUpperCase() })}
                  className="w-14 px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCondoModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isSaving ? 'Salvando...' : 'Salvar Condomínio'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
