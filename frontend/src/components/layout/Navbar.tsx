import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Building,
  Users,
  FileSignature,
  Settings,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileText,
  UserRound,
  XCircle,
} from 'lucide-react';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  onNavigate?: (tab: string) => void;
}

interface SearchResult {
  type: 'condominium' | 'customer' | 'contract';
  id: number;
  title: string;
  subtitle: string;
}

type NotificationCategory = 'Urgente' | 'Atenção' | 'Informativo';

interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  createdAt: string;
  icon: React.ComponentType<{ className?: string }>;
}

const getApiList = (data: any): any[] => (Array.isArray(data) ? data : data?.content || []);

const getRelativeTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'agora';
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(seconds);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
  const unit = units.find(([, size]) => absoluteSeconds >= size);
  if (!unit) return 'agora';
  return new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(Math.round(seconds / unit[1]), unit[0]);
};

const getInstallmentDate = (value: string) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const buildNotifications = (auditData: any, installmentData: any): NotificationItem[] => {
  const notifications: NotificationItem[] = [];
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const threeDaysFromNow = startOfToday + 3 * 86400000;

  getApiList(auditData).forEach((log: any) => {
    const action = String(log.action || '').toUpperCase();
    const entity = String(log.entityName || '').toLowerCase();
    const details = log.details || 'Uma alteração foi registrada no sistema.';
    let item: Omit<NotificationItem, 'id'> | null = null;
    if (action === 'STATUS_CHANGE') {
      const isCancelled = /cancelad/i.test(details);
      item = { category: isCancelled ? 'Urgente' : 'Atenção', title: 'Status alterado', message: details, createdAt: log.createdAt, icon: isCancelled ? XCircle : AlertCircle };
    } else if (action === 'PAYMENT') {
      item = { category: 'Informativo', title: 'Pagamento registrado', message: details, createdAt: log.createdAt, icon: CheckCircle2 };
    } else if (action === 'CREATE' && /(contrat|condom|client|usuári|usuario)/i.test(entity)) {
      item = { category: 'Informativo', title: 'Cadastro criado', message: details, createdAt: log.createdAt, icon: entity.includes('contrat') ? FileText : UserRound };
    } else if (action === 'RENEGOTIATE') {
      item = { category: 'Atenção', title: 'Contrato renegociado', message: details, createdAt: log.createdAt, icon: FileText };
    }
    if (item) notifications.push({ ...item, id: `audit-${log.id}` });
  });

  getApiList(installmentData).forEach((installment: any) => {
    if (!installment.dueDate) return;
    const dueDate = getInstallmentDate(installment.dueDate).getTime();
    const isOpen = !['PAGA', 'CANCELADA'].includes(installment.financialSituation);
    if (!isOpen) return;
    if (installment.financialSituation === 'VENCIDA') {
      notifications.push({ id: `installment-overdue-${installment.id}`, category: 'Urgente', title: 'Parcela em atraso', message: `${installment.contractNumber || 'Contrato'} • ${installment.customerName || 'Cliente'}`, createdAt: installment.dueDate, icon: DollarSign });
    } else if (dueDate <= threeDaysFromNow) {
      notifications.push({ id: `installment-due-${installment.id}`, category: 'Atenção', title: dueDate === startOfToday ? 'Parcela vence hoje' : 'Parcela vencendo em breve', message: `${installment.contractNumber || 'Contrato'} • ${installment.customerName || 'Cliente'}`, createdAt: installment.dueDate, icon: Clock3 });
    }
  });

  const priority: Record<NotificationCategory, number> = { Urgente: 0, Atenção: 1, Informativo: 2 };
  return Array.from(new Map(notifications.map((item) => [item.id, item])).values()).sort((a, b) => priority[a.category] - priority[b.category] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
};

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu, onNavigate }) => {
  const { user, logout } = useAuth();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Notifications State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // User Dropdown State
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    const storageKey = `jc-notifications-read-${user.id}`;
    try {
      setReadNotificationIds(JSON.parse(localStorage.getItem(storageKey) || '[]'));
    } catch {
      setReadNotificationIds([]);
    }

    let active = true;
    setIsNotificationsLoading(true);
    Promise.allSettled([
      api.get('/audit-logs', { params: { size: 30 } }),
      api.get('/installments', { params: { size: 100 } }),
    ]).then(([auditResult, installmentsResult]) => {
      if (!active) return;
      setNotifications(buildNotifications(
        auditResult.status === 'fulfilled' ? auditResult.value.data : [],
        installmentsResult.status === 'fulfilled' ? installmentsResult.value.data : [],
      ));
    }).finally(() => {
      if (active) setIsNotificationsLoading(false);
    });

    return () => { active = false; };
  }, [user?.id]);

  const markNotificationAsRead = (notificationId: string) => {
    if (!user?.id) return;
    const nextIds = Array.from(new Set([...readNotificationIds, notificationId]));
    setReadNotificationIds(nextIds);
    localStorage.setItem(`jc-notifications-read-${user.id}`, JSON.stringify(nextIds));
  };

  const unreadCount = notifications.filter((notification) => !readNotificationIds.includes(notification.id)).length;

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsSearchOpen(false);
      setIsNotificationsOpen(false);
      setIsUserMenuOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Search execution with debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results: SearchResult[] = [];
        const [condoRes, custRes, contractRes] = await Promise.allSettled([
          api.get('/condominiums', { params: { size: 5 } }),
          api.get('/customers', { params: { size: 5 } }),
          api.get('/contracts', { params: { size: 5 } }),
        ]);

        const q = searchQuery.toLowerCase();

        if (condoRes.status === 'fulfilled' && condoRes.value.data) {
          const list = Array.isArray(condoRes.value.data) ? condoRes.value.data : condoRes.value.data.content || [];
          list.forEach((c: any) => {
            if (c.name?.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q)) {
              results.push({
                type: 'condominium',
                id: c.id,
                title: c.name,
                subtitle: `Condomínio • ${c.totalUnits || 0} unidades`,
              });
            }
          });
        }

        if (custRes.status === 'fulfilled' && custRes.value.data) {
          const list = Array.isArray(custRes.value.data) ? custRes.value.data : custRes.value.data.content || [];
          list.forEach((c: any) => {
            if (c.name?.toLowerCase().includes(q) || c.document?.includes(q)) {
              results.push({
                type: 'customer',
                id: c.id,
                title: c.name,
                subtitle: `Cliente • ${c.document || c.email || ''}`,
              });
            }
          });
        }

        if (contractRes.status === 'fulfilled' && contractRes.value.data) {
          const list = Array.isArray(contractRes.value.data) ? contractRes.value.data : contractRes.value.data.content || [];
          list.forEach((c: any) => {
            if (c.contractNumber?.toLowerCase().includes(q) || c.customerName?.toLowerCase().includes(q)) {
              results.push({
                type: 'contract',
                id: c.id,
                title: `Contrato ${c.contractNumber}`,
                subtitle: `${c.customerName} • Unid. ${c.unitNumber || ''}`,
              });
            }
          });
        }

        setSearchResults(results);
      } catch (err) {
        console.error('Erro na busca rápida', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSelectResult = (result: SearchResult) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (!onNavigate) return;

    if (result.type === 'condominium') onNavigate('condominiums');
    else if (result.type === 'customer') onNavigate('customers');
    else if (result.type === 'contract') onNavigate('contracts');
  };

  const getUserInitials = (name: string | undefined) => {
    if (!name) return 'US';
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getUserRoleLabel = () => user?.role === 'ADMIN' ? 'Administrador' : user?.role || 'Operador';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 sm:px-6 bg-white border-b border-[#E2E8F0] shadow-xs">
      {/* Esquerda: Botão Hamburger (Mobile) */}
      <div className="flex items-center gap-2 w-10 sm:w-48 lg:w-60 shrink-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition shrink-0"
            aria-label="Alternar menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Centro: Campo de Busca Centralizado */}
      <div className="flex-1 max-w-md md:max-w-xl mx-auto px-2 flex justify-center">
        <div className="relative w-full max-w-lg" ref={searchRef}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Buscar condomínios, clientes ou contratos..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#F8FAFC] hover:bg-slate-100/70 focus:bg-white text-slate-900 placeholder:text-slate-400 border border-[#E2E8F0] focus:border-blue-600 rounded-md focus:outline-hidden transition"
          />

          {/* Dropdown de Resultados da Busca */}
          {isSearchOpen && searchQuery.length >= 2 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-md border border-[#E2E8F0] shadow-sm overflow-hidden z-50">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                <span>Resultados ({searchResults.length})</span>
                {isSearching && <span className="text-blue-600 font-normal">Buscando...</span>}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleSelectResult(item)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 transition"
                    >
                      <div className="p-1 rounded bg-slate-100 text-slate-600">
                        {item.type === 'condominium' && <Building className="w-3.5 h-3.5" />}
                        {item.type === 'customer' && <Users className="w-3.5 h-3.5" />}
                        {item.type === 'contract' && <FileSignature className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">{item.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                      </div>
                    </button>
                  ))
                ) : !isSearching ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-500">
                    Nenhum registro encontrado para "{searchQuery}".
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Direita: Notificações limpas + Perfil de Usuário */}
      <div className="flex items-center justify-end gap-3 w-10 sm:w-48 lg:w-60 shrink-0">
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition relative focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#A61F24]"
            title="Notificações"
            aria-label={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ''}`}
            aria-expanded={isNotificationsOpen}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#A61F24]" aria-hidden="true" />}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-[min(360px,calc(100vw-2rem))] bg-white rounded-md border border-[#D7DCE3] shadow-sm overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-[#D7DCE3] flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#172033]">Notificações</p>
                  <p className="text-xs text-[#64748B] mt-0.5">Acontecimentos importantes do sistema</p>
                </div>
                {unreadCount > 0 && <span className="text-xs text-[#A61F24] font-medium">{unreadCount} não lida{unreadCount > 1 ? 's' : ''}</span>}
              </div>
              <div className="max-h-[min(420px,65vh)] overflow-y-auto">
                {isNotificationsLoading ? (
                  <div className="px-4 py-8 text-center text-sm text-[#64748B]">Carregando notificações...</div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="mx-auto mb-2 h-5 w-5 text-slate-400" aria-hidden="true" />
                    <p className="text-sm text-[#64748B]">Nenhuma notificação no momento.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((notification) => {
                      const isRead = readNotificationIds.includes(notification.id);
                      const Icon = notification.icon;
                      const categoryClass = notification.category === 'Urgente' ? 'text-[#A61F24] bg-[#FBEDEE]' : notification.category === 'Atenção' ? 'text-amber-700 bg-amber-50' : 'text-slate-600 bg-slate-100';
                      return (
                        <div key={notification.id} className={`px-4 py-3 flex items-start gap-3 ${isRead ? 'bg-white' : 'bg-slate-50/60'}`}>
                          <span className={`mt-0.5 shrink-0 rounded-md p-1.5 ${categoryClass}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-[#172033]">{notification.title}</p>
                              {!isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A61F24]" aria-label="Não lida" />}
                            </div>
                            <p className="mt-0.5 text-xs leading-5 text-[#64748B] line-clamp-2">{notification.message}</p>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <span className={`text-[11px] font-medium ${notification.category === 'Urgente' ? 'text-[#A61F24]' : 'text-[#64748B]'}`}>{notification.category} · {getRelativeTime(notification.createdAt)}</span>
                              {!isRead && <button type="button" onClick={() => markNotificationAsRead(notification.id)} className="text-[11px] text-[#64748B] hover:text-[#172033] underline underline-offset-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#A61F24]" aria-label={`Marcar ${notification.title} como lida`}>Marcar como lida</button>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {user?.role === 'ADMIN' && onNavigate && (
                <div className="border-t border-[#D7DCE3] px-4 py-2.5">
                  <button type="button" onClick={() => { onNavigate('audit'); setIsNotificationsOpen(false); }} className="text-xs font-medium text-[#172033] hover:text-[#A61F24] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#A61F24]">Ver todas</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Perfil AD Administrador com chevron como na imagem */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 rounded-md bg-transparent px-2 py-1.5 hover:bg-[#F3F4F6] transition focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#A61F24]"
            aria-label="Menu do usuário"
            aria-expanded={isUserMenuOpen}
          >
            <div className="size-8 rounded-full bg-[#A61F24] text-white font-semibold text-xs flex items-center justify-center">
              {getUserInitials(user?.name)}
            </div>
            <span className="hidden sm:flex min-w-0 flex-col items-start leading-tight">
              <span className="max-w-[150px] truncate text-sm font-medium text-[#172033]">{user?.name || 'Usuário'}</span>
              <span className="text-xs text-[#64748B]">{getUserRoleLabel()}</span>
            </span>
            <ChevronDown className="size-4 text-[#64748B]" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-[250px] bg-white rounded-lg border border-[#E5E7EB] shadow-sm py-1 z-50 animate-in fade-in-50 duration-100">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user?.name || 'Usuário'}
                </p>
                {user?.email && <p className="text-[11px] text-slate-400 truncate">{user.email}</p>}
              </div>
              {onNavigate && (
                <>
                  <button
                    onClick={() => {
                      onNavigate('settings');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition focus:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A61F24]"
                  >
                    <Users className="w-4 h-4 text-slate-500" />
                    Meu perfil
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('settings');
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    Configurações da Empresa
                  </button>
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => {
                        onNavigate('audit');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                      Trilha de Auditoria
                    </button>
                  )}
                </>
              )}
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={logout}
                className="w-full px-3 py-2 text-left text-xs text-[#A61F24] hover:bg-[#FBEDEE] flex items-center gap-2 transition font-medium focus:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A61F24]"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair do Sistema
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
