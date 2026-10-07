'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  forceViewportRecalibration,
  isEditingElement,
  resetViewportScale,
} from '@/lib/utils/viewport-scale';

/**
 * TATTOOGO MK - GUARDA GLOBAL DE ESCALA DE VIEWPORT
 *
 * Montado no template do dashboard, este guarda roda em CADA transição de rota
 * do app. Ao entrar/sair de submódulos (ex.: "Quero ser Tatuador") ele zera
 * imediatamente transform, zoom e offset de rolagem dos elementos raiz e força
 * o WebKit a descartar a escala residual de auto-zoom do iOS, garantindo que as
 * abas principais (Início, Agenda, Chat, Perfil) voltem sempre à escala nativa
 * 1:1, sem vazamento de dimensão de layout da sub-rota.
 *
 * Nenhum contêiner de scroll interno é reposicionado, então a experiência de
 * leitura das telas não é alterada.
 */

// `useLayoutEffect` roda antes do paint para eliminar o "flash" de layout
// ampliado na reentrada; no servidor caímos para `useEffect` para evitar o
// aviso de SSR (padrão "useIsomorphicLayoutEffect").
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Tempo que o iOS leva para restaurar a escala depois que o input perde o foco.
const IOS_ZOOM_SETTLE_MS = 320;

export function useViewportScaleGuard() {
  const pathname = usePathname();
  const settleTimer = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  const clearScheduled = () => {
    if (settleTimer.current !== null) {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
    if (rafId.current !== null) {
      window.cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  };

  const enforceReset = (forceBlur: boolean) => {
    resetViewportScale({ forceBlur });
    forceViewportRecalibration();
  };

  useIsomorphicLayoutEffect(() => {
    enforceReset(true);

    rafId.current = window.requestAnimationFrame(() => enforceReset(true));

    // Segunda passada: o iOS restaura a escala de forma assíncrona após o blur.
    settleTimer.current = window.setTimeout(() => enforceReset(true), IOS_ZOOM_SETTLE_MS);

    return () => {
      clearScheduled();
      enforceReset(true);
    };
  }, [pathname]);

  useEffect(() => {
    let focusTimer: number | null = null;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      // Enquanto o usuário digita, a escala fica sob controle do sistema e não
      // lutamos contra o teclado; só corrigimos escalas residuais fora de edição.
      if (Math.abs(vv.scale - 1) > 0.01 && !isEditingElement(document.activeElement)) {
        enforceReset(false);
      }
    };

    const handleFocusOut = () => {
      if (focusTimer !== null) window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        if (!isEditingElement(document.activeElement)) {
          enforceReset(false);
        }
      }, IOS_ZOOM_SETTLE_MS);
    };

    const handlePageShow = () => enforceReset(true);

    window.addEventListener('focusout', handleFocusOut);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('orientationchange', handleViewportChange);
    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);

    return () => {
      if (focusTimer !== null) window.clearTimeout(focusTimer);
      window.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('orientationchange', handleViewportChange);
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      clearScheduled();
    };
  }, []);
}
