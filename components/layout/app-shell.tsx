'use client';

import { startTransition, useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import { useI18n } from '@/hooks/use-i18n';
import { BRAND_NAME } from '@/lib/i18n/brands';
import { useRouteTab } from '@/hooks/use-route-tab';
import { forceViewportRecalibration, resetViewportScale } from '@/lib/utils/viewport-scale';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export function AppShell({ children, title = BRAND_NAME }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const role = useAuthStore((s) => s.role);
  const setRole = useAuthStore((s) => s.setRole);
  const isOnline = useOfflineQueue((s) => s.isOnline);
  const pending = useOfflineQueue((s) => s.queue.length);
  const settingsDrawerOpen = useUiStore((s) => s.settingsDrawerOpen);
  const openSettingsDrawer = useUiStore((s) => s.openSettingsDrawer);
  const { t } = useI18n();
  const pathnameRef = useRef(pathname);

  // Papel derivado da PRÓPRIA rota. Como o pathname é conhecido de forma
  // síncrona no primeiro frame (antes de `/api/perfil/ensure` resolver o papel
  // assíncrono), o header nasce com o título definitivo — ex.:
  // `/dashboard/tatuador` pinta "Atelier Digital" imediatamente, eliminando o
  // swap de texto "TattooGo MK" -> título do papel que causava layout shift.
  const pathRole = useMemo<AppRole | null>(() => {
    if (pathname.startsWith('/dashboard/tatuador')) return 'tatuador';
    if (pathname.startsWith('/dashboard/estudio')) return 'estudio';
    if (pathname.startsWith('/dashboard/cliente')) return 'cliente';
    return null;
  }, [pathname]);
  // O store é a fonte de verdade quando a rota não nomeia o papel (ex.: o
  // despachante `/dashboard`); a rota tem precedência para manter o título
  // estável entre skeleton e conteúdo resolvido.
  const shellRole = pathRole ?? role;
  const tabRole = shellRole ?? 'cliente';

  // Detecção de rota derivada do pathname (cliente). É avaliada a cada render,
  // então nunca fica fora de sincronia com a navegação — ao contrário de uma
  // decisão tomada no layout do servidor, que é congelada entre navegações.
  const isOnboarding = pathname.startsWith('/dashboard/onboarding');
  const isAiChat = pathname.startsWith('/dashboard/ai');
  const isKycPendente = pathname.startsWith('/dashboard/kyc-pendente');
  const isArtistVerification = pathname.startsWith('/dashboard/seja-tatuador');
  const isProfileSettings = pathname.startsWith('/dashboard/perfil');
  const isDedicatedChat = pathname.startsWith('/dashboard/chat');
  const isSettingsHub = pathname.startsWith('/dashboard/perfil/configuracoes');
  const isGaleria = pathname.startsWith('/dashboard/galeria');
  const isPagamentos = pathname.startsWith('/dashboard/pagamentos');
  // Rotas "sem casco": renderizam o conteúdo em tela cheia, sem header, sem
  // gatilho de menu e sem FAB — exatamente como quando o layout as isolava.
  const isChromeLess =
    isOnboarding || isAiChat || isKycPendente || isArtistVerification;
  // O chat possui dois estados distintos:
  //  - Inbox/Hub (`/dashboard/chat`): mantém o bottom navigation do casco
  //    visível. NÃO é imersivo — o casco reserva o clearance da dock
  //    (`nav-safe-pad`) para que a lista de conversas nunca fique sob a nav.
  //  - Thread ativa (`/dashboard/chat?artistId=...`): experiência imersiva
  //    (padrão iMessage). A própria thread gerencia header/scroll/composer e
  //    ocupa 100% do viewport dinâmico, então esconde o chrome e a dock.
  //
  // HYDRATION-SAFE: a presença da thread é lida de forma SÍNCRONA da própria
  // URL (`useSearchParams`), exatamente como no render do servidor. O estado não
  // é mais propagado por um efeito pós-hidratação — o HTML do SSR já nasce com
  // a geometria correta (sem `nav-safe-pad`, sem dock), eliminando o snap de
  // primeiro paint no cold boot de um link direto de conversa.
  const hasActiveChatThread =
    isDedicatedChat &&
    Boolean(searchParams.get('artistId') || searchParams.get('tatuadorId'));
  const isImmersiveChat = hasActiveChatThread;
  const hideShellChrome = isChromeLess || isImmersiveChat;
  // Em ambos os estados do chat a barra superior é do próprio workspace (glass
  // + busca/voltar). O header do casco nunca é empilhado acima dela — inclusive
  // no inbox, onde a dock permanece visível.
  const hideShellHeader = hideShellChrome || isDedicatedChat;
  const hideTabs = hideShellChrome;
  const showMachineTrigger = !hideShellChrome;

  // Estável entre renders (só muda com o locale): evita recriar o array de
  // opções a cada render e mantém a referência limpa para o SegmentedControl
  // memoizado, deixando o header fora do ciclo de re-render das telas.
  const tabsByRole: Record<AppRole, { value: AppTab; label: string }[]> = useMemo(
    () => ({
      cliente: [
        { value: 'portfolio', label: t('nav.gallery') },
        { value: 'agendar', label: t('nav.book') },
        { value: 'chat', label: t('nav.chat') },
        { value: 'perfil', label: t('nav.profile') },
      ],
      tatuador: [
        { value: 'portfolio', label: t(ROLE_EXPERIENCE.tatuador.dashboard.primaryTab) },
        { value: 'agendar', label: t('nav.schedule') },
        { value: 'chat', label: t('nav.chat') },
        { value: 'perfil', label: t('nav.profile') },
      ],
      estudio: [
        { value: 'portfolio', label: t(ROLE_EXPERIENCE.estudio.dashboard.primaryTab) },
        { value: 'agendar', label: t('nav.book') },
        { value: 'chat', label: t('nav.chat') },
        { value: 'perfil', label: t('nav.profile') },
      ],
    }),
    [t]
  );

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // Rotas "sem casco" (onboarding, KYC, Atelier Digital/IA e "Quero ser
    // Tatuador") não participam da sincronização de papel da dock: elas já
    // dirigem a própria sessão e redirecionamentos. Esse efeito só pertence ao
    // casco padrão, exatamente como antes de o AppShell cobrir essas rotas.
    if (isChromeLess) return;

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
  }, [isChromeLess, router, setRole]);

  // Aba ativa do header derivada da ROTA (não do store), para que o SKELETON do
  // SSR e o conteúdo resolvido destaquem a mesma aba no primeiro frame. Usa o
  // MESMO hook SSR-safe dos painéis de papel (`useRouteTab`): o HTML do servidor
  // e o primeiro frame do cliente são idênticos — nenhuma escrita de estado
  // pós-hidratação pode alterar a geometria do casco.
  const routeTab: AppTab = useRouteTab('portfolio');
  const selectedTab: AppTab = isProfileSettings
    ? 'perfil'
    : isDedicatedChat
      ? 'chat'
      : isPagamentos
        ? 'agendar'
        : routeTab === 'perfil'
          ? 'portfolio'
          : routeTab;
  const headerTitle = isSettingsHub
    ? t('settings.title')
    : isGaleria
      ? t('nav.gallery')
      : isPagamentos
        ? shellRole && shellRole !== 'cliente'
          ? t('payments.tabStudio')
          : t('payments.tabClient')
        : selectedTab === 'perfil'
          ? t('profile.title')
          : selectedTab === 'agendar'
            ? t('nav.schedule')
            : selectedTab === 'chat'
              ? t('chat.title')
              : shellRole && shellRole !== 'cliente'
                ? t(ROLE_EXPERIENCE[shellRole].dashboard.title)
                : title;

  const handleTabChange = useCallback(
    (tab: AppTab) => {
      // Hard clean-up: ao trocar de aba a partir de uma sub-rota "sem casco"
      // (ex.: "Quero ser Tatuador"), descartamos qualquer foco/transform/escala
      // residual de viewport antes de montar o casco padrão. Sem isso, o iOS
      // devolvia o visual viewport ampliado ao container raiz e a dock ficava
      // desalinhada.
      if (isChromeLess) {
        resetViewportScale({ forceBlur: true });
        forceViewportRecalibration();
      }
      // 'perfil' vive em uma rota própria: não gravamos no store (os painéis de
      // papel leem `activeTab` para decidir o conteúdo e 'perfil' os deixaria
      // em branco). A aba ativa é derivada do pathname.
      //
      // `startTransition` mantém o frame atual pintado até que o próximo esteja
      // pronto — troca de aba instantânea, sem flash de estado vazio.
      startTransition(() => {
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
      });
    },
    [isChromeLess, router, setActiveTab, tabRole]
  );

  // A camada de rolagem é decidida pela rota, mas o CASCO (a caixa externa do
  // painel de conteúdo) é idêntico em todas as abas. Assim, ao alternar entre
  // "Agenda" e "Chat" o React só troca os nós internos — as fronteiras do
  // shell (largura, altura, paddings) jamais mudam e nada "salta" no primeiro
  // frame após a hidratação.
  const isSelfScrollingRoute =
    hideShellChrome || isDedicatedChat || isSettingsHub || isGaleria;

  return (
    // A unidade de viewport (`100dvh`) é propriedade EXCLUSIVA do layout raiz
    // (`app/dashboard/layout.tsx`). O casco apenas PREENCHE esse pai de forma
    // determinística (`h-full w-full flex-1`), de modo que a geometria global
    // seja definida em um único lugar e nunca recalculada/duplicada aqui.
    <div className="luxury-canvas relative flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden overscroll-none bg-background text-neutral-900 select-none dark:text-white">
      {hideShellHeader ? null : (
      <header
        className={cn(
            'glass-chrome z-40 shrink-0 border-b border-black/[0.04] dark:border-white/[0.05]',
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
                {!isOnline ? t('common.offline') : `${pending} na fila`}
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
              options={tabsByRole[tabRole]}
              value={selectedTab}
              onChange={handleTabChange}
              ariaLabel={t('nav.home')}
            />
          </div>
        )}
      </header>
      )}

      <div
        data-shell-content
        className={cn(
          // FRONTEIRA IMUTÁVEL DO CONTEÚDO (bounding box lock).
          //
          // Este é o container `relative flex-1 overflow-hidden` exigido pela
          // Fase 10.18: a sua altura deriva EXCLUSIVAMENTE do flex do casco
          // (header + nav já resolvidos), nunca do conteúdo que monta/desmonta.
          // `overflow-hidden` zera o `min-height:auto` implícito do flex child,
          // então nem um Suspense fallback em branco consegue colapsá-lo.
          //
          // `scrollbar-none` mantém a largura útil matematicamente constante
          // entre abas roláveis e não-roláveis (sem reserva de gutter).
          'scrollbar-none relative flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden'
        )}
      >
        {/*
         * CONTÊINER ESTRUTURAL PERSISTENTE — ABSOLUTE INSET LOCKING.
         *
         * O casco (header + dock) vive no layout do App Router e NUNCA é
         * desmontado numa troca de aba; só os `children` mudam. Ao ancorar este
         * viewport em `absolute inset-0`, os nós que entram (página), saem
         * (skeleton) ou ficam suspensos empilham exatamente sobre a mesma caixa
         * física: a altura do pai jamais é recalculada — nem no milissegundo da
         * corrida de Suspense/roteamento. Zero colapso, zero stutter sub-pixel.
         *
         * A rolagem e o clearance da dock continuam NO INTERIOR desta caixa
         * (equivalente ao comportamento anterior), apenas desacoplados da
         * geometria do pai.
         */}
        <div
          data-shell-viewport
          className={cn(
            'absolute inset-0 flex min-h-0 min-w-0 flex-col',
            // Clearance da dock flutuante reservado em CSS PURO
            // (`--dock-clearance` definido em globals.css), presente já no
            // primeiro frame. A thread imersiva de chat (sem dock) é o único
            // caso sem clearance.
            hideShellChrome ? '' : 'nav-safe-pad',
            isSelfScrollingRoute
              ? 'overflow-hidden'
              : 'overflow-x-hidden overflow-y-auto overscroll-none px-4 [-webkit-overflow-scrolling:touch] sm:px-6'
          )}
        >
          {children}
        </div>
      </div>

      {showMachineTrigger ? <ProfileSettingsDrawer /> : null}
      <AiAssistantFab />
    </div>
  );
}
