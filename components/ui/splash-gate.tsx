'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { SplashScreen } from '@/components/ui/splash-screen';

/**
 * Controlador de boot da Splash Screen global.
 *
 * Fica montado no Root Layout como a primeira camada absoluta (z-[9999]),
 * cobrindo o carregamento do Clerk e da aplicação subjacente desde o primeiro
 * paint (SSR) até o fim da transição de saída.
 *
 * HANDOFF UNIFICADO (Fase 25.2):
 *
 * O underlay revelado pela splash é SEMPRE o mesmo canvas (`BootContinuation`):
 * a camada de autenticação (`<ClerkLoading>`), os fallbacks de rota e a
 * hidratação de sessão renderizam exatamente o mesmo fundo do splash. Por isso
 * a saída segue estritamente o relógio de marca (2.2s) — não há mais
 * necessidade de esperar o Clerk. Qualquer que seja a fronteira ativa quando a
 * splash desmontar, a pintura é idêntica: UMA única transição, sem revelar
 * skeleton de rota nem a dock.
 *
 * A splash executa estritamente uma única vez por sessão (Initial App Boot).
 * sessionStorage (`hasSeenSplash`) persiste o skip entre full reloads.
 */

const SPLASH_VISIBLE_MS = 2200;
const SPLASH_FADE_MS = 500;
const SPLASH_FADE_BUFFER_MS = 60;

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

  const [phase, setPhase] = useState<'boot' | 'fading' | 'done'>('boot');
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const minTimer = window.setTimeout(() => setMinElapsed(true), SPLASH_VISIBLE_MS);
    return () => window.clearTimeout(minTimer);
  }, []);

  // Saída dirigida por relógio (não por efeito síncrono): o mínimo de marca
  // dispara o fade e o desmonte. `setState` só ocorre dentro dos callbacks de
  // timeout, nunca no corpo do efeito.
  useEffect(() => {
    if (hasSeenSplash) {
      persistSplashSeen();
      return;
    }
    if (!minElapsed) return;

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
  }, [hasSeenSplash, minElapsed]);

  if (hasSeenSplash || phase === 'done') return null;

  return <SplashScreen isVisible={phase === 'boot'} />;
}
