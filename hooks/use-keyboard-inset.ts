'use client';

import { useEffect, useState } from 'react';
import { isEditingElement } from '@/lib/utils/viewport-scale';

/**
 * TATTOOGO MK - KEYBOARD AVOIDANCE (iOS/PWA)
 *
 * `env(keyboard-inset-bottom)` não é suportado no Safari do iOS (nem no modo
 * standalone), então o teclado cobre compositores ancorados na base.
 *
 * Este hook observa o `visualViewport` e expõe a altura da sobreposição do
 * teclado em pixels. A leitura acontece em um único `requestAnimationFrame`
 * por rajada de eventos (`resize`/`scroll`) e só promove re-render quando a
 * altura muda de fato — evitando loops de render e jitter durante a animação
 * de abertura do teclado.
 *
 * A medição só é considerada enquanto um campo editável está focado. Isso
 * descarta a diferença entre `innerHeight` e `visualViewport.height` causada
 * por barras do navegador (não é teclado) e mantém o inset em `0` quando não
 * há digitação ativa.
 *
 * Retorna `0` no servidor e em plataformas onde o layout viewport já é
 * redimensionado pelo teclado (ex.: Android com `interactive-widget`).
 */
export function useKeyboardInset(): number {
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let frame = 0;
    let lastInset = 0;

    const measure = () => {
      frame = 0;
      const visualViewport = window.visualViewport;
      if (!visualViewport) return;

      const editing = isEditingElement(document.activeElement);
      const overlay = window.innerHeight - visualViewport.height;
      // Em zoom por pinça a diferença de alturas não representa teclado.
      const zoomed = Math.abs(visualViewport.scale - 1) > 0.01;
      const next = editing && !zoomed ? Math.max(0, Math.round(overlay)) : 0;

      if (next === lastInset) return;

      lastInset = next;
      setKeyboardInset(next);
    };

    const schedule = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();

    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', schedule, { passive: true });
    visualViewport?.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });
    window.addEventListener('focusin', schedule, { passive: true });
    window.addEventListener('focusout', schedule, { passive: true });

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      visualViewport?.removeEventListener('resize', schedule);
      visualViewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      window.removeEventListener('focusin', schedule);
      window.removeEventListener('focusout', schedule);
    };
  }, []);

  return keyboardInset;
}
