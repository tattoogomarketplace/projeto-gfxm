'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Error boundary de nível raiz do App Router.
 *
 * Cobre falhas lançadas por layouts aninhados (inclui o `DashboardLayout` e a
 * resolução de sessão/perfil) que não são capturadas por boundaries internos.
 * Mantém o `html`/`body` do root layout e exibe uma saída visível com retry,
 * evitando a tela preta muda durante a resolução assíncrona do perfil.
 */
export default function GlobalRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("FATAL CRASH:", error);
  }, [error]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-white">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-none px-6 pb-36 text-center [-webkit-overflow-scrolling:touch]">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-400 shadow-[0_0_22px_rgba(249,115,22,0.25)]">
        <AlertTriangle className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">
        TattooGo MK
      </p>
      <h1 className="mt-2 text-xl font-bold tracking-tight">Algo saiu do traço</h1>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">
        Não conseguimos carregar a aplicação agora. Tente novamente em instantes.
      </p>
      <p className="mt-3 max-w-md break-words text-red-500">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-5 text-sm font-semibold text-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.25)] transition-colors hover:bg-orange-500/20"
      >
        <RotateCcw className="h-4 w-4" strokeWidth={2} />
        Tentar novamente
      </button>
      </div>
    </div>
  );
}
