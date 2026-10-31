'use client';

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { animate, motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { CalendarDays, Home, MessageCircle, UserRound } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useI18n } from '@/hooks/use-i18n';
import { type AppTab } from '@/hooks/use-ui-store';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';
import { useRouteTab } from '@/hooks/use-route-tab';
import { isKeepAliveHostPath } from '@/lib/utils/route-tab';
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

function usesDesktopHeaderTabs(
  pathname: string,
  chatThreadActive: boolean,
  activeTab: AppTab
): boolean {
  if (shouldHideNav(pathname, chatThreadActive)) return false;
  if (pathname.startsWith('/dashboard/chat')) return false;
  if (pathname.startsWith('/dashboard/artista/')) return false;
  if (/^\/dashboard\/artistas\/.+/.test(pathname)) return false;
  if (pathname.startsWith('/dashboard/agenda')) return false;
  if (
    pathname.startsWith('/dashboard/galeria') ||
    pathname.startsWith('/dashboard/inspiracoes') ||
    pathname.startsWith('/dashboard/salvos')
  ) {
    return false;
  }
  if (pathname.startsWith('/dashboard/perfil')) return false;
  if (
    isKeepAliveHostPath(pathname) &&
    (activeTab === 'chat' || activeTab === 'agendar' || activeTab === 'perfil')
  ) {
    return false;
  }
  return true;
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
  'bottom-nav-dock fixed inset-x-0 z-50 mx-auto flex h-12 w-[94%] max-w-sm items-center overflow-hidden rounded-full border border-white/10 border-t border-t-white/10 bg-black/40 px-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),_0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl select-none touch-none';

const DRAG_THRESHOLD_PX = 6;
const DRAG_HOLD_MS = 150;
const DOCK_TRACK_SPRING = { stiffness: 1400, damping: 48, mass: 0.16, restDelta: 0.08 };
const DOCK_PILL_SPRING = { stiffness: 820, damping: 38, mass: 0.22, restDelta: 0.08 };
const DOCK_PLUMP_SCALE = 1.08;
const DOCK_PLUMP_SPRING = { stiffness: 640, damping: 28, mass: 0.22, restDelta: 0.01 };
const TAP_LAYOUT_TRANSITION = { type: 'spring' as const, stiffness: 500, damping: 30 };

function hrefForTab(tab: AppTab, homePath: string): string {
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
        <span className="absolute inset-0 z-0 rounded-full bg-white/10" />
      ) : null}
      {active ? (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0.5 left-1/2 z-0 h-1.5 w-4 -translate-x-1/2 rounded-full bg-white/20 blur-md"
        />
      ) : null}
      <span
        className={cn(
          'relative z-10 flex shrink-0 items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          active && 'scale-105'
        )}
      >
        <NavIcon
          icon={item.icon}
          className={
            active
              ? 'text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.8)]'
              : 'text-white/40'
          }
        />
      </span>
      <span
        className={cn(
          'relative z-10 grid min-w-0 transition-[grid-template-columns,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          active ? 'grid-cols-[1fr] opacity-100' : 'grid-cols-[0fr] opacity-0'
        )}
        aria-hidden={!active}
      >
        <span
          className={cn(
            'min-w-0 overflow-hidden whitespace-nowrap text-[10px] font-semibold leading-none tracking-tight text-white',
            active && 'drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.8)]'
          )}
        >
          {label}
        </span>
      </span>
    </>
  );
}

function DockGlyphLive({
  item,
  active,
  label,
  hoverIndex,
  plumpScale,
  index,
}: {
  item: (typeof ITEMS)[number];
  active: boolean;
  label: string;
  hoverIndex: MotionValue<number>;
  plumpScale: MotionValue<number>;
  index: number;
}) {
  const proximity = useTransform(hoverIndex, (value) => {
    const distance = Math.abs(value - index);
    return distance >= 1 ? 0 : 1 - distance;
  });
  const scale = useTransform([proximity, plumpScale], (values) => {
    const near = values[0] as number;
    const plump = values[1] as number;
    return 1 + near * 0.05 + near * (plump - 1);
  });
  const iconColor = useTransform(proximity, (near) => {
    const r = Math.round(163 + (255 - 163) * near);
    const g = Math.round(163 + (255 - 163) * near);
    const b = Math.round(163 + (255 - 163) * near);
    return `rgb(${r} ${g} ${b})`;
  });
  const iconFilter = useTransform(proximity, (near) =>
    near >= 0.5 ? 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.8))' : 'none'
  );
  const labelProgress = useTransform(hoverIndex, (value) => {
    const distance = Math.abs(value - index);
    if (distance <= 0.32) return 1;
    if (distance >= 0.68) return 0;
    return 1 - (distance - 0.32) / 0.36;
  });
  const labelColumns = useTransform(labelProgress, (progress) => `${Math.max(0, progress)}fr`);

  return (
    <>
      <motion.span
        className="relative z-10 flex shrink-0 items-center justify-center transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]"
        style={{ scale, color: iconColor, filter: iconFilter }}
      >
        <NavIcon icon={item.icon} className="text-current" />
      </motion.span>
      <motion.span
        className="relative z-10 grid min-w-0 transform-gpu will-change-transform [backface-visibility:hidden]"
        style={{ gridTemplateColumns: labelColumns, opacity: labelProgress }}
        aria-hidden={!active}
      >
        <span className="min-w-0 overflow-hidden whitespace-nowrap text-[10px] font-semibold leading-none tracking-tight text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.8)]">
          {label}
        </span>
      </motion.span>
    </>
  );
}

function BottomNavInner({ hidden = false }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = useAuthStore((s) => s.role);
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const [isPending, startTransition] = useTransition();
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
  // Active tab is derived exclusively from the live router URL (pathname, then
  // ?tab=). Visual highlight never reads the UI store, so the titanium pill cannot
  // lead the actual route.
  const activeTab = useRouteTab();

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
  const routeIndex = Math.max(0, ITEMS.findIndex((item) => item.tab === activeTab));
  const pillXRaw = useMotionValue(0);
  const pillWRaw = useMotionValue(0);
  const hoverIndexRaw = useMotionValue(routeIndex);
  const pillX = useSpring(pillXRaw, DOCK_TRACK_SPRING);
  const pillW = useSpring(pillWRaw, DOCK_TRACK_SPRING);
  const hoverIndex = useSpring(hoverIndexRaw, DOCK_PILL_SPRING);
  const grabScale = useMotionValue(1);
  const pillScale = useSpring(grabScale, DOCK_PLUMP_SPRING);
  const draggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const pressActiveRef = useRef(false);
  const pressTimerRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const originXRef = useRef(0);
  const lastClientXRef = useRef(0);
  const liveIndexRef = useRef(routeIndex);
  const suppressClickRef = useRef(false);
  const hapticOnPressRef = useRef(false);
  const tapAnimsRef = useRef<Array<{ stop: () => void }>>([]);
  const slotsRef = useRef<Array<{ x: number; w: number }>>([]);
  const listLeftRef = useRef(0);
  const listWidthRef = useRef(0);

  const stopTapAnims = useCallback(() => {
    tapAnimsRef.current.forEach((anim) => anim.stop());
    tapAnimsRef.current = [];
  }, []);

  const cacheDockSlots = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const listRect = list.getBoundingClientRect();
    listLeftRef.current = listRect.left;
    listWidthRef.current = listRect.width;
    slotsRef.current = itemRefs.current.map((item) => {
      if (!item) return { x: 0, w: 0 };
      const itemRect = item.getBoundingClientRect();
      return { x: itemRect.left - listRect.left, w: itemRect.width };
    });
  }, []);

  const snapTrack = useCallback((x: number, w: number, index: number) => {
    pillX.jump(x);
    pillW.jump(w);
    hoverIndex.jump(index);
    pillXRaw.set(x);
    pillWRaw.set(w);
    hoverIndexRaw.set(index);
  }, [hoverIndex, hoverIndexRaw, pillW, pillWRaw, pillX, pillXRaw]);

  const springTrack = useCallback((x: number, w: number, index: number) => {
    pillXRaw.set(x);
    pillWRaw.set(w);
    hoverIndexRaw.set(index);
  }, [hoverIndexRaw, pillWRaw, pillXRaw]);

  const tapTrack = useCallback((x: number, w: number, index: number) => {
    stopTapAnims();
    const fromX = pillX.get();
    const fromW = pillW.get();
    const fromIndex = hoverIndex.get();
    pillXRaw.jump(fromX);
    pillWRaw.jump(fromW);
    hoverIndexRaw.jump(fromIndex);
    const anims = [
      animate(pillX, x, TAP_LAYOUT_TRANSITION),
      animate(pillW, w, TAP_LAYOUT_TRANSITION),
      animate(hoverIndex, index, TAP_LAYOUT_TRANSITION),
    ];
    tapAnimsRef.current = anims;
    void Promise.all(anims.map((anim) => anim.then(() => undefined))).then(() => {
      if (draggingRef.current) return;
      pillXRaw.jump(x);
      pillWRaw.jump(w);
      hoverIndexRaw.jump(index);
    });
  }, [hoverIndex, hoverIndexRaw, pillW, pillWRaw, pillX, pillXRaw, stopTapAnims]);

  const measurePill = useCallback((index: number, instant = false, tap = false) => {
    const apply = (nextX: number, nextW: number, nextIndex: number) => {
      if (instant) {
        snapTrack(nextX, nextW, nextIndex);
        return;
      }
      if (tap) {
        tapTrack(nextX, nextW, nextIndex);
        return;
      }
      springTrack(nextX, nextW, nextIndex);
    };
    const slot = slotsRef.current[index];
    if (!slot || slot.w <= 0) {
      const item = itemRefs.current[index];
      const list = listRef.current;
      if (!item || !list) {
        if (instant) hoverIndex.jump(index);
        hoverIndexRaw.set(index);
        return;
      }
      const itemRect = item.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      apply(itemRect.left - listRect.left, itemRect.width, index);
      return;
    }
    apply(slot.x, slot.w, index);
  }, [hoverIndex, hoverIndexRaw, snapTrack, springTrack, tapTrack]);

  const followPointer = useCallback((clientX: number) => {
    if (listWidthRef.current <= 0) cacheDockSlots();
    const listWidth = listWidthRef.current;
    if (listWidth <= 0) return;
    const x = Math.min(Math.max(clientX - listLeftRef.current, 0), listWidth - 0.001);
    const continuous = (x / listWidth) * ITEMS.length;
    const nextIndex = Math.min(ITEMS.length - 1, Math.floor(continuous));
    hoverIndexRaw.set(Math.min(ITEMS.length - 1, Math.max(0, continuous - 0.5)));
    const slot = slotsRef.current[nextIndex];
    if (slot && slot.w > 0) {
      const nextX = Math.min(Math.max(x - slot.w / 2, 0), listWidth - slot.w);
      pillXRaw.set(nextX);
      pillWRaw.set(slot.w);
    }
    if (liveIndexRef.current !== nextIndex) {
      liveIndexRef.current = nextIndex;
    }
  }, [cacheDockSlots, hoverIndexRaw, pillWRaw, pillXRaw]);

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
      if (!draggingRef.current) cacheDockSlots();
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
  }, [cacheDockSlots, conceal, pathname]);

  const pillMountedRef = useRef(false);
  useLayoutEffect(() => {
    cacheDockSlots();
    if (draggingRef.current) return;
    liveIndexRef.current = routeIndex;
    const instant = !pillMountedRef.current;
    pillMountedRef.current = true;
    measurePill(routeIndex, instant);
    if (!instant) return;
    let innerFrame = 0;
    const outerFrame = window.requestAnimationFrame(() => {
      cacheDockSlots();
      if (draggingRef.current) return;
      measurePill(routeIndex, true);
      innerFrame = window.requestAnimationFrame(() => {
        cacheDockSlots();
        if (draggingRef.current) return;
        measurePill(routeIndex, true);
      });
    });
    return () => {
      window.cancelAnimationFrame(outerFrame);
      window.cancelAnimationFrame(innerFrame);
    };
  }, [cacheDockSlots, conceal, measurePill, routeIndex]);

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

  useEffect(() => {
    return () => {
      if (pressTimerRef.current !== null) {
        window.clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
      tapAnimsRef.current.forEach((anim) => anim.stop());
      tapAnimsRef.current = [];
    };
  }, []);

  const handleSelect = useCallback(
    (href: string, haptic = true) => {
      if (haptic) triggerHaptic('light');
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
    },
    [chatThreadActive, pathname, router, triggerHaptic]
  );

  const commitTab = useCallback(
    (index: number, haptic = true) => {
      if (isPending) return;
      const item = ITEMS[index];
      if (!item) return;
      if (index === routeIndex) return;
      const href = hrefForTab(item.tab, homePath);
      handleSelect(href, haptic);
      startTransition(() => {
        if (isKeepAliveHostPath(pathname)) {
          router.replace(href, { scroll: false });
          return;
        }
        router.push(href, { scroll: false });
      });
    },
    [handleSelect, homePath, isPending, pathname, routeIndex, router, startTransition]
  );

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current === null) return;
    window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = null;
  }, []);

  const engageDockDrag = useCallback(() => {
    if (draggingRef.current || !pressActiveRef.current) return;
    stopTapAnims();
    draggingRef.current = true;
    grabScale.set(DOCK_PLUMP_SCALE);
    pillXRaw.set(pillX.get());
    pillWRaw.set(pillW.get());
    hoverIndexRaw.set(hoverIndex.get());
  }, [grabScale, hoverIndex, hoverIndexRaw, pillW, pillWRaw, pillX, pillXRaw, stopTapAnims]);

  const onDockPointerDown = useCallback(
    (event: React.PointerEvent<HTMLUListElement>) => {
      if (event.button !== 0) return;
      if (isPending) return;
      cacheDockSlots();
      clearPressTimer();
      pressActiveRef.current = true;
      draggingRef.current = false;
      dragMovedRef.current = false;
      suppressClickRef.current = false;
      pointerIdRef.current = event.pointerId;
      originXRef.current = event.clientX;
      lastClientXRef.current = event.clientX;
      const startIndex = indexFromPointer(event.currentTarget, event.clientX);
      liveIndexRef.current = startIndex;
      event.currentTarget.setPointerCapture(event.pointerId);
      pressTimerRef.current = window.setTimeout(() => {
        pressTimerRef.current = null;
        engageDockDrag();
        followPointer(lastClientXRef.current);
      }, DRAG_HOLD_MS);
    },
      [cacheDockSlots, clearPressTimer, engageDockDrag, followPointer, isPending]
    );

  const onDockPointerMove = useCallback(
    (event: React.PointerEvent<HTMLUListElement>) => {
      if (!pressActiveRef.current || pointerIdRef.current !== event.pointerId) return;
      lastClientXRef.current = event.clientX;
      const travel = Math.abs(event.clientX - originXRef.current);
      if (!draggingRef.current) {
        if (travel < DRAG_THRESHOLD_PX) return;
        clearPressTimer();
        engageDockDrag();
      }
      dragMovedRef.current = true;
      suppressClickRef.current = true;
      followPointer(event.clientX);
    },
    [clearPressTimer, engageDockDrag, followPointer]
  );

  const onDockPointerEnd = useCallback(
    (event: React.PointerEvent<HTMLUListElement>) => {
      if (!pressActiveRef.current || pointerIdRef.current !== event.pointerId) return;
      const wasDragging = draggingRef.current;
      const didMove = dragMovedRef.current;
      clearPressTimer();
      pressActiveRef.current = false;
      draggingRef.current = false;
      grabScale.set(1);
      pointerIdRef.current = null;
      dragMovedRef.current = false;
      const nextIndex = liveIndexRef.current;
      if (!wasDragging) {
        suppressClickRef.current = true;
        hapticOnPressRef.current = false;
        commitTab(nextIndex, false);
        return;
      }
      if (didMove && nextIndex !== routeIndex) {
        commitTab(nextIndex);
      } else {
        measurePill(routeIndex);
      }
    },
    [clearPressTimer, commitTab, grabScale, measurePill, routeIndex]
  );

  const desktopHandoff = usesDesktopHeaderTabs(pathname, chatThreadActive, activeTab);

  return (
    <nav
      ref={navRef}
      className={cn(
        PILL_CLASS,
        conceal && 'pointer-events-none invisible',
        desktopHandoff && 'lg:hidden'
      )}
      aria-label={t('nav.home')}
      aria-hidden={conceal}
    >
      <ul
        ref={listRef}
        className="relative z-10 flex h-full w-full min-w-0 touch-none items-center gap-1"
        style={{ touchAction: 'none' }}
        onPointerDown={onDockPointerDown}
        onPointerMove={onDockPointerMove}
        onPointerUp={onDockPointerEnd}
        onPointerCancel={onDockPointerEnd}
        onLostPointerCapture={onDockPointerEnd}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 z-0 h-full rounded-full bg-white/10 transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]"
          style={{ x: pillX, width: pillW, scale: pillScale }}
        >
          <span className="absolute bottom-0.5 left-1/2 h-1.5 w-4 -translate-x-1/2 rounded-full bg-white/20 blur-md" />
        </motion.div>
        {ITEMS.map((item, index) => {
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
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  if (isPending) {
                    event.preventDefault();
                    return;
                  }
                  if (routeIndex === index) return;
                  hapticOnPressRef.current = true;
                  triggerHaptic('light');
                }}
                onClick={(event) => {
                  event.preventDefault();
                  if (isPending) return;
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    hapticOnPressRef.current = false;
                    return;
                  }
                  liveIndexRef.current = index;
                  const skipHaptic = hapticOnPressRef.current;
                  hapticOnPressRef.current = false;
                  commitTab(index, !skipHaptic);
                }}
                className={cn(
                  dockItemClass(routeIndex === index),
                  'touch-manipulation [touch-action:manipulation] transform-gpu will-change-transform transition-[padding,gap] duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70',
                  isPending && 'pointer-events-none'
                )}
                aria-current={routeIndex === index ? 'page' : undefined}
                aria-label={t(item.labelKey)}
              >
                <DockGlyphLive
                  item={item}
                  active={routeIndex === index}
                  label={t(item.labelKey)}
                  hoverIndex={hoverIndex}
                  plumpScale={pillScale}
                  index={index}
                />
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
