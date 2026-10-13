'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';

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
 * Fase 25.3 — BLINDAGEM DE CAMADAS (o "leak" pós-splash):
 *
 * O `<main>` do Root Layout é `relative z-0`, ou seja, É um stacking context.
 * Um canvas `fixed z-[70]` renderizado DENTRO dele nunca consegue cobrir irmãos
 * do `<main>` (ex.: a `BottomNav`, `z-[60]`), e o header/FAB do casco podiam
 * surgir por um frame antes da fronteira de Suspense assumir. Para eliminar
 * definitivamente qualquer ícone flutuando no vazio, o `BootCanvasOverlay` é
 * montado na RAIZ (irmão do `<main>`, no contexto de empilhamento do `<body>`),
 * ACIMA de todo o chrome do casco e logo abaixo do splash (`z-[9999]`).
 *
 * Além de pintar, o `BootContinuation` registra a própria presença no store
 * global. A `BottomNav` e o overlay raiz leem esse store: enquanto QUALQUER
 * canvas de boot estiver ativo, nenhuma camada de aplicação é revelada.
 *
 * Não usa a classe `splash-root` porque `html.splash-seen` a ocultaria após o
 * primeiro boot; queremos a camada ativa em TODA inicialização fria.
 */

export const BOOT_CANVAS_BG = '#000000';
export const BOOT_CANVAS_GRADIENT =
  'radial-gradient(circle at 50% 42%, rgba(217,70,14,0.14) 0%, rgba(26,10,4,0.55) 16%, #000000 46%)';

/**
 * Camada de pintura pura — sem store, sem efeitos. Fica `fixed inset-0` e
 * opaca; o `className` decide o nível de empilhamento.
 */
function BootCanvas({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'fixed inset-0 h-[100dvh] w-full overflow-hidden overscroll-none touch-none',
        className
      )}
      style={{
        backgroundColor: BOOT_CANVAS_BG,
        backgroundImage: BOOT_CANVAS_GRADIENT,
      }}
    />
  );
}

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

/**
 * Fallback de conteúdo (fronteiras de Suspense / hidratação de sessão). Publica
 * a própria presença no store e pinta o canvas no seu contexto de empilhamento.
 */
export function BootContinuation({ className = 'z-[70]' }: { className?: string }) {
  useEffect(() => {
    activeBootCanvases += 1;
    notifyBootCanvasListeners();
    return () => {
      activeBootCanvases = Math.max(0, activeBootCanvases - 1);
      notifyBootCanvasListeners();
    };
  }, []);

  return <BootCanvas className={className} />;
}

/**
 * Overlay de boot montado na raiz do `<body>` (fora do stacking context do
 * `<main>`). Cobre TODO o chrome persistente do casco — header, gatilho de
 * menu, FAB e dock — enquanto qualquer canvas de boot estiver ativo. Como o
 * splash é `z-[9999]`, este overlay fica imediatamente abaixo dele: a saída do
 * splash revela o mesmo canvas até o conteúdo real estar pronto.
 */
export function BootCanvasOverlay() {
  const active = useBootCanvasActive();
  if (!active) return null;
  return <BootCanvas className="z-[9000]" />;
}
