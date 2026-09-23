import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileSignature,
  CircleDollarSign,
  FileSpreadsheet,
  ShieldCheck,
  Settings,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

type NavItem = { id: string; label: string; icon: React.ElementType };
type NavSection = { label: string; items: NavItem[] };

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapsed,
}) => {
  const { user } = useAuth();

  const sections: NavSection[] = [
    { label: 'Visão geral', items: [{ id: 'dashboard', label: 'Painel geral', icon: LayoutDashboard }] },
    {
      label: 'Condomínios',
      items: [
        { id: 'condominiums', label: 'Condomínios', icon: Building2 },
        { id: 'customers', label: 'Moradores e clientes', icon: Users },
        { id: 'contracts', label: 'Contratos', icon: FileSignature },
      ],
    },
    {
      label: 'Gestão',
      items: [
        { id: 'financial', label: 'Financeiro', icon: CircleDollarSign },
        { id: 'reports', label: 'Relatórios', icon: FileSpreadsheet },
        { id: 'settings', label: 'Configurações', icon: Settings },
        ...(user?.role === 'ADMIN' ? [{ id: 'audit', label: 'Auditoria', icon: ShieldCheck }] : []),
      ],
    },
  ];

  const handleSelect = (id: string) => {
    setActiveTab(id);
    onCloseMobile?.();
  };

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col bg-white text-[#172033]">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className={cn('flex items-center border-b border-[#E6E8EC] px-5 py-5', isCollapsed ? 'justify-center px-3' : 'justify-between')}>
          <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'gap-3')}>
            <img src="/souza-construcao-mark.png" alt="Souza Construção" className="size-12 shrink-0 object-contain" draggable={false} />
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold leading-5 text-[#172033]">JC Condomínio</div>
                <div className="mt-0.5 text-xs leading-4 text-[#64748B]">Gestão condominial</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onCloseMobile && (
              <button type="button" onClick={onCloseMobile} className="rounded-md p-1.5 text-[#64748B] transition-colors hover:bg-[#EDEEEB] hover:text-[#172033] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315B8A] lg:hidden" aria-label="Fechar menu">
                <X className="size-[18px]" />
              </button>
            )}
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5" aria-label="Menu principal">
          {sections.map((section, sectionIndex) => (
            <div key={section.label} className={cn(sectionIndex > 0 && 'mt-5 border-t border-[#E6E8EC] pt-5')}>
              {!isCollapsed && <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">{section.label}</div>}
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id && (item.id !== 'settings' || itemIndex === 2);
                  return (
                    <button key={`${item.id}-${item.label}`} type="button" onClick={() => handleSelect(item.id)} className={cn('group relative flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#A61F24]', isCollapsed && 'justify-center px-0', isActive ? 'bg-[#FCEDEE] text-[#172033]' : 'text-[#475569] hover:bg-[#F8E6E7] hover:text-[#172033]')} aria-current={isActive ? 'page' : undefined} aria-label={isCollapsed ? item.label : undefined} title={isCollapsed ? item.label : undefined}>
                      {isActive && <span className="absolute inset-y-0 left-0 w-[3px] rounded-r-sm bg-[#A61F24]" aria-hidden="true" />}
                      <Icon className={cn('size-[19px] shrink-0', isActive ? 'text-[#A61F24]' : 'text-[#64748B] group-hover:text-[#A61F24]')} strokeWidth={1.8} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className={cn('flex border-t border-[#E6E8EC] px-4 py-3', isCollapsed ? 'justify-center' : 'justify-end')}>
        {onToggleCollapsed && (
          <button type="button" onClick={onToggleCollapsed} className="hidden min-h-10 min-w-10 items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-[#F3F4F6] hover:text-[#172033] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A61F24] lg:inline-flex" aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'} title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}>
            {isCollapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className={cn('sticky top-14 hidden h-[calc(100dvh-3.5rem)] shrink-0 border-r border-[#E6E8EC] lg:block', isCollapsed ? 'w-[72px]' : 'w-[264px]')}>{sidebarContent}</aside>
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu principal">
          <button className="absolute inset-0 cursor-default bg-[#172033]/30" onClick={onCloseMobile} aria-label="Fechar menu" />
          <aside className="relative h-full w-[min(264px,86vw)] border-r border-[#E6E8EC] shadow-lg">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
};
