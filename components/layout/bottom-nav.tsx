'use client';

import { memo, startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { animate, motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
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
const DOCK_PILL_SPRING = { type: 'spring' as const, stiffness: 620, damping: 42, mass: 0.38 };
const DOCK_PLUMP_SCALE = 1.08;
const DOCK_PLUMP_SPRING = { stiffness: 480, damping: 26, mass: 0.28 };
const DOCK_TICK_DURATION = 0.018;

type DockAudioEngine = {
  ctx: AudioContext;
  master: GainNode;
  noiseBuffer: AudioBuffer;
};

function getAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

function createDockNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * DOCK_TICK_DURATION));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const decay = 1 - i / length;
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  return buffer;
}

function createDockAudioEngine(Ctor: typeof AudioContext): DockAudioEngine {
  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 1;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -22;
  compressor.knee.value = 6;
  compressor.ratio.value = 3.2;
  compressor.attack.value = 0.001;
  compressor.release.value = 0.05;
  master.connect(compressor);
  compressor.connect(ctx.destination);
  return { ctx, master, noiseBuffer: createDockNoiseBuffer(ctx) };
}

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

const DOCK_PILL_TRANSITION = DOCK_PILL_SPRING;

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
  const scale = useTransform([hoverIndex, plumpScale], (values) => {
    const value = values[0] as number;
    const plump = values[1] as number;
    const distance = Math.abs(value - index);
    const proximity = distance >= 1 ? 0 : 1 - distance;
    return 1 + proximity * 0.05 + proximity * (plump - 1);
  });
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
        className="relative z-10 flex shrink-0 items-center justify-center will-change-transform"
        style={{ scale }}
      >
        <NavIcon icon={item.icon} className={active ? 'text-white' : 'text-zinc-500'} />
      </motion.span>
      <motion.span
        className="relative z-10 grid min-w-0"
        style={{ gridTemplateColumns: labelColumns, opacity: labelProgress }}
        aria-hidden={!active}
      >
        <span className="min-w-0 overflow-hidden whitespace-nowrap text-[10px] font-semibold leading-none tracking-tight text-[#121212]">
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
  const storeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const audioEngineRef = useRef<DockAudioEngine | null>(null);
  const tickIndexRef = useRef(-1);
  const audioPrimedRef = useRef(false);

  const ensureDockAudio = useCallback((): DockAudioEngine | null => {
    try {
      const AudioContextCtor = getAudioContextCtor();
      if (!AudioContextCtor) return null;
      let engine = audioEngineRef.current;
      if (!engine || engine.ctx.state === 'closed') {
        engine = createDockAudioEngine(AudioContextCtor);
        audioEngineRef.current = engine;
        audioPrimedRef.current = false;
      }
      return engine;
    } catch {
      console.log('Feedback suppressed');
      return null;
    }
  }, []);

  const unlockTick = useCallback(() => {
    try {
      const engine = ensureDockAudio();
      if (!engine) return;
      const { ctx, master } = engine;
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      if (audioPrimedRef.current) return;
      audioPrimedRef.current = true;
      const mute = ctx.createGain();
      mute.gain.value = 0.0001;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 1;
      osc.connect(mute);
      mute.connect(master);
      osc.start(0);
      osc.stop(ctx.currentTime + 0.02);
      osc.onended = () => {
        osc.disconnect();
        mute.disconnect();
      };
    } catch {
      console.log('Feedback suppressed');
    }
  }, [ensureDockAudio]);

  const playTick = useCallback(() => {
    try {
      window.navigator?.vibrate?.(5);

      const engine = ensureDockAudio();
      if (!engine) return;
      const { ctx, master, noiseBuffer } = engine;

      const fire = () => {
        const t = ctx.currentTime;
        const end = t + DOCK_TICK_DURATION;

        const sine = ctx.createOscillator();
        sine.type = 'sine';
        sine.frequency.setValueAtTime(120, t);
        sine.frequency.exponentialRampToValueAtTime(40, end);
        const sineGain = ctx.createGain();
        sineGain.gain.setValueAtTime(0.0001, t);
        sineGain.gain.exponentialRampToValueAtTime(0.079, t + 0.0012);
        sineGain.gain.exponentialRampToValueAtTime(0.0001, end);

        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.setValueAtTime(180, t);
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(1200, t);
        lowpass.Q.setValueAtTime(0.65, t);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.0001, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.056, t + 0.0009);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, end);

        sine.connect(sineGain);
        sineGain.connect(master);
        noise.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(noiseGain);
        noiseGain.connect(master);

        sine.start(t);
        noise.start(t);
        sine.stop(end + 0.004);
        noise.stop(end + 0.004);
        sine.onended = () => {
          sine.disconnect();
          sineGain.disconnect();
        };
        noise.onended = () => {
          noise.disconnect();
          highpass.disconnect();
          lowpass.disconnect();
          noiseGain.disconnect();
        };
      };

      if (ctx.state === 'suspended') {
        void ctx.resume().then(fire).catch(() => {});
        return;
      }
      fire();
    } catch {
      console.log('Feedback suppressed');
    }
  }, [ensureDockAudio]);
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
  const routeIndex = Math.max(0, ITEMS.findIndex((item) => item.tab === activeTab));
  const pillX = useMotionValue(0);
  const pillW = useMotionValue(0);
  const hoverIndex = useMotionValue(routeIndex);
  const grabScale = useMotionValue(1);
  const pillScale = useSpring(grabScale, DOCK_PLUMP_SPRING);
  const draggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const originXRef = useRef(0);
  const liveIndexRef = useRef(routeIndex);
  const pendingIndexRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const slotsRef = useRef<Array<{ x: number; w: number }>>([]);
  const listLeftRef = useRef(0);
  const listWidthRef = useRef(0);
  const [liveTabIndex, setLiveTabIndex] = useState(routeIndex);

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

  const measurePill = useCallback((index: number, instant = false) => {
    const snapHover = (nextIndex: number) => {
      if (instant) {
        hoverIndex.set(nextIndex);
        return;
      }
      void animate(hoverIndex, nextIndex, DOCK_PILL_TRANSITION);
    };
    const slot = slotsRef.current[index];
    if (!slot || slot.w <= 0) {
      const item = itemRefs.current[index];
      const list = listRef.current;
      if (!item || !list) {
        snapHover(index);
        return;
      }
      const itemRect = item.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      const nextX = itemRect.left - listRect.left;
      const nextW = itemRect.width;
      if (instant) {
        pillX.set(nextX);
        pillW.set(nextW);
        hoverIndex.set(index);
        return;
      }
      void animate(pillX, nextX, DOCK_PILL_TRANSITION);
      void animate(pillW, nextW, DOCK_PILL_TRANSITION);
      void animate(hoverIndex, index, DOCK_PILL_TRANSITION);
      return;
    }
    if (instant) {
      pillX.set(slot.x);
      pillW.set(slot.w);
      hoverIndex.set(index);
      return;
    }
    void animate(pillX, slot.x, DOCK_PILL_TRANSITION);
    void animate(pillW, slot.w, DOCK_PILL_TRANSITION);
    void animate(hoverIndex, index, DOCK_PILL_TRANSITION);
  }, [hoverIndex, pillW, pillX]);

  const followPointer = useCallback((clientX: number) => {
    const listWidth = listWidthRef.current;
    if (listWidth <= 0) return;
    const x = Math.min(Math.max(clientX - listLeftRef.current, 0), listWidth - 0.001);
    const continuous = (x / listWidth) * ITEMS.length;
    const nextIndex = Math.min(ITEMS.length - 1, Math.floor(continuous));
    hoverIndex.set(Math.min(ITEMS.length - 1, Math.max(0, continuous - 0.5)));
    const slot = slotsRef.current[nextIndex];
    if (slot && slot.w > 0) {
      const nextX = Math.min(Math.max(x - slot.w / 2, 0), listWidth - slot.w);
      pillX.set(nextX);
      pillW.set(slot.w);
    }
    if (tickIndexRef.current !== nextIndex) {
      tickIndexRef.current = nextIndex;
      liveIndexRef.current = nextIndex;
      setLiveTabIndex(nextIndex);
      triggerHaptic('light');
      playTick();
    }
  }, [hoverIndex, pillW, pillX, playTick, triggerHaptic]);

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
    const settledIndex =
      pendingIndexRef.current !== null ? pendingIndexRef.current : routeIndex;
    if (pendingIndexRef.current === routeIndex) {
      pendingIndexRef.current = null;
    }
    liveIndexRef.current = settledIndex;
    tickIndexRef.current = settledIndex;
    setLiveTabIndex(settledIndex);
    measurePill(settledIndex, !pillMountedRef.current);
    pillMountedRef.current = true;
  }, [cacheDockSlots, conceal, measurePill, routeIndex]);

  useLayoutEffect(() => {
    if (!draggingRef.current) return;
    cacheDockSlots();
    const slot = slotsRef.current[liveTabIndex];
    if (!slot || slot.w <= 0) return;
    pillW.set(slot.w);
    const listWidth = listWidthRef.current;
    if (listWidth <= 0) return;
    pillX.set(Math.min(Math.max(pillX.get(), 0), Math.max(0, listWidth - slot.w)));
  }, [cacheDockSlots, liveTabIndex, pillW, pillX]);

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
    const nav = navRef.current;
    if (!nav) return;

    const unlockOnGesture = () => {
      unlockTick();
    };

    nav.addEventListener('pointerdown', unlockOnGesture, { capture: true });
    nav.addEventListener('touchstart', unlockOnGesture, { capture: true, passive: true });

    return () => {
      nav.removeEventListener('pointerdown', unlockOnGesture, { capture: true });
      nav.removeEventListener('touchstart', unlockOnGesture, { capture: true });
    };
  }, [conceal, unlockTick]);

  useEffect(() => {
    return () => {
      const engine = audioEngineRef.current;
      audioEngineRef.current = null;
      if (!engine || engine.ctx.state === 'closed') return;
      void engine.ctx.close().catch(() => {});
    };
  }, []);

  const handleSelect = useCallback(
    (tab: AppTab, href: string) => {
      triggerHaptic('light');
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
    [chatThreadActive, pathname, router, setActiveTab, triggerHaptic]
  );

  const commitTab = useCallback(
    (index: number) => {
      const item = ITEMS[index];
      if (!item) return;
      const href = hrefForTab(item.tab, homePath);
      handleSelect(item.tab, href);
      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [handleSelect, homePath, router]
  );

  const onDockPointerDown = useCallback(
    (event: React.PointerEvent<HTMLUListElement>) => {
      if (event.button !== 0) return;
      unlockTick();
      cacheDockSlots();
      pillX.stop();
      pillW.stop();
      hoverIndex.stop();
      grabScale.set(DOCK_PLUMP_SCALE);
      draggingRef.current = true;
      dragMovedRef.current = false;
      suppressClickRef.current = false;
      pointerIdRef.current = event.pointerId;
      originXRef.current = event.clientX;
      const startIndex = indexFromPointer(event.currentTarget, event.clientX);
      liveIndexRef.current = startIndex;
      tickIndexRef.current = startIndex;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [cacheDockSlots, grabScale, hoverIndex, pillW, pillX, unlockTick]
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

  const onDockPointerEnd = useCallback(
    (event: React.PointerEvent<HTMLUListElement>) => {
      if (!draggingRef.current || pointerIdRef.current !== event.pointerId) return;
      draggingRef.current = false;
      grabScale.set(1);
      pointerIdRef.current = null;
      const nextIndex = liveIndexRef.current;
      pendingIndexRef.current = nextIndex;
      measurePill(nextIndex);
      if (dragMovedRef.current && nextIndex !== routeIndex) {
        commitTab(nextIndex);
      } else if (!dragMovedRef.current) {
        pendingIndexRef.current = null;
      }
      dragMovedRef.current = false;
    },
    [commitTab, grabScale, measurePill, routeIndex]
  );

  return (
    <nav
      ref={navRef}
      className={cn(PILL_CLASS, conceal && 'pointer-events-none invisible')}
      aria-label={t('nav.home')}
      aria-hidden={conceal}
      onPointerDown={unlockTick}
      onTouchStart={unlockTick}
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
          className="pointer-events-none absolute top-0 bottom-0 z-0 rounded-full bg-[#FF6600] transform-gpu will-change-transform"
          style={{ x: pillX, width: pillW, scale: pillScale }}
        />
        {ITEMS.map((item, index) => {
          const visualActive = liveTabIndex === index;
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
                  pendingIndexRef.current = null;
                  liveIndexRef.current = index;
                  tickIndexRef.current = index;
                  setLiveTabIndex(index);
                  hoverIndex.set(index);
                  unlockTick();
                  if (index !== routeIndex) playTick();
                  handleSelect(item.tab, href);
                }}
                className={cn(
                  dockItemClass(visualActive),
                  'transition-[padding,gap] duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70'
                )}
                aria-current={routeIndex === index ? 'page' : undefined}
                aria-label={t(item.labelKey)}
              >
                <DockGlyphLive
                  item={item}
                  active={visualActive}
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
