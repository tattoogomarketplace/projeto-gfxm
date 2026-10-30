'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useAppReady } from '@/components/layout/app-ready';
import { SplashScreen } from '@/components/ui/splash-screen';

/**
 * Controlador de boot da Splash Screen global.
 *
 * Fica montado no Root Layout como a primeira camada absoluta (z-[9999]),
 * cobrindo o carregamento do Clerk e da aplicação subjacente desde o primeiro
 * paint (SSR) até o fim da transição de saída.
 *
 * HANDOFF TEATRO (Step 3):
 *
 * A splash NÃO desmonta no relógio de marca. O mínimo de 2.2s garante a
 * assinatura; a saída só começa quando `isAppReady` confirma que o casco /
 * destino crítico já pintou (useEffect + rAF no App Shell ou na landing/auth).
 * Sem isso o overlay some sobre o despachante `/dashboard` (return null) e o
 * utilizador vê ~4s de ecrã preto antes do feed.
 *
 * A splash executa estritamente uma única vez por sessão (Initial App Boot).
 * sessionStorage (`hasSeenSplash`) persiste o skip entre full reloads.
 */

const SPLASH_VISIBLE_MS = 2200;
const SPLASH_FADE_MS = 500;
const SPLASH_FADE_BUFFER_MS = 60;
const SPLASH_MAX_WAIT_MS = 12000;

const SPLASH_SEEN_KEY = 'hasSeenSplash';
const SPLASH_SEEN_CLASS = 'splash-seen';

const emptySubscribe = () => () => undefined;

function getSplashSeenSnapshot(): boolean {
  try {
    return (
      document.documentElement.classList.contains(SPLASH_SEEN_CLASS) ||
      window.sessionStorage.getItem(SPLASH_SEEN_KEY) !== null
    );
  } catch {
    return document.documentElement.classList.contains(SPLASH_SEEN_CLASS);
  }
}

function writeSplashFlag(): void {
  try {
    window.sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
  } catch {
    // sessionStorage pode estar indisponivel (modo privado).
  }
}

function persistSplashSeen(): void {
  writeSplashFlag();
  document.documentElement.classList.add(SPLASH_SEEN_CLASS);
}

export function SplashGate() {
  const hasSeenSplash = useSyncExternalStore(
    emptySubscribe,
    getSplashSeenSnapshot,
    () => false
  );
  const isAppReady = useAppReady();

  const [phase, setPhase] = useState<'boot' | 'fading' | 'done'>('boot');
  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const minTimer = window.setTimeout(() => setMinElapsed(true), SPLASH_VISIBLE_MS);
    return () => window.clearTimeout(minTimer);
  }, []);

  useEffect(() => {
    const maxTimer = window.setTimeout(() => setTimedOut(true), SPLASH_MAX_WAIT_MS);
    return () => window.clearTimeout(maxTimer);
  }, []);

  const canHandoff = minElapsed && (isAppReady || timedOut);

  useEffect(() => {
    if (hasSeenSplash) {
      persistSplashSeen();
      return;
    }
    if (!canHandoff) return;

    writeSplashFlag();

    const fadeTimer = window.setTimeout(() => setPhase('fading'), 0);
    const unmountTimer = window.setTimeout(() => {
      persistSplashSeen();
      setPhase('done');
    }, SPLASH_FADE_MS + SPLASH_FADE_BUFFER_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(unmountTimer);
    };
  }, [hasSeenSplash, canHandoff]);

  if (hasSeenSplash || phase === 'done') return null;

  return <SplashScreen isVisible={phase === 'boot'} />;
}
