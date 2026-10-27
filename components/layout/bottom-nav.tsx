'use client';

import { memo, startTransition, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
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
  'bottom-nav-dock fixed inset-x-0 z-50 mx-auto flex h-12 w-[94%] max-w-sm items-center overflow-hidden rounded-full border border-white/20 bg-white/[0.02] px-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),_0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-[40px] select-none touch-none';

const DRAG_THRESHOLD_PX = 6;
const DRAG_HOLD_MS = 150;
const DOCK_TRACK_SPRING = { stiffness: 1400, damping: 48, mass: 0.16, restDelta: 0.08 };
const DOCK_PILL_SPRING = { stiffness: 820, damping: 38, mass: 0.22, restDelta: 0.08 };
const DOCK_PLUMP_SCALE = 1.08;
const DOCK_PLUMP_SPRING = { stiffness: 640, damping: 28, mass: 0.22, restDelta: 0.01 };
const DOCK_TICK_MIN_INTERVAL_MS = 64;
const DOCK_TICK_DURATION = 0.018;
const DOCK_TICK_ATTACK = 0.002;
const DOCK_TICK_GAIN = 10 ** (-20 / 20);
const DOCK_TICK_NOISE_GAIN = DOCK_TICK_GAIN * 0.7;
const DOCK_WARMUP_DURATION = 0.04;

type DockAudioEngine = {
  ctx: AudioContext;
  master: GainNode;
  noiseBuffer: AudioBuffer;
  silentBuffer: AudioBuffer;
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

function createSilentWarmupBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * DOCK_WARMUP_DURATION));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  data[0] = 0.0004;
  return buffer;
}

function scheduleTickEnvelope(param: AudioParam, time: number, peak: number, end: number) {
  const attackEnd = Math.min(time + DOCK_TICK_ATTACK, end);
  param.cancelScheduledValues(time);
  param.setValueAtTime(0, time);
  param.linearRampToValueAtTime(peak, attackEnd);
  param.linearRampToValueAtTime(0, end);
}

function isDockAudioRunning(ctx: AudioContext): boolean {
  return ctx.state === 'running';
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
  return {
    ctx,
    master,
    noiseBuffer: createDockNoiseBuffer(ctx),
    silentBuffer: createSilentWarmupBuffer(ctx),
  };
}

const DOCK_TICK_WAV =
  'data:audio/wav;base64,UklGRjwDAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YRgDAAAAAEQCdgSXBqQInQqBDE8OBxCoETEToxT9FT4XZxh4GXAaUBsXHMccXh3fHUgemx7YHv8eER8PH/oe0R6WHkke6x1+HQEddhzdGzcbhRrIGQEZMBhWF3UWjBWdFKkTsBKzEbMQsA+rDqYNnwyZC5QKkAmOCI8HkgaZBaQEswPHAuAB/gAjAE7/f/63/fX8O/yI+9z6OPqb+Qb5efj093f3AfeU9i720PV69Sv15fSl9G30PPQS9O/z0/O+867zpvOj86bzrvO888/z6PMF9Cb0TPR29KT01vQL9UT1f/W99f71QvaH9s/2GPdj96/3/PdL+Jr46vg7+Yz53fku+n/60Pog+3D7wPsO/Fz8qfz1/D/9if3R/Rj+Xf6h/uP+JP9j/6D/3P8VAE0AgwC3AOkAGgFIAXUBoAHJAfABFQI4AloCeQKXArMCzQLlAvwCEQMkAzUDRQNUA2EDbAN2A38DhgOLA5ADkwOVA5YDlgOUA5IDjwOKA4UDfwN4A3ADaANeA1QDSgM/AzMDJwMaAw0D/wLxAuMC1ALFArYCpwKXAocCdwJnAlcCRwI3AiYCFgIGAvYB5gHVAcUBtgGmAZYBhwF3AWgBWQFKATwBLgEfARIBBAH2AOkA3ADQAMMAtwCsAKAAlQCKAH8AdQBrAGEAVwBOAEUAPAA0ACsAJAAcABUADQAHAAAA+//1/+//6f/k/9//2v/V/9H/zf/J/8X/wv++/7v/uP+1/7P/sP+u/6z/qv+o/6f/pf+k/6P/ov+h/6D/n/+f/57/nv+e/57/nv+e/57/nv+e/5//n/+g/6D/of+i/6L/o/+k/6X/pv+n/6j/qf+q/6v/rf+u/6//sP+x/7P/tP+1/7f/uP+5/7v/vP+9/7//wP/C/8P/xP/G/8f/yP/K/8v/zf/O/8//0P/S/9P/1P/W/9f/2P/Z/9v/3P/d/97/3//g/+L/4//k/+X/5v/n/+j/6f/q/+v/7P/t/+7/7//w//H/8f/y//P/9P/1//X/9v/3//j/+P/5//r/+//7//z//P/9//7//v//////AAA=';

let dockAudioSingleton: DockAudioEngine | null = null;
const dockTickPool: HTMLAudioElement[] = [];
let dockTickCursor = 0;
let dockUnlockBound = false;
let dockHtmlUnlocked = false;
let dockAudioPrimed = false;
let dockWarmupNode: HTMLAudioElement | null = null;

function ensureDockTickPool(): HTMLAudioElement[] {
  if (typeof Audio === 'undefined') return [];
  if (dockTickPool.length > 0) return dockTickPool;
  for (let i = 0; i < 4; i += 1) {
    const node = new Audio(DOCK_TICK_WAV);
    node.preload = 'auto';
    node.loop = false;
    node.volume = 0.42;
    node.setAttribute('playsinline', 'true');
    node.setAttribute('webkit-playsinline', 'true');
    node.load();
    dockTickPool.push(node);
  }
  return dockTickPool;
}

function ensureDockWarmupNode(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (dockWarmupNode) return dockWarmupNode;
  const node = new Audio(DOCK_TICK_WAV);
  node.preload = 'auto';
  node.loop = false;
  node.muted = true;
  node.volume = 0;
  node.setAttribute('playsinline', 'true');
  node.setAttribute('webkit-playsinline', 'true');
  node.load();
  dockWarmupNode = node;
  return node;
}

function primeDockAudioEngine(): DockAudioEngine | null {
  if (typeof window === 'undefined') return dockAudioSingleton;
  try {
    ensureDockTickPool();
    ensureDockWarmupNode();
    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) return dockAudioSingleton;
    if (!dockAudioSingleton || dockAudioSingleton.ctx.state === 'closed') {
      dockAudioSingleton = createDockAudioEngine(AudioContextCtor);
    }
    return dockAudioSingleton;
  } catch {
    console.log('Feedback suppressed');
    return dockAudioSingleton;
  }
}

function playHtmlTick() {
  try {
    const pool = ensureDockTickPool();
    const node = pool[dockTickCursor % pool.length];
    dockTickCursor += 1;
    if (!node) return;
    node.muted = false;
    node.volume = 0.42;
    node.pause();
    node.currentTime = 0;
    const playResult = node.play();
    if (playResult) void playResult.catch(() => {});
  } catch {
    console.log('Feedback suppressed');
  }
}

function unlockHtmlTickPool() {
  const pool = ensureDockTickPool();
  const warmup = ensureDockWarmupNode();
  if (warmup) {
    warmup.muted = true;
    warmup.volume = 0;
    warmup.currentTime = 0;
    const warmupPlay = warmup.play();
    if (warmupPlay) {
      void warmupPlay
        .then(() => {
          warmup.pause();
          warmup.currentTime = 0;
        })
        .catch(() => {});
    }
  }
  if (dockHtmlUnlocked || pool.length === 0) return;
  dockHtmlUnlocked = true;
  for (const node of pool) {
    node.muted = true;
    node.volume = 0;
    const playResult = node.play();
    if (playResult) {
      void playResult
        .then(() => {
          node.pause();
          node.currentTime = 0;
          node.muted = false;
          node.volume = 0.42;
        })
        .catch(() => {
          node.muted = false;
          node.volume = 0.42;
        });
    } else {
      node.muted = false;
      node.volume = 0.42;
    }
  }
}

function pumpSilentBuffer(engine: DockAudioEngine) {
  if (!isDockAudioRunning(engine.ctx)) return;
  const { ctx, silentBuffer } = engine;
  const src = ctx.createBufferSource();
  src.buffer = silentBuffer;
  src.connect(ctx.destination);
  src.start(0);
  src.stop(ctx.currentTime + DOCK_WARMUP_DURATION);
  src.onended = () => {
    src.disconnect();
  };
}

function resumeDockAudioEngine(engine: DockAudioEngine | null) {
  if (!engine || engine.ctx.state === 'closed') return;
  if (isDockAudioRunning(engine.ctx)) {
    pumpSilentBuffer(engine);
    return;
  }
  try {
    const resumeResult = engine.ctx.resume();
    if (resumeResult) {
      void resumeResult
        .then(() => {
          if (isDockAudioRunning(engine.ctx)) pumpSilentBuffer(engine);
        })
        .catch(() => {});
    }
  } catch {
    console.log('Feedback suppressed');
  }
}

function unlockDockAudioFromUserGesture(): DockAudioEngine | null {
  try {
    const engine = primeDockAudioEngine();
    unlockHtmlTickPool();
    if (!engine) return dockAudioSingleton;
    resumeDockAudioEngine(engine);
    if (isDockAudioRunning(engine.ctx)) {
      pumpSilentBuffer(engine);
      dockAudioPrimed = true;
    }
    return engine;
  } catch {
    console.log('Feedback suppressed');
    return dockAudioSingleton;
  }
}

function bindGlobalDockAudioUnlock() {
  if (typeof window === 'undefined' || dockUnlockBound) return;
  dockUnlockBound = true;
  primeDockAudioEngine();
  const opts: AddEventListenerOptions = { capture: true, passive: true };
  const gestureEvents = ['touchstart', 'pointerdown', 'touchend', 'mousedown'] as const;
  const unlock = () => {
    const engine = unlockDockAudioFromUserGesture();
    if (!engine || !isDockAudioRunning(engine.ctx)) return;
    for (const eventName of gestureEvents) {
      window.removeEventListener(eventName, unlock, opts);
      document.removeEventListener(eventName, unlock, opts);
    }
  };
  for (const eventName of gestureEvents) {
    window.addEventListener(eventName, unlock, opts);
    document.addEventListener(eventName, unlock, opts);
  }
}

if (typeof window !== 'undefined') {
  bindGlobalDockAudioUnlock();
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
        <span className="absolute inset-0 z-0 rounded-full bg-[#90EE90]/15" />
      ) : null}
      <span
        className={cn(
          'relative z-10 flex shrink-0 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          active && 'scale-105'
        )}
      >
        <NavIcon
          icon={item.icon}
          className={
            active
              ? 'text-[#90EE90] drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.8)]'
              : 'text-zinc-500'
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
            'min-w-0 overflow-hidden whitespace-nowrap text-[10px] font-semibold leading-none tracking-tight text-[#90EE90]',
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
    const r = Math.round(113 + (144 - 113) * near);
    const g = Math.round(113 + (238 - 113) * near);
    const b = Math.round(122 + (144 - 122) * near);
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
        <span className="min-w-0 overflow-hidden whitespace-nowrap text-[10px] font-semibold leading-none tracking-tight text-[#90EE90] drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.8)]">
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
  const lastTickAtRef = useRef(0);
  const audioPrimedRef = useRef(false);

  const ensureDockAudio = useCallback((): DockAudioEngine | null => {
    const engine = primeDockAudioEngine();
    if (engine !== audioEngineRef.current) {
      audioEngineRef.current = engine;
    }
    audioPrimedRef.current = dockAudioPrimed;
    return engine;
  }, []);

  const unlockTick = useCallback(() => {
    try {
      const engine = unlockDockAudioFromUserGesture();
      if (!engine) return;
      audioEngineRef.current = engine;
      audioPrimedRef.current = true;
    } catch {
      console.log('Feedback suppressed');
    }
  }, []);

  const playTick = useCallback(() => {
    try {
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const isFirstTick = lastTickAtRef.current === 0;
      if (!isFirstTick && now - lastTickAtRef.current < DOCK_TICK_MIN_INTERVAL_MS) return;
      lastTickAtRef.current = now;
      window.navigator?.vibrate?.(5);

      const engine = audioEngineRef.current ?? ensureDockAudio();
      if (!engine || engine.ctx.state !== 'running') {
        unlockDockAudioFromUserGesture();
        resumeDockAudioEngine(engine);
        playHtmlTick();
        return;
      }
      const { ctx, master, noiseBuffer } = engine;

      const t = ctx.currentTime;
      const end = t + DOCK_TICK_DURATION;

      const sine = ctx.createOscillator();
      sine.type = 'sine';
      sine.frequency.setValueAtTime(120, t);
      sine.frequency.exponentialRampToValueAtTime(40, end);
      const sineGain = ctx.createGain();
      sineGain.gain.value = 0;
      scheduleTickEnvelope(sineGain.gain, t, DOCK_TICK_GAIN, end);

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
      noiseGain.gain.value = 0;
      scheduleTickEnvelope(noiseGain.gain, t, DOCK_TICK_NOISE_GAIN, end);

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
  const pendingIndexRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const slotsRef = useRef<Array<{ x: number; w: number }>>([]);
  const listLeftRef = useRef(0);
  const listWidthRef = useRef(0);

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

  const measurePill = useCallback((index: number, instant = false) => {
    const apply = (nextX: number, nextW: number, nextIndex: number) => {
      if (instant) {
        snapTrack(nextX, nextW, nextIndex);
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
  }, [hoverIndex, hoverIndexRaw, snapTrack, springTrack]);

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
    if (tickIndexRef.current !== nextIndex) {
      tickIndexRef.current = nextIndex;
      liveIndexRef.current = nextIndex;
      playTick();
    }
  }, [cacheDockSlots, hoverIndexRaw, pillWRaw, pillXRaw, playTick]);

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
    primeDockAudioEngine();
    cacheDockSlots();
    if (draggingRef.current) return;
    const settledIndex =
      pendingIndexRef.current !== null ? pendingIndexRef.current : routeIndex;
    if (pendingIndexRef.current === routeIndex) {
      pendingIndexRef.current = null;
    }
    liveIndexRef.current = settledIndex;
    tickIndexRef.current = settledIndex;
    const instant = !pillMountedRef.current;
    measurePill(settledIndex, instant);
    pillMountedRef.current = true;
    if (!instant) return;
    let innerFrame = 0;
    const outerFrame = window.requestAnimationFrame(() => {
      cacheDockSlots();
      if (draggingRef.current) return;
      measurePill(pendingIndexRef.current ?? routeIndex, true);
      innerFrame = window.requestAnimationFrame(() => {
        cacheDockSlots();
        if (draggingRef.current) return;
        measurePill(pendingIndexRef.current ?? routeIndex, true);
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
    if (typeof window === 'undefined') return;

    bindGlobalDockAudioUnlock();

    const unlockFromGesture = () => {
      unlockTick();
    };

    const resumeOnInteraction = () => {
      resumeDockAudioEngine(audioEngineRef.current ?? dockAudioSingleton);
    };

    const gestureOpts: AddEventListenerOptions = { capture: true, passive: true };
    const dockUnlockEvents: Array<keyof HTMLElementEventMap> = [
      'touchstart',
      'pointerdown',
      'mousedown',
    ];
    const globalGestureEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'touchstart',
      'mousedown',
      'keydown',
      'click',
    ];

    const bindDockUnlock = (node: HTMLElement | null) => {
      if (!node) return;
      for (const eventName of dockUnlockEvents) {
        node.addEventListener(eventName, unlockFromGesture, gestureOpts);
      }
    };
    const unbindDockUnlock = (node: HTMLElement | null) => {
      if (!node) return;
      for (const eventName of dockUnlockEvents) {
        node.removeEventListener(eventName, unlockFromGesture, gestureOpts);
      }
    };

    const navNode = navRef.current;
    const listNode = listRef.current;
    bindDockUnlock(navNode);
    bindDockUnlock(listNode);

    for (const eventName of globalGestureEvents) {
      document.addEventListener(eventName, unlockFromGesture, gestureOpts);
      window.addEventListener(eventName, unlockFromGesture, gestureOpts);
    }
    document.addEventListener('visibilitychange', resumeOnInteraction);
    window.addEventListener('pageshow', resumeOnInteraction);
    window.addEventListener('focus', resumeOnInteraction);

    return () => {
      unbindDockUnlock(navNode);
      unbindDockUnlock(listNode);
      for (const eventName of globalGestureEvents) {
        document.removeEventListener(eventName, unlockFromGesture, gestureOpts);
        window.removeEventListener(eventName, unlockFromGesture, gestureOpts);
      }
      document.removeEventListener('visibilitychange', resumeOnInteraction);
      window.removeEventListener('pageshow', resumeOnInteraction);
      window.removeEventListener('focus', resumeOnInteraction);
    };
  }, [ensureDockAudio, unlockTick]);

  useEffect(() => {
    return () => {
      if (pressTimerRef.current !== null) {
        window.clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
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

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current === null) return;
    window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = null;
  }, []);

  const engageDockDrag = useCallback(() => {
    if (draggingRef.current || !pressActiveRef.current) return;
    draggingRef.current = true;
    grabScale.set(DOCK_PLUMP_SCALE);
    pillXRaw.set(pillX.get());
    pillWRaw.set(pillW.get());
    hoverIndexRaw.set(hoverIndex.get());
  }, [grabScale, hoverIndex, hoverIndexRaw, pillW, pillWRaw, pillX, pillXRaw]);

  const onDockPointerDown = useCallback(
    (event: React.PointerEvent<HTMLUListElement>) => {
      if (event.button !== 0) return;
      unlockTick();
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
      tickIndexRef.current = startIndex;
      event.currentTarget.setPointerCapture(event.pointerId);
      pressTimerRef.current = window.setTimeout(() => {
        pressTimerRef.current = null;
        engageDockDrag();
        followPointer(lastClientXRef.current);
      }, DRAG_HOLD_MS);
    },
    [cacheDockSlots, clearPressTimer, engageDockDrag, followPointer, unlockTick]
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
      if (!wasDragging) return;
      const nextIndex = liveIndexRef.current;
      pendingIndexRef.current = nextIndex;
      measurePill(nextIndex);
      if (didMove && nextIndex !== routeIndex) {
        commitTab(nextIndex);
      } else if (!didMove) {
        pendingIndexRef.current = null;
      }
    },
    [clearPressTimer, commitTab, grabScale, measurePill, routeIndex]
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
        onTouchStart={unlockTick}
        onPointerDown={onDockPointerDown}
        onPointerMove={onDockPointerMove}
        onPointerUp={onDockPointerEnd}
        onPointerCancel={onDockPointerEnd}
        onLostPointerCapture={onDockPointerEnd}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 z-0 h-full rounded-full bg-[#90EE90]/15 transform-gpu will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]"
          style={{ x: pillX, width: pillW, scale: pillScale }}
        />
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
                onClick={(event) => {
                  if (suppressClickRef.current) {
                    event.preventDefault();
                    suppressClickRef.current = false;
                    return;
                  }
                  pendingIndexRef.current = null;
                  liveIndexRef.current = index;
                  tickIndexRef.current = index;
                  measurePill(index);
                  unlockTick();
                  if (index !== routeIndex) playTick();
                  handleSelect(item.tab, href);
                }}
                className={cn(
                  dockItemClass(routeIndex === index),
                  'transition-[padding,gap] duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70'
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
