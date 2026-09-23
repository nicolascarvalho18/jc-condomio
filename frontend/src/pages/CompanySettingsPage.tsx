import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { Company, Role, StatusChangePayload } from '../types';
import { Building2, Save, Users, Plus, CheckCircle2, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { StatusSelect } from '../components/common/StatusSelect';
import { useToast } from '../context/ToastContext';
import { maskPhone, maskCep } from '../utils/masks';

export const CompanySettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'CORPORATE' | 'FINANCIAL_RULES' | 'USERS'>('CORPORATE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [policyConfirmationOpen, setPolicyConfirmationOpen] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [savedPolicy, setSavedPolicy] = useState({ penalty: 2, interest: 1, grace: 0 });

  // Users list
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'OPERADOR' as Role,
  });

  const [form, setForm] = useState({
    cnpj: '',
    corporateName: '',
    tradeName: '',
    stateRegistration: '',
    email: '',
    phone: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    defaultPenaltyPercent: '2.00',
    defaultInterestPercentMonthly: '1.00',
    defaultGraceDays: '0',
  });

  const fetchCompany = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Company>('/companies/my');
      setForm({
        cnpj: res.data.cnpj,
        corporateName: res.data.corporateName,
        tradeName: res.data.tradeName,
        stateRegistration: res.data.stateRegistration || '',
        email: res.data.email || '',
        phone: res.data.phone || '',
        zipCode: res.data.zipCode || '',
        street: res.data.street || '',
        number: res.data.number || '',
        complement: res.data.complement || '',
        neighborhood: res.data.neighborhood || '',
        city: res.data.city || '',
        state: res.data.state || '',
        defaultPenaltyPercent: Number(res.data.defaultPenaltyPercent).toFixed(2),
        defaultInterestPercentMonthly: Number(res.data.defaultInterestPercentMonthly).toFixed(2),
        defaultGraceDays: String(res.data.defaultGraceDays),
      });
      setSavedPolicy({
        penalty: Number(res.data.defaultPenaltyPercent),
        interest: Number(res.data.defaultInterestPercentMonthly),
        grace: Number(res.data.defaultGraceDays),
      });

      if (user?.role === 'ADMIN') {
        const usersRes = await api.get('/auth/users');
        setUsersList(usersRes.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados da empresa', err);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const parseDecimal = (value: string) => Number(value.replace(',', '.'));

  const saveCompany = async () => {
    setSaving(true);
    setMessage(null);
    setPolicyError(null);
    try {
      const payload = {
        ...form,
        defaultPenaltyPercent: parseDecimal(form.defaultPenaltyPercent),
        defaultInterestPercentMonthly: parseDecimal(form.defaultInterestPercentMonthly),
        defaultGraceDays: Number(form.defaultGraceDays),
      };
      const response = await api.put<Company>('/companies/my', payload);
      setForm((current) => ({
        ...current,
        defaultPenaltyPercent: Number(response.data.defaultPenaltyPercent).toFixed(2),
        defaultInterestPercentMonthly: Number(response.data.defaultInterestPercentMonthly).toFixed(2),
        defaultGraceDays: String(response.data.defaultGraceDays),
      }));
      setSavedPolicy({
        penalty: Number(response.data.defaultPenaltyPercent),
        interest: Number(response.data.defaultInterestPercentMonthly),
        grace: Number(response.data.defaultGraceDays),
      });
      const changedPolicy = savedPolicy.penalty !== payload.defaultPenaltyPercent
        || savedPolicy.interest !== payload.defaultInterestPercentMonthly
        || savedPolicy.grace !== payload.defaultGraceDays;
      const successMessage = changedPolicy
        ? 'Políticas atualizadas e contratos recalculados com sucesso.'
        : 'Configurações da empresa atualizadas com sucesso.';
      toast.success(successMessage, 'Configurações Salvas');
      setMessage(successMessage);
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Erro ao salvar alterações da empresa.';
      setPolicyError(errorMessage);
      toast.error(errorMessage, 'Erro ao Salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const penalty = parseDecimal(form.defaultPenaltyPercent);
    const interest = parseDecimal(form.defaultInterestPercentMonthly);
    const grace = Number(form.defaultGraceDays);
    if (!Number.isFinite(penalty) || penalty < 0 || penalty > 100
      || !Number.isFinite(interest) || interest < 0 || interest > 100
      || !Number.isInteger(grace) || grace < 0 || grace > 3650) {
      setPolicyError('Informe multa e juros entre 0 e 100%, e carência entre 0 e 3650 dias.');
      return;
    }
    const changedPolicy = savedPolicy.penalty !== penalty || savedPolicy.interest !== interest || savedPolicy.grace !== grace;
    if (changedPolicy) {
      setPolicyConfirmationOpen(true);
      return;
    }
    await saveCompany();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/users', newUserForm);
      toast.success('Novo colaborador cadastrado com sucesso.', 'Usuário Cadastrado');
      setIsUserModalOpen(false);
      setNewUserForm({ name: '', email: '', password: '', role: 'OPERADOR' });
      const usersRes = await api.get('/auth/users');
      setUsersList(usersRes.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao cadastrar usuário.', 'Erro no Cadastro');
    }
  };

  const handleUserStatusChange = async (userId: number, payload: StatusChangePayload) => {
    try {
      await api.patch(`/auth/users/${userId}/status`, payload);
      toast.success('Status do colaborador atualizado com sucesso.', 'Status Atualizado');
      const usersRes = await api.get('/auth/users');
      setUsersList(usersRes.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao alterar status do colaborador.', 'Erro no Status');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Carregando configurações da empresa...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Configurações Gerais & Parâmetros</h2>
        <p className="text-xs text-slate-500">
          Dados cadastrais da construtora, taxas padrão de juros e controle de usuários operacionais.
        </p>
      </div>

      {/* Confirmation feedback alert */}
      {message && (
        <div className="p-3 bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-md flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-slate-700" />
          <span>{message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('CORPORATE')}
          className={`pb-2.5 transition flex items-center gap-1.5 ${
            activeTab === 'CORPORATE'
              ? 'border-b-2 border-slate-900 text-slate-900'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Dados da Empresa
        </button>
        <button
          onClick={() => setActiveTab('FINANCIAL_RULES')}
          className={`pb-2.5 transition flex items-center gap-1.5 ${
            activeTab === 'FINANCIAL_RULES'
              ? 'border-b-2 border-slate-900 text-slate-900'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Parâmetros Financeiros & Multas
        </button>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('USERS')}
            className={`pb-2.5 transition flex items-center gap-1.5 ${
              activeTab === 'USERS'
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Usuários & Permissões ({usersList.length})
          </button>
        )}
      </div>

      {/* TAB: CORPORATE & FINANCIAL RULES FORM */}
      {(activeTab === 'CORPORATE' || activeTab === 'FINANCIAL_RULES') && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-6">
          {activeTab === 'CORPORATE' && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1">
                Identificação Cadastral da Construtora / Incorporadora
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">CNPJ (Fixo)</label>
                  <input
                    type="text"
                    disabled
                    value={form.cnpj}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nome Fantasia *</label>
                  <input
                    type="text"
                    required
                    value={form.tradeName}
                    onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Razão Social *</label>
                  <input
                    type="text"
                    required
                    value={form.corporateName}
                    onChange={(e) => setForm({ ...form, corporateName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">E-mail Corporativo</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Telefone Principal</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Inscrição Estadual (IE)</label>
                  <input
                    type="text"
                    value={form.stateRegistration}
                    onChange={(e) => setForm({ ...form, stateRegistration: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">CEP</label>
                  <input
                    type="text"
                    value={form.zipCode}
                    onChange={(e) => setForm({ ...form, zipCode: maskCep(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Endereço (Logradouro)</label>
                  <input
                    type="text"
                    value={form.street}
                    onChange={(e) => setForm({ ...form, street: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Número</label>
                  <input
                    type="text"
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Complemento</label>
                  <input
                    type="text"
                    value={form.complement}
                    onChange={(e) => setForm({ ...form, complement: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none uppercase font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'FINANCIAL_RULES' && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1">
                Políticas Contratuais de Mora & Inadimplência
              </h3>
              <p className="text-xs text-slate-500">
                Estes parâmetros são aplicados automaticamente como padrão durante a emissão de novos contratos de venda e no cálculo diário de encargos pro-rata.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Multa Padrão por Atraso (%) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={form.defaultPenaltyPercent}
                    onChange={(e) => setForm({ ...form, defaultPenaltyPercent: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Ex: 2.00% conforme Código Civil</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Juros de Mora Mensais (%) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={form.defaultInterestPercentMonthly}
                    onChange={(e) => setForm({ ...form, defaultInterestPercentMonthly: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Ex: 1.00% ao mês (pro-rata die)</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Dias de Tolerância / Carência</label>
                  <input
                    type="number"
                    min={0}
                    max={3650}
                    required
                    value={form.defaultGraceDays}
                    onChange={(e) => setForm({ ...form, defaultGraceDays: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Dias úteis sem incidência de mora</span>
                </div>
              </div>
              {policyError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2" role="alert">
                  {policyError}
                </p>
              )}
            </div>
          )}

          {user?.role === 'ADMIN' && (
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          )}
        </form>
      )}

      <ConfirmationModal
        isOpen={policyConfirmationOpen}
        onClose={() => setPolicyConfirmationOpen(false)}
        onConfirm={async () => {
          setPolicyConfirmationOpen(false);
          await saveCompany();
        }}
        title="Aplicar novas políticas"
        message="As novas regras serão aplicadas aos contratos ativos e boletos vencidos. Deseja continuar?"
        confirmLabel="Continuar e recalcular"
        isLoading={saving}
      />

      {/* TAB: USERS LIST (ADMIN ONLY) */}
      {activeTab === 'USERS' && user?.role === 'ADMIN' && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Colaboradores Autorizados
              </h3>
              <p className="text-xs text-slate-500">
                Gerencie permissões por nível de acesso (ADMIN, FINANCEIRO, OPERADOR, CONSULTA).
              </p>
            </div>
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Usuário
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-2.5">Nome do Colaborador</th>
                  <th className="px-4 py-2.5">E-mail Corporativo</th>
                  <th className="px-4 py-2.5">Perfil de Acesso (Role)</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{u.name}</td>
                    <td className="px-4 py-2.5 text-slate-600 font-mono text-[11px]">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="neutral">{u.role}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="inline-flex flex-col items-center">
                        <StatusSelect
                          currentStatus={u.status || 'ACTIVE'}
                          entityName={`colaborador "${u.name}"`}
                          onStatusChange={(payload) => handleUserStatusChange(u.id, payload)}
                        />
                        {u.statusReason && u.status !== 'ACTIVE' && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5" title={u.statusReason}>
                            {u.statusReason}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Novo Usuário */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Cadastrar Novo Colaborador">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              value={newUserForm.name}
              onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">E-mail de Acesso *</label>
            <input
              type="email"
              required
              value={newUserForm.email}
              onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Perfil de Acesso *</label>
              <select
                value={newUserForm.role}
                onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as Role })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              >
                <option value="OPERADOR">OPERADOR (Cadastros & Vendas)</option>
                <option value="FINANCEIRO">FINANCEIRO (Baixas & Acordos)</option>
                <option value="CONSULTA">CONSULTA (Somente Leitura)</option>
                <option value="ADMIN">ADMIN (Acesso Pleno)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Senha de Acesso *</label>
              <input
                type="password"
                required
                minLength={8}
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition shadow-xs"
            >
              Salvar Usuário
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
