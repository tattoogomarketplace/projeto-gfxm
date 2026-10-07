'use client';

import { useEffect } from 'react';

/**
 * TATTOOGO MK - GUARDA DE VIEWPORT DO FLUXO DE TATUADOR
 *
 * iOS Safari ignora `user-scalable=no` e dá auto-zoom no visual viewport
 * sempre que um controle de formulário com fonte computada abaixo de 16px
 * recebe foco. Como o app navega no cliente (SPA), essa escala residual
 * "vazava" de volta para a AppShell (Início, Agenda, Chat e Perfil), deixando
 * a interface ampliada e distorcida ao retornar do módulo de tatuador.
 *
 * Este guarda reafirma a diretiva de viewport canônica enquanto a tela de
 * verificação está montada e, ao desmontar, limpa qualquer escala/rolagem
 * residual, garantindo que a AppShell volte à escala nativa instantaneamente.
 */

const CANONICAL_VIEWPORT =
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditingElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  return EDITABLE_TAGS.has(element.tagName) || element.isContentEditable;
}

function resetViewportScale(forceBlur = false) {
  if (typeof document === 'undefined') return;

  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="viewport"]');
  metas.forEach((meta) => {
    if (meta.getAttribute('content') !== CANONICAL_VIEWPORT) {
      meta.setAttribute('content', CANONICAL_VIEWPORT);
    }
  });

  // Só removemos o foco quando ninguém mais está editando. Sem essa guarda o
  // reset fecharia o teclado ao pular de um campo para o outro.
  if (forceBlur || !isEditingElement(document.activeElement)) {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }

  // Nenhum artefato de escala inline deve permanecer no <html>/<body>.
  document.documentElement.style.removeProperty('zoom');
  document.body.style.removeProperty('zoom');

  if (window.visualViewport && window.visualViewport.scale !== 1) {
    window.scrollTo(0, 0);
  }
}

export function useArtistViewportGuard() {
  useEffect(() => {
    resetViewportScale(true);

    const handleFocusOut = () => {
      window.setTimeout(() => {
        // Ignora a transição entre campos; só restaura ao encerrar a edição.
        if (!isEditingElement(document.activeElement)) resetViewportScale();
      }, 0);
    };

    window.addEventListener('focusout', handleFocusOut);

    return () => {
      window.removeEventListener('focusout', handleFocusOut);
      resetViewportScale(true);
    };
  }, []);
}
