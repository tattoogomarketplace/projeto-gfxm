'use client';

import { useEffect, useState } from 'react';
import { SplashScreen } from '@/components/ui/splash-screen';

/**
 * Controlador de boot da Splash Screen global.
 *
 * Fica montado no Root Layout como a primeira camada absoluta (z-[9999]),
 * cobrindo o carregamento do Clerk e da aplicacao subjacente desde o primeiro
 * paint (SSR) ate o fim da transicao de saida. O conteudo por baixo permanece
 * montado, sem reflow, garantindo zero layout shifting ao remover a camada.
 */

const SPLASH_VISIBLE_MS = 2200;
const SPLASH_FADE_MS = 500;
const SPLASH_FADE_BUFFER_MS = 60;

export function SplashGate() {
  const [isShowingSplash, setIsShowingSplash] = useState(true);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    const visibleTimer = window.setTimeout(() => {
      setIsShowingSplash(false);
    }, SPLASH_VISIBLE_MS);

    return () => window.clearTimeout(visibleTimer);
  }, []);

  useEffect(() => {
    if (isShowingSplash) return;

    const unmountTimer = window.setTimeout(() => {
      setIsMounted(false);
    }, SPLASH_FADE_MS + SPLASH_FADE_BUFFER_MS);

    return () => window.clearTimeout(unmountTimer);
  }, [isShowingSplash]);

  if (!isMounted) return null;

  return <SplashScreen isVisible={isShowingSplash} />;
}
