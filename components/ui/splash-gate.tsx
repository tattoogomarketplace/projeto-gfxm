'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useAuth } from '@clerk/nextjs';
import { SplashScreen } from '@/components/ui/splash-screen';

/**
 * Controlador de boot da Splash Screen global.
 *
 * Fica montado no Root Layout como a primeira camada absoluta (z-[9999]),
 * cobrindo o carregamento do Clerk e da aplicacao subjacente desde o primeiro
 * paint (SSR) ate o fim da transicao de saida.
 *
 * HANDOFF SINCRONIZADO (fix do thrash pos-splash):
 *
 * O bug original liberava a camada por relogio de parede (2.2s + 0.5s) sem
 * olhar para a prontidao real da arvore por baixo. Como o Root Layout tem
 * fronteiras assincronas NINHADAS que resolvem em tempos diferentes
 * (`<ClerkLoading>`/`<ClerkLoaded>` na hidratacao do cliente e o `<Suspense>` de
 * `loading.tsx` na chegada do RSC), a saida do splash revelava, na sequencia,
 * o fallback escuro (`BootContinuation`) e o skeleton de rota — o "thrash" de
 * multiplos frames descrito pela CPO.
 *
 * A saida agora e um GATE: a splash permanece 100% opaca ate o MINIMO de marca
 * (2.2s, INTOCADO) ter passado E a camada de autenticacao ter terminado de
 * hidratar (`useAuth().isLoaded`). Quando ela desmonta, o `<ClerkLoading>` ja
 * foi substituido pelo `<ClerkLoaded>`, portanto o frame revelado e a UI final —
 * UMA unica transicao, sem revelar o fallback do Clerk nem o skeleton.
 *
 * A splash executa estritamente uma unica vez por sessao (Initial App Boot).
 * sessionStorage (`hasSeenSplash`) persiste o skip entre full reloads.
 */

const SPLASH_VISIBLE_MS = 2200;
const SPLASH_FADE_MS = 500;
const SPLASH_FADE_BUFFER_MS = 60;
// Rede de seguranca: jamais prender o app na splash se o Clerk nao hidratar.
const SPLASH_MAX_WAIT_MS = 6000;

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

  // Prontidao real da camada de autenticacao: so libera a splash quando o
  // Clerk terminou de inicializar e o `<ClerkLoaded>` assumiu o frame.
  const { isLoaded } = useAuth();

  const [playState, setPlayState] = useState<'boot' | 'fading' | 'done'>('boot');
  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Minimo de marca (2.2s) + rede de seguranca.
  useEffect(() => {
    const minTimer = window.setTimeout(() => setMinElapsed(true), SPLASH_VISIBLE_MS);
    const maxTimer = window.setTimeout(() => setTimedOut(true), SPLASH_MAX_WAIT_MS);
    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
    };
  }, []);

  useEffect(() => {
    if (hasSeenSplash) {
      persistSplashSeen();
      setPlayState('done');
    }
  }, [hasSeenSplash]);

  // Gate de saida: marca + auth hidratada (ou teto de seguranca).
  const canRelease = minElapsed && (isLoaded || timedOut);

  useEffect(() => {
    if (hasSeenSplash || playState !== 'boot' || !canRelease) return;

    writeSplashFlag();
    setPlayState('fading');

    const unmountTimer = window.setTimeout(() => {
      persistSplashSeen();
      setPlayState('done');
    }, SPLASH_FADE_MS + SPLASH_FADE_BUFFER_MS);

    return () => window.clearTimeout(unmountTimer);
  }, [canRelease, hasSeenSplash, playState]);

  if (hasSeenSplash || playState === 'done') return null;

  return <SplashScreen isVisible={playState === 'boot'} />;
}
