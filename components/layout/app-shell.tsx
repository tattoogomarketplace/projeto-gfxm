'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Settings } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useUiStore, type AppTab } from '@/hooks/use-ui-store';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import {
  dashboardPathForRole,
  parseAppRole,
  type AppRole,
} from '@/lib/utils/auth-redirect';
import { ROLE_EXPERIENCE } from '@/lib/content/role-experience';
import { AiAssistantFab } from '@/components/layout/ai-assistant-fab';
import { cn } from '@/lib/utils';

const baseTabs = (primaryLabel: string): { value: AppTab; label: string }[] => [
  { value: 'portfolio', label: primaryLabel },
  { value: 'agendar', label: 'Agendar' },
  { value: 'chat', label: 'Chat' },
  { value: 'perfil', label: 'Perfil' },
];

const TABS_BY_ROLE: Record<AppRole, { value: AppTab; label: string }[]> = {
  cliente: baseTabs(ROLE_EXPERIENCE.cliente.dashboard.primaryTab),
  tatuador: [
    { value: 'portfolio', label: ROLE_EXPERIENCE.tatuador.dashboard.primaryTab },
    { value: 'agendar', label: 'Agenda' },
    { value: 'chat', label: 'Chat' },
    { value: 'perfil', label: 'Perfil' },
  ],
  estudio: baseTabs(ROLE_EXPERIENCE.estudio.dashboard.primaryTab),
};

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export function AppShell({ children, title = 'TattooGo MK' }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const role = useAuthStore((s) => s.role);
  const setRole = useAuthStore((s) => s.setRole);
  const isOnline = useOfflineQueue((s) => s.isOnline);
  const pending = useOfflineQueue((s) => s.queue.length);

  useEffect(() => {
    let cancelled = false;

    const loadRole = async () => {
      try {
        const response = await fetch('/api/perfil/ensure', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json().catch(() => ({}));
        const parsedRole = parseAppRole(payload?.perfil?.role);
        if (parsedRole && !cancelled) {
          setRole(parsedRole);
        }
      } catch {
        // Sem perfil sincronizado, a navegação por abas permanece oculta.
      }
    };

    void loadRole();
    return () => {
      cancelled = true;
    };
  }, [setRole]);

  useEffect(() => {
    if (pathname.startsWith('/dashboard/chat')) {
      setActiveTab('chat');
      return;
    }
    const tab = searchParams.get('tab');
    if (tab === 'portfolio' || tab === 'agendar' || tab === 'chat') {
      setActiveTab(tab);
    }
  }, [pathname, searchParams, setActiveTab]);

  const isOnboarding = pathname.startsWith('/dashboard/onboarding');
  const isAiChat = pathname.startsWith('/dashboard/ai');
  const isKycPendente = pathname.startsWith('/dashboard/kyc-pendente');
  const isProfileSettings = pathname.startsWith('/dashboard/perfil');
  const isDedicatedChat = pathname.startsWith('/dashboard/chat');
  const isSettingsHub = pathname.startsWith('/dashboard/perfil/configuracoes');
  const hideTabs = isOnboarding || isAiChat || isKycPendente;
  // Na tela de perfil a aba "Perfil" é a dona do estado ativo; fora dela,
  // ignoramos um `activeTab` residual de 'perfil' para não marcar a aba errada.
  const tabParam = searchParams.get('tab');
  const selectedTab: AppTab = isProfileSettings
    ? 'perfil'
    : isDedicatedChat || tabParam === 'chat'
      ? 'chat'
      : tabParam === 'agendar' || tabParam === 'portfolio'
        ? tabParam
        : activeTab === 'perfil'
          ? 'portfolio'
          : activeTab;
  const headerTitle = isSettingsHub
    ? 'Configurações'
    : selectedTab === 'perfil'
      ? 'Perfil'
      : selectedTab === 'agendar'
        ? 'Agenda & Sessões'
        : selectedTab === 'chat'
          ? 'Chat & Mensagens'
          : role
            ? ROLE_EXPERIENCE[role].dashboard.title
            : title;

  const handleTabChange = (tab: AppTab) => {
    // 'perfil' vive em uma rota própria: não gravamos no store (os painéis de
    // papel leem `activeTab` para decidir o conteúdo e 'perfil' os deixaria
    // em branco). A aba ativa é derivada do pathname.
    if (tab === 'perfil') {
      router.push('/dashboard/perfil');
      return;
    }
    if (tab === 'chat') {
      setActiveTab('chat');
      router.push('/dashboard/chat');
      return;
    }
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    const targetPath = role ? dashboardPathForRole(role) : pathname;
    router.replace(`${targetPath}?${params.toString()}`, { scroll: false });
  };

  return (
    <div
      className={cn(
        'luxury-canvas relative mx-auto flex h-full max-h-full w-full flex-col overflow-hidden overscroll-none text-neutral-900 dark:text-white',
        hideTabs ? 'pb-[env(safe-area-inset-bottom,0px)]' : 'nav-safe-pad'
      )}
    >
      {isAiChat ? null : (
      <header
        className={cn(
            'z-40 shrink-0 border-b border-neutral-200/80 bg-[#FFFDF9] backdrop-blur-xl dark:border-white/10 dark:bg-[#121212]',
          'pt-[max(0.75rem,env(safe-area-inset-top))]'
        )}
      >
        <div className="flex min-h-11 items-center justify-between px-4 pb-3">
          <h1 className="text-[17px] font-semibold tracking-tight">
            {headerTitle}
          </h1>
          <div className="flex items-center gap-2">
            {!isOnline || pending > 0 ? (
              <span className="rounded-full bg-neutral-200 px-3 py-1 text-[11px] font-medium text-neutral-700 dark:bg-white/10 dark:text-zinc-300">
                {!isOnline ? 'Offline' : `${pending} na fila`}
              </span>
            ) : null}
            {hideTabs || isProfileSettings ? null : (
              <Link
                href="/dashboard/perfil/configuracoes"
                aria-label="Abrir configurações"
                className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl text-zinc-400 transition-all duration-200 hover:bg-orange-500/10 hover:text-orange-500 active:scale-[0.98]"
              >
                <Settings className="h-5 w-5" strokeWidth={1.75} />
              </Link>
            )}
          </div>
        </div>
        {hideTabs || !role ? null : (
          <div className="hidden px-4 pb-3 md:block">
            <SegmentedControl
              options={TABS_BY_ROLE[role]}
              value={selectedTab}
              onChange={handleTabChange}
              ariaLabel="Navegação principal"
            />
          </div>
        )}
      </header>
      )}

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-none [-webkit-overflow-scrolling:touch]',
          hideTabs ? 'pb-6' : 'pb-0'
        )}
      >
        {children}
      </div>

      <AiAssistantFab />
    </div>
  );
}
