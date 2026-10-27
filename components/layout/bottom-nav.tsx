'use client';

import { memo, startTransition, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Home, MessageCircle, UserRound } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useI18n } from '@/hooks/use-i18n';
import { useUiStore, type AppTab } from '@/hooks/use-ui-store';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';
import { useRouteTab } from '@/hooks/use-route-tab';
import { forceViewportRecalibration, resetViewportScale } from '@/lib/utils/viewport-scale';
import { useBootCanvasActive } from '@/components/layout/boot-continuation';
import { cn } from '@/lib/utils';
import type { MessageKey } from '@/lib/i18n/types';

const ITEMS: Array<{
  tab: AppTab;
  labelKey: MessageKey;
  icon: typeof Home;
}> = [
  { tab: 'portfolio', labelKey: 'nav.home', icon: Home },
  { tab: 'agendar', labelKey: 'nav.schedule', icon: CalendarDays },
  { tab: 'chat', labelKey: 'nav.chat', icon: MessageCircle },
  { tab: 'perfil', labelKey: 'nav.profile', icon: UserRound },
];

type BottomNavProps = {
  hidden?: boolean;
};

function shouldHideNav(pathname: string, chatThreadActive: boolean): boolean {
  if (!pathname.startsWith('/dashboard')) return true;
  return (
    pathname.startsWith('/dashboard/onboarding') ||
    pathname.startsWith('/dashboard/ai') ||
    pathname.startsWith('/dashboard/kyc-pendente') ||
    pathname.startsWith('/dashboard/mapa') ||
    // Apenas a THREAD de chat é imersiva: o composer é ancorado na base com
    // safe-area e a dock flutuante colidiria com o campo de mensagem. O
    // inbox/hub (`/dashboard/chat` sem thread) mantém a dock visível.
    (pathname.startsWith('/dashboard/chat') && chatThreadActive)
  );
}

/**
 * Sub-rotas que renderizam fora do casco padrão ("sem casco"). Ao tocar numa
 * aba global a partir delas, precisamos de um hard clean-up: desfocar campos,
 * remover transforms/escala residuais e reafirmar o viewport 1:1 antes de
 * montar a dock. Caso contrário o iOS mantém o visual viewport ampliado e o
 * container raiz fica distorcido (bug do fluxo "Quero ser Tatuador").
 */
function isShellBypassedRoute(pathname: string, chatThreadActive: boolean): boolean {
  return (
    pathname.startsWith('/dashboard/seja-tatuador') ||
    pathname.startsWith('/dashboard/onboarding') ||
    pathname.startsWith('/dashboard/ai') ||
    pathname.startsWith('/dashboard/kyc-pendente') ||
    pathname.startsWith('/dashboard/mapa') ||
    (pathname.startsWith('/dashboard/chat') && chatThreadActive)
  );
}

const PILL_CLASS =
  'bottom-nav-dock fixed bottom-0 left-0 z-50 h-auto w-full overflow-visible rounded-none border-t border-white/[0.06] px-5 pt-3 pb-[max(env(safe-area-inset-bottom),_16px)]';

const DOCK_PAD = {
  bottom: '0px',
  marginBottom: '0px',
} as const;

const NavIcon = memo(function NavIcon({
  icon: Icon,
  className,
}: {
  icon: typeof Home;
  className?: string;
}) {
  return <Icon className={cn('h-[18px] w-[18px]', className)} strokeWidth={1.75} aria-hidden />;
});

function BottomNavInner({ hidden = false }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = useAuthStore((s) => s.role);
  const storeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef(0);

  const playPremiumFeedback = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      const now = Date.now();
      if (now - lastPlayedRef.current < 120) return;
      lastPlayedRef.current = now;

      window.navigator?.vibrate?.(5);

      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContextCtor();
      }
      const ctx = audioCtxRef.current;

      const play = () => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.02, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      };

      if (ctx.state === 'suspended') {
        void ctx.resume().then(play).catch(() => {});
        return;
      }
      play();
    } catch {
      console.log('Feedback suppressed');
    }
  }, []);
  // Fase 25.2: enquanto qualquer canvas de boot estiver ativo (splash, hidratação
  // do Clerk ou fallback de rota unificado), a dock se oculta. A revelação
  // pós-splash nunca expõe ícones de navegação sobre o canvas escuro. Como a dock
  // é `fixed`, ocultá-la não desloca o layout do conteúdo.
  const bootCanvasActive = useBootCanvasActive();

  // HYDRATION-SAFE: a thread imersiva é derivada de forma síncrona da própria
  // URL — idêntica no SSR e no primeiro frame do cliente. A dock some no mesmo
  // instante em que o conteúdo se expande, sem reconciliação pós-hidratação.
  const chatThreadActive =
    pathname.startsWith('/dashboard/chat') &&
    Boolean(searchParams.get('artistId') || searchParams.get('tatuadorId'));
  const conceal = hidden || bootCanvasActive || shouldHideNav(pathname, chatThreadActive);
  const homePath = dashboardPathForRole(role);
  // Aba ativa derivada da ROTA via hook SSR-safe (pathname → query → store como
  // piso). Idêntica no servidor e no 1º frame do cliente, sem store no caminho
  // crítico da geometria.
  const activeTab = useRouteTab(storeTab);

  // Prefetch em background das abas globais. No mobile não existe "hover", então
  // o Next só pré-carrega o RSC das rotas (`/dashboard/chat`, `/dashboard/perfil`)
  // quando o link entra no viewport — aquecer aqui garante que o payload já
  // esteja em cache antes do toque e a troca de aba seja instantânea (sem tela
  // vazia / layout shift).
  useEffect(() => {
    const warm = [
      '/dashboard/chat',
      '/dashboard/perfil',
      '/dashboard/galeria',
      '/dashboard/inspiracoes',
      '/dashboard/pagamentos',
      '/dashboard/agenda',
      `${homePath}?tab=portfolio`,
      `${homePath}?tab=agendar`,
    ];
    warm.forEach((href) => router.prefetch(href));
  }, [router, homePath]);

  const navRef = useRef<HTMLElement>(null);
  const scrollIdleRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const applyDockMetrics = () => {
      const height = Math.ceil(nav.getBoundingClientRect().height);
      if (height <= 0) return;
      const root = document.documentElement;
      root.style.setProperty('--dock-height', `${height}px`);
      root.style.setProperty('--dock-clearance', `calc(${height}px + 0.5rem)`);
    };

    applyDockMetrics();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(applyDockMetrics) : null;
    resizeObserver?.observe(nav);

    window.addEventListener('resize', applyDockMetrics, { passive: true });
    window.addEventListener('orientationchange', applyDockMetrics, { passive: true });
    window.visualViewport?.addEventListener('resize', applyDockMetrics, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', applyDockMetrics);
      window.removeEventListener('orientationchange', applyDockMetrics);
      window.visualViewport?.removeEventListener('resize', applyDockMetrics);
    };
  }, [conceal, pathname]);

  useEffect(() => {
    const root = document.querySelector('[data-viewport-root]');
    const scrollers = [
      root,
      ...Array.from(document.querySelectorAll('.screen-page, .nav-safe-pad, [data-scroll-root]')),
    ].filter((el): el is Element => Boolean(el));

    const markScrolling = () => {
      navRef.current?.classList.add('is-scrolling');
      if (scrollIdleRef.current) window.clearTimeout(scrollIdleRef.current);
      scrollIdleRef.current = window.setTimeout(() => {
        navRef.current?.classList.remove('is-scrolling');
      }, 180);
    };

    scrollers.forEach((el) => el.addEventListener('scroll', markScrolling, { passive: true }));
    window.addEventListener('scroll', markScrolling, { passive: true });

    return () => {
      scrollers.forEach((el) => el.removeEventListener('scroll', markScrolling));
      window.removeEventListener('scroll', markScrolling);
      if (scrollIdleRef.current) window.clearTimeout(scrollIdleRef.current);
    };
  }, [pathname]);

  const handleSelect = useCallback(
    (tab: AppTab, href: string) => {
      triggerHaptic('light');
      // Aquece a rota de destino no mesmo tick do toque. Para as abas que
      // alternam estado na MESMA rota (Início/Agenda via `?tab=`), envolvemos a
      // atualização do store em `startTransition`: o React mantém o frame atual
      // pintado até que o próximo esteja pronto, eliminando o flash de estado
      // vazio durante a recomposição.
      if (href.startsWith('/dashboard/chat') || href.startsWith('/dashboard/perfil')) {
        router.prefetch(href);
      }
      // "Hard clean-up" ao sair de uma sub-rota sem casco: purga foco, zoom e
      // transforms residuais imediatamente e agenda uma segunda passada após o
      // iOS restaurar a escala de forma assíncrona, evitando que o sub-route
      // estados vazem para o container raiz da aba de destino.
      if (isShellBypassedRoute(pathname, chatThreadActive)) {
        resetViewportScale({ forceBlur: true });
        forceViewportRecalibration();
        window.requestAnimationFrame(() => {
          resetViewportScale({ forceBlur: true });
          forceViewportRecalibration();
        });
      }
      if (tab !== 'perfil') {
        startTransition(() => {
          setActiveTab(tab);
        });
      }
    },
    [chatThreadActive, pathname, router, setActiveTab, triggerHaptic]
  );

  return (
    <nav
      ref={navRef}
      className={cn(PILL_CLASS, conceal && 'pointer-events-none invisible')}
      style={DOCK_PAD}
      aria-label={t('nav.home')}
      aria-hidden={conceal}
    >
      <ul className="relative z-10 mx-auto flex w-full max-w-[400px] items-center justify-between">
        {ITEMS.map((item) => {
          const active = activeTab === item.tab;
          const href =
            item.tab === 'perfil'
              ? '/dashboard/perfil'
              : item.tab === 'chat'
                ? '/dashboard/chat'
                : item.tab === 'agendar'
                  ? '/dashboard/agenda'
                  : `${homePath}?tab=${item.tab}`;
          return (
            <li key={item.tab} className="flex">
              <Link
                href={href}
                prefetch
                scroll={false}
                onPointerDown={playPremiumFeedback}
                onClick={() => {
                  playPremiumFeedback();
                  handleSelect(item.tab, href);
                }}
                className={cn(
                  'flex min-h-0 min-w-11 flex-col items-center justify-center gap-px px-3 py-1 rounded-2xl',
                  'text-[10px] font-medium leading-none tracking-tight',
                  'transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-90',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70',
                  active
                    ? 'bg-orange-500/28 text-orange-400'
                    : 'bg-transparent text-zinc-500'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span className="flex items-center justify-center">
                  <NavIcon
                    icon={item.icon}
                    className={active ? 'drop-shadow-[0_0_10px_rgba(249,115,22,0.85)]' : undefined}
                  />
                </span>
                <span>{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export const BottomNav = memo(BottomNavInner);

/**
 * Placeholder estático da dock — fallback de Suspense do Root Layout.
 *
 * `useSearchParams` suspende a `BottomNav` durante a renderização no servidor
 * (exigência do App Router). Com `fallback={null}`, o HTML inicial não reservava
 * a dock e ela "pipocava" no primeiro frame após a hidratação. Este placeholder
 * desenha a MESMA caixa de vidro (geometria, ícones e rótulos idênticos) usando
 * apenas o `pathname` — que é síncrono e nunca suspende — e se auto-oculta fora
 * do casco autenticado, para jamais surgir na landing (`/`) nem em rotas
 * imersivas. Não é interativo: é substituído pela dock real assim que o
 * boundary resolve.
 */
function BottomNavFallbackInner() {
  const pathname = usePathname();
  const { t } = useI18n();

  if (shouldHideNav(pathname, false)) return null;

  return (
    <nav aria-hidden className={PILL_CLASS} style={DOCK_PAD}>
      <ul className="relative z-10 mx-auto flex w-full max-w-[400px] items-center justify-between">
        {ITEMS.map((item) => (
          <li key={item.tab} className="flex">
            <span className="flex min-h-0 min-w-11 flex-col items-center justify-center gap-px px-3 py-1 rounded-2xl bg-transparent text-[10px] font-medium leading-none tracking-tight text-zinc-500">
              <span className="flex items-center justify-center">
                <NavIcon icon={item.icon} />
              </span>
              <span>{t(item.labelKey)}</span>
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export const BottomNavFallback = memo(BottomNavFallbackInner);
