'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { SplashScreen } from '@/components/ui/splash-screen';

/**
 * Controlador de boot da Splash Screen global.
 *
 * Fica montado no Root Layout como a primeira camada absoluta (z-[9999]),
 * cobrindo o carregamento do Clerk e da aplicacao subjacente desde o primeiro
 * paint (SSR) ate o fim da transicao de saida. O conteudo por baixo permanece
 * montado, sem reflow, garantindo zero layout shifting ao remover a camada.
 *
 * A splash executa estritamente uma unica vez por sessao (Initial App Boot).
 * sessionStorage (`hasSeenSplash`) persiste o skip entre full reloads
 * (login / assignAppPath). A classe `splash-seen` e aplicada pre-paint no
 * <html> para F5 silencioso, sem flicker e sem hydration mismatch.
 *
 * useSyncExternalStore com snapshot de servidor `false` garante que o primeiro
 * render (SSR + hidratacao) seja identico. A instancia atual nao re-le a flag
 * depois de gravar, portanto o fade de 500ms nao e cortado.
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

  const [playState, setPlayState] = useState<'boot' | 'fading' | 'done'>('boot');

  useEffect(() => {
    if (hasSeenSplash) {
      persistSplashSeen();
      return;
    }

    const visibleTimer = window.setTimeout(() => {
      writeSplashFlag();
      setPlayState('fading');
    }, SPLASH_VISIBLE_MS);

    const unmountTimer = window.setTimeout(() => {
      persistSplashSeen();
      setPlayState('done');
    }, SPLASH_VISIBLE_MS + SPLASH_FADE_MS + SPLASH_FADE_BUFFER_MS);

    return () => {
      window.clearTimeout(visibleTimer);
      window.clearTimeout(unmountTimer);
    };
  }, [hasSeenSplash]);

  if (hasSeenSplash || playState === 'done') return null;

  return <SplashScreen isVisible={playState === 'boot'} />;
}
