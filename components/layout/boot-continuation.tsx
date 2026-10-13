'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * PONTE DE BOOT "SEAMLESS" — ÚNICA FONTE DE VERDADE DO CANVAS DE TRANSIÇÃO.
 *
 * Fase 25.2 — Unificação total dos estados de carregamento.
 *
 * Esta é a ÚNICA pintura permitida durante o boot. Todas as fronteiras de
 * carregamento/autenticação (`app/loading.tsx`, `<ClerkLoading>`, os
 * `loading.tsx` de rota, `DashboardHomeSkeleton`, `SessionHydrating` e o
 * despachante `/dashboard`) renderizam EXATAMENTE este componente aqui.
 *
 * O visual é pixel-idêntico ao splash (`#000000` + bloom de cobre na geometria
 * 50%/42%): nenhum ícone, texto, skeleton ou dock que possa "piscar" quando a
 * fronteira é trocada. O handoff Splash -> hidratação -> app é um único frame
 * contínuo.
 *
 * Além de pintar, o componente registra a própria presença no store global.
 * A `BottomNav` lê esse store e se oculta enquanto QUALQUER canvas de boot
 * estiver ativo — a revelação pós-splash nunca expõe a dock (nem um skeleton de
 * navegação) sobre o canvas.
 *
 * Não usa a classe `splash-root` porque `html.splash-seen` a ocultaria após o
 * primeiro boot; queremos a camada ativa em TODA inicialização fria.
 */

export const BOOT_CANVAS_BG = '#000000';
export const BOOT_CANVAS_GRADIENT =
  'radial-gradient(circle at 50% 42%, rgba(217,70,14,0.14) 0%, rgba(26,10,4,0.55) 16%, #000000 46%)';

let activeBootCanvases = 0;
const bootCanvasListeners = new Set<() => void>();

function notifyBootCanvasListeners() {
  for (const listener of bootCanvasListeners) listener();
}

function subscribeBootCanvas(listener: () => void) {
  bootCanvasListeners.add(listener);
  return () => {
    bootCanvasListeners.delete(listener);
  };
}

function getBootCanvasActiveSnapshot() {
  return activeBootCanvases > 0;
}

function getBootCanvasServerSnapshot() {
  return false;
}

/**
 * `true` enquanto qualquer canvas de boot estiver montado. Hidrata como `false`
 * (idêntico ao SSR) para não gerar mismatch; o efeito do canvas publica a
 * transição logo depois.
 */
export function useBootCanvasActive() {
  return useSyncExternalStore(
    subscribeBootCanvas,
    getBootCanvasActiveSnapshot,
    getBootCanvasServerSnapshot
  );
}

export function BootContinuation() {
  useEffect(() => {
    activeBootCanvases += 1;
    notifyBootCanvasListeners();
    return () => {
      activeBootCanvases = Math.max(0, activeBootCanvases - 1);
      notifyBootCanvasListeners();
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[70] h-[100dvh] w-full overflow-hidden overscroll-none touch-none"
      style={{
        backgroundColor: BOOT_CANVAS_BG,
        backgroundImage: BOOT_CANVAS_GRADIENT,
      }}
    />
  );
}
