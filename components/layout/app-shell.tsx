'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TattooMachineMenuTrigger } from '@/components/ui/tattoo-machine-menu-icon';
import { ProfileSettingsDrawer } from '@/components/features/profile-settings-drawer';
import { useUiStore, type AppTab } from '@/hooks/use-ui-store';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import {
  dashboardPathForRole,
  isKycApproved,
  isOnboardingComplete,
  ONBOARDING_PATH,
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
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const role = useAuthStore((s) => s.role);
  const setRole = useAuthStore((s) => s.setRole);
  const isOnline = useOfflineQueue((s) => s.isOnline);
  const pending = useOfflineQueue((s) => s.queue.length);
  const settingsDrawerOpen = useUiStore((s) => s.settingsDrawerOpen);
  const openSettingsDrawer = useUiStore((s) => s.openSettingsDrawer);
  const tabRole = role ?? 'cliente';
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    const loadRole = async () => {
      try {
        const response = await fetch('/api/perfil/ensure', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;
        const parsedRole = parseAppRole(payload?.perfil?.role);
        if (parsedRole) setRole(parsedRole);

        const currentPath = pathnameRef.current;
        if (
          payload?.needsOnboarding ||
          (payload?.perfil && !isOnboardingComplete(payload.perfil))
        ) {
          if (!currentPath.startsWith(ONBOARDING_PATH)) {
            router.replace(ONBOARDING_PATH);
          }
          return;
        }

        if (
          parsedRole === 'tatuador' &&
          !isKycApproved(payload?.perfil?.kyc_status) &&
          !currentPath.startsWith('/dashboard/kyc-pendente')
        ) {
          router.replace('/dashboard/kyc-pendente');
        }
      } catch {
        // Sem perfil sincronizado, a dock permanece visível com o papel padrão.
      }
    };

    void loadRole();
    return () => {
      cancelled = true;
    };
  }, [router, setRole]);

  useEffect(() => {
    if (pathname.startsWith('/dashboard/chat')) {
      setActiveTab('chat');
      return;
    }
    if (pathname.startsWith('/dashboard/perfil')) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'portfolio' || tab === 'agendar' || tab === 'chat') {
      setActiveTab(tab);
    }
  }, [pathname, setActiveTab]);

  const isOnboarding = pathname.startsWith('/dashboard/onboarding');
  const isAiChat = pathname.startsWith('/dashboard/ai');
  const isKycPendente = pathname.startsWith('/dashboard/kyc-pendente');
  const isProfileSettings = pathname.startsWith('/dashboard/perfil');
  const isDedicatedChat = pathname.startsWith('/dashboard/chat');
  const isSettingsHub = pathname.startsWith('/dashboard/perfil/configuracoes');
  const isGaleria = pathname.startsWith('/dashboard/galeria');
  const hideTabs = isOnboarding || isAiChat || isKycPendente;
  const showMachineTrigger = !hideTabs;
  // Na tela de perfil a aba "Perfil" é a dona do estado ativo; fora dela,
  // ignoramos um `activeTab` residual de 'perfil' para não marcar a aba errada.
  const selectedTab: AppTab = isProfileSettings
    ? 'perfil'
    : isDedicatedChat
      ? 'chat'
      : activeTab === 'perfil'
        ? 'portfolio'
        : activeTab;
  const headerTitle = isSettingsHub
    ? 'Configurações'
    : isGaleria
      ? 'Galeria'
      : selectedTab === 'perfil'
        ? 'Perfil'
        : selectedTab === 'agendar'
          ? 'Agenda & Sessões'
          : selectedTab === 'chat'
            ? 'Chat & Orçamentos'
            : selectedTab === 'portfolio' && role === 'cliente'
              ? 'Minha Jornada'
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
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    const targetPath = dashboardPathForRole(tabRole);
    router.replace(`${targetPath}?${params.toString()}`, { scroll: false });
  };

  return (
    <div
      className={cn(
        'luxury-canvas relative mx-auto flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden overscroll-none bg-background text-neutral-900 select-none dark:text-white',
        hideTabs ? 'pb-[env(safe-area-inset-bottom,0px)]' : 'nav-safe-pad'
      )}
    >
      {isAiChat ? null : (
      <header
        className={cn(
            'z-40 shrink-0 border-b border-neutral-200/80 bg-[#FFFDF9] dark:border-white/10 dark:bg-[#121212]',
          'pt-[max(0.75rem,env(safe-area-inset-top))]'
        )}
      >
        <div className="flex min-h-11 items-center justify-between gap-3 px-4 pb-3">
          <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight">
            {headerTitle}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            {!isOnline || pending > 0 ? (
              <span className="rounded-full bg-neutral-200 px-3 py-1 text-[11px] font-medium text-neutral-700 dark:bg-white/10 dark:text-zinc-300">
                {!isOnline ? 'Offline' : `${pending} na fila`}
              </span>
            ) : null}
            {showMachineTrigger ? (
              <TattooMachineMenuTrigger open={settingsDrawerOpen} onClick={openSettingsDrawer} />
            ) : null}
          </div>
        </div>
        {hideTabs ? null : (
          <div className="hidden px-4 pb-3 md:block">
            <SegmentedControl
              options={TABS_BY_ROLE[tabRole]}
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
          'relative flex min-h-0 flex-1 flex-col',
          isAiChat
            ? 'overflow-hidden'
            : 'min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-none px-4 pb-36 [-webkit-overflow-scrolling:touch] sm:px-6'
        )}
      >
        {children}
      </div>

      {showMachineTrigger ? <ProfileSettingsDrawer /> : null}
      <AiAssistantFab />
    </div>
  );
}
