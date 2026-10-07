'use client';

import { useEffect } from 'react';
import {
  forceViewportRecalibration,
  isEditingElement,
  resetViewportScale,
} from '@/lib/utils/viewport-scale';

/**
 * TATTOOGO MK - GUARDA DE VIEWPORT DO FLUXO DE TATUADOR
 *
 * Reafirma a diretiva de viewport canônica enquanto a tela de verificação está
 * montada e, ao desmontar, limpa qualquer escala/rolagem residual, garantindo
 * que a AppShell volte à escala nativa instantaneamente. As primitivas de
 * reset são compartilhadas com o guarda global em `lib/utils/viewport-scale`.
 */

// Tempo que o iOS leva para restaurar a escala depois que o input perde o foco.
const IOS_ZOOM_SETTLE_MS = 320;

export function useArtistViewportGuard() {
  useEffect(() => {
    resetViewportScale({ forceBlur: true });
    forceViewportRecalibration();

    let settleTimer: number | null = null;

    const handleFocusOut = () => {
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        // Ignora a transição entre campos; só restaura ao encerrar a edição.
        if (!isEditingElement(document.activeElement)) {
          resetViewportScale();
          forceViewportRecalibration();
        }
      }, IOS_ZOOM_SETTLE_MS);
    };

    window.addEventListener('focusout', handleFocusOut);

    return () => {
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      window.removeEventListener('focusout', handleFocusOut);
      resetViewportScale({ forceBlur: true });
      forceViewportRecalibration();
    };
  }, []);
}
