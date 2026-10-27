'use client';

import { memo, startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { animate, motion, useMotionValue } from 'framer-motion';
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
  'bottom-nav-dock fixed inset-x-0 z-50 mx-auto flex h-12 w-[94%] max-w-sm items-center overflow-hidden rounded-full border border-white/10 bg-[#121212]/90 px-2 py-1 shadow-2xl backdrop-blur-xl select-none touch-none';

const DRAG_THRESHOLD_PX = 6;

function hrefForTab(tab: AppTab, homePath: string): string {
  if (tab === 'perfil') return '/dashboard/perfil';
  if (tab === 'chat') return '/dashboard/chat';
  if (tab === 'agendar') return '/dashboard/agenda';
  return `${homePath}?tab=${tab}`;
}

function indexFromPointer(list: HTMLElement, clientX: number): number {
  const rect = list.getBoundingClientRect();
  if (rect.width <= 0) return 0;
  const x = Math.min(Math.max(clientX - rect.left, 0), rect.width - 0.001);
  return Math.min(ITEMS.length - 1, Math.floor((x / rect.width) * ITEMS.length));
}

const NavIcon = memo(function NavIcon({
  icon: Icon,
  className,
}: {
  icon: typeof Home;
  className?: string;
}) {
  return <Icon className={cn('h-[18px] w-[18px]', className)} strokeWidth={1.75} aria-hidden />;
});

const DOCK_PILL_TRANSITION = { type: 'spring' as const, stiffness: 420, damping: 32 };

function dockItemClass(active: boolean) {
  return cn(
    'relative flex h-full min-h-0 min-w-0 w-full items-center justify-center overflow-hidden rounded-full select-none [-webkit-touch-callout:none]',
    active ? 'flex-row gap-1 px-2 py-1' : 'px-1 py-0.5'
  );
}

function DockGlyph({
  item,
  active,
  label,
  staticPill = false,
}: {
  item: (typeof ITEMS)[number];
  active: boolean;
  label: string;
  staticPill?: boolean;
}) {
  return (
    <>
      {active && staticPill ? (
        <span className="absolute inset-0 z-0 rounded-full bg-[#FF6600]" />
      ) : null}
      <span
        className={cn(
          'relative z-10 flex shrink-0 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          active && 'scale-105'
        )}
      >
        <NavIcon icon={item.icon} className={active ? 'text-white' : 'text-zinc-500'} />
      </span>
      <span
        className={cn(
          'relative z-10 grid min-w-0 transition-[grid-template-columns,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          active ? 'grid-cols-[1fr] opacity-100' : 'grid-cols-[0fr] opacity-0'
        )}
        aria-hidden={!active}
      >
        <span className="min-w-0 overflow-hidden whitespace-nowrap text-[10px] font-semibold leading-none tracking-tight text-[#121212]">
          {label}
        </span>
      </span>
    </>
  );
}

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

  const unlockTick = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContextCtor();
      }
      if (audioCtxRef.current.state === 'suspended') {
        void audioCtxRef.current.resume().catch(() => {});
      }
    } catch {
      console.log('Feedback suppressed');
    }
  }, []);

  const playTick = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      const now = Date.now();
      if (now - lastPlayedRef.current < 70) return;
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
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.022);
        gainNode.gain.setValueAtTime(0.018, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + 0.024);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.028);
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
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const scrollIdleRef = useRef<number | null>(null);
  const pillX = useMotionValue(0);
  const pillW = useMotionValue(0);
  const draggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const originXRef = useRef(0);
  const liveIndexRef = useRef(0);
  const suppressClickRef = useRef(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const routeIndex = Math.max(0, ITEMS.findIndex((item) => item.tab === activeTab));
  const visualIndex = dragIndex ?? routeIndex;

  const measurePill = useCallback((index: number, instant = false) => {
    const item = itemRefs.current[index];
    const list = listRef.current;
    if (!item || !list) return;
    const itemRect = item.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    const nextX = itemRect.left - listRect.left;
    const nextW = itemRect.width;
    if (instant) {
      pillX.set(nextX);
      pillW.set(nextW);
      return;
    }
    void animate(pillX, nextX, DOCK_PILL_TRANSITION);
    void animate(pillW, nextW, DOCK_PILL_TRANSITION);
  }, [pillW, pillX]);

  const followPointer = useCallback((clientX: number) => {
    const list = listRef.current;
    if (!list) return;
    const nextIndex = indexFromPointer(list, clientX);
    const item = itemRefs.current[nextIndex];
    if (!item) return;
    const itemRect = item.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    const targetX = itemRect.left - listRect.left;
    pillX.set(targetX);
    pillW.set(itemRect.width);
    if (liveIndexRef.current !== nextIndex) {
      liveIndexRef.current = nextIndex;
      triggerHaptic('light');
      playTick();
    }
    setDragIndex(nextIndex);
  }, [pillW, pillX, playTick, triggerHaptic]);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const applyDockMetrics = () => {
      const rect = nav.getBoundingClientRect();
      const height = Math.ceil(rect.height);
      if (height <= 0) return;
      const inset = Math.max(0, Math.ceil(window.innerHeight - rect.bottom));
      const root = document.documentElement;
      root.style.setProperty('--dock-height', `${height}px`);
      root.style.setProperty('--dock-clearance', `${height + inset + 8}px`);
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

  const pillMountedRef = useRef(false);
  useLayoutEffect(() => {
    if (draggingRef.current) return;
    measurePill(visualIndex, !pillMountedRef.current);
    pillMountedRef.current = true;
  }, [conceal, measurePill, visualIndex]);

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
      playTick();
      if (href.startsWith('/dashboard/chat') || href.startsWith('/dashboard/perfil')) {
        router.prefetch(href);
      }
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
    [chatThreadActive, pathname, playTick, router, setActiveTab, triggerHaptic]
  );

  const commitTab = useCallback(
    (index: number) => {
      const item = ITEMS[index];
      if (!item) return;
      const href = hrefForTab(item.tab, homePath);
      handleSelect(item.tab, href);
      router.push(href, { scroll: false });
    },
    [handleSelect, homePath, router]
  );

  const onDockPointerDown = useCallback(
    (event: React.PointerEvent<HTMLUListElement>) => {
      if (event.button !== 0) return;
      unlockTick();
      draggingRef.current = true;
      dragMovedRef.current = false;
      suppressClickRef.current = false;
      pointerIdRef.current = event.pointerId;
      originXRef.current = event.clientX;
      liveIndexRef.current = indexFromPointer(event.currentTarget, event.clientX);
      setDragIndex(liveIndexRef.current);
      measurePill(liveIndexRef.current, true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [measurePill, unlockTick]
  );

  const onDockPointerMove = useCallback(
    (event: React.PointerEvent<HTMLUListElement>) => {
      if (!draggingRef.current || pointerIdRef.current !== event.pointerId) return;
      if (!dragMovedRef.current && Math.abs(event.clientX - originXRef.current) < DRAG_THRESHOLD_PX) {
        return;
      }
      dragMovedRef.current = true;
      suppressClickRef.current = true;
      followPointer(event.clientX);
    },
    [followPointer]
  );

  const endDockPointer = useCallback(
    (event: React.PointerEvent<HTMLUListElement>) => {
      if (!draggingRef.current || pointerIdRef.current !== event.pointerId) return;
      draggingRef.current = false;
      pointerIdRef.current = null;
      const nextIndex = liveIndexRef.current;
      setDragIndex(null);
      measurePill(nextIndex);
      if (dragMovedRef.current && nextIndex !== routeIndex) {
        commitTab(nextIndex);
      }
      dragMovedRef.current = false;
    },
    [commitTab, measurePill, routeIndex]
  );

  return (
    <nav
      ref={navRef}
      className={cn(PILL_CLASS, conceal && 'pointer-events-none invisible')}
      aria-label={t('nav.home')}
      aria-hidden={conceal}
    >
      <ul
        ref={listRef}
        className="relative z-10 flex h-full w-full min-w-0 items-center gap-1"
        onPointerDown={onDockPointerDown}
        onPointerMove={onDockPointerMove}
        onPointerUp={endDockPointer}
        onPointerCancel={endDockPointer}
      >
        <motion.span
          aria-hidden
          className="pointer-events-none absolute top-0 bottom-0 z-0 rounded-full bg-[#FF6600]"
          style={{ x: pillX, width: pillW }}
        />
        {ITEMS.map((item, index) => {
          const active = visualIndex === index;
          const href = hrefForTab(item.tab, homePath);
          return (
            <li
              key={item.tab}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              className="relative z-10 flex min-w-0 flex-1"
            >
              <Link
                href={href}
                prefetch
                scroll={false}
                draggable={false}
                onContextMenu={(event) => event.preventDefault()}
                onClick={(event) => {
                  if (suppressClickRef.current) {
                    event.preventDefault();
                    suppressClickRef.current = false;
                    return;
                  }
                  unlockTick();
                  handleSelect(item.tab, href);
                }}
                className={cn(
                  dockItemClass(active),
                  'transition-[padding,gap] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70'
                )}
                aria-current={active ? 'page' : undefined}
                aria-label={t(item.labelKey)}
              >
                <DockGlyph item={item} active={active} label={t(item.labelKey)} />
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
    <nav aria-hidden className={PILL_CLASS}>
      <ul className="relative z-10 flex h-full w-full min-w-0 items-center gap-1">
        {ITEMS.map((item, index) => {
          const active = index === 0;
          return (
            <li key={item.tab} className="flex min-w-0 flex-1">
              <span className={dockItemClass(active)}>
                <DockGlyph item={item} active={active} label={t(item.labelKey)} staticPill />
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export const BottomNavFallback = memo(BottomNavFallbackInner);
