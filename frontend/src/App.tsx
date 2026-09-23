import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/common/ToastContainer';
import { SetupAdminPage } from './pages/SetupAdminPage';
import { LoginPage } from './pages/LoginPage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';

// Lazy loading das páginas para code-splitting e carregamento ágil sob demanda
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const CondominiumsPage = lazy(() => import('./pages/CondominiumsPage').then((m) => ({ default: m.CondominiumsPage })));
const CustomersPage = lazy(() => import('./pages/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const ContractsPage = lazy(() => import('./pages/ContractsPage').then((m) => ({ default: m.ContractsPage })));
const FinancialPage = lazy(() => import('./pages/FinancialPage').then((m) => ({ default: m.FinancialPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })));
const CompanySettingsPage = lazy(() => import('./pages/CompanySettingsPage').then((m) => ({ default: m.CompanySettingsPage })));

import {
  LayoutDashboard,
  Building2,
  Users,
  CircleDollarSign,
  Menu as MenuIcon,
} from 'lucide-react';

const PageLoader: React.FC = () => (
  <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-400">
    <div className="w-8 h-8 border-3 border-[#A61F24] border-t-transparent rounded-full animate-spin mb-2" />
    <span className="text-xs font-medium">Carregando módulo...</span>
  </div>
);

const getTabFromHash = (): string => {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const validTabs = ['dashboard', 'condominiums', 'customers', 'contracts', 'financial', 'reports', 'audit', 'settings'];
  return validTabs.includes(hash) ? hash : 'dashboard';
};

const AppContent: React.FC = () => {
  const { user, isLoading, setupRequired } = useAuth();
  const [activeTab, setActiveTab] = useState(getTabFromHash);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('souza-sidebar-collapsed') === 'true');
  const [autoOpenModal, setAutoOpenModal] = useState<'condominium' | 'customer' | 'contract' | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getTabFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('souza-sidebar-collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const handleNavigateWithAction = (tab: string, action?: 'condominium' | 'customer' | 'contract') => {
    window.location.hash = `#/${tab}`;
    setActiveTab(tab);
    if (action) {
      setAutoOpenModal(action);
    } else {
      setAutoOpenModal(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-[#A61F24] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wider uppercase text-slate-400">
          Iniciando JC Condomínio...
        </p>
      </div>
    );
  }

  // Se for primeiro uso e não houver administradores cadastrados, exibe tela de setup seguro
  if (setupRequired) {
    return <SetupAdminPage />;
  }

  if (!user) return <LoginPage />;

  const mobileNavItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'condominiums', label: 'Condomínios', icon: Building2 },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'financial', label: 'Financeiro', icon: CircleDollarSign },
  ];

  return (
    <div className="min-h-dvh bg-white flex flex-col text-slate-900">
      <Navbar
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onNavigate={(tab) => handleNavigateWithAction(tab)}
      />
      <div className="flex flex-1">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => handleNavigateWithAction(tab)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
        />
        <main className="flex-1 w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-6 overflow-x-hidden pb-24 lg:pb-10">
          <Suspense fallback={<PageLoader />}>
            {activeTab === 'dashboard' && (
              <DashboardPage
                onNavigate={(tab) => handleNavigateWithAction(tab)}
                onNavigateWithAction={handleNavigateWithAction}
              />
            )}
            {activeTab === 'condominiums' && (
              <CondominiumsPage
                initialOpenModal={autoOpenModal === 'condominium'}
                onModalClose={() => setAutoOpenModal(null)}
              />
            )}
            {activeTab === 'customers' && (
              <CustomersPage
                initialOpenModal={autoOpenModal === 'customer'}
                onModalClose={() => setAutoOpenModal(null)}
              />
            )}
            {activeTab === 'contracts' && (
              <ContractsPage
                onNavigateToReports={() => setActiveTab('reports')}
                initialOpenModal={autoOpenModal === 'contract'}
                onModalClose={() => setAutoOpenModal(null)}
              />
            )}
            {activeTab === 'financial' && <FinancialPage />}
            {activeTab === 'reports' && <ReportsPage />}
            {activeTab === 'audit' && <AuditLogsPage />}
            {activeTab === 'settings' && <CompanySettingsPage />}
          </Suspense>
        </main>
      </div>

      {/* Navegação Inferior Mobile (Smartphones) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2E7EC] px-2 py-1.5 flex items-center justify-around shadow-sm"
        aria-label="Navegação móvel inferior"
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigateWithAction(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                isActive ? 'text-[#A61F24] font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#A61F24]' : 'text-slate-400'}`} />
              <span className="text-[10px] mt-0.5 leading-none">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-slate-500 hover:text-slate-800 transition-colors"
          aria-label="Mais opções"
        >
          <MenuIcon className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] mt-0.5 leading-none">Mais</span>
        </button>
      </nav>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
        <ToastContainer />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
