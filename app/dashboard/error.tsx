'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Error boundary do segmento `/dashboard`.
 *
 * Captura falhas de renderização das páginas e layouts aninhados (por exemplo,
 * um erro transitório de banco ou Clerk) e exibe uma saída visível com ação de
 * recuperação — nunca uma tela preta ou branca vazia. O erro segue registrado
 * no console para observabilidade.
 */
export default function DashboardError({
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
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(249,115,22,0.16),transparent_60%)]"
      />
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-none px-6 pb-36 text-center [-webkit-overflow-scrolling:touch]">
      <div className="relative flex w-full max-w-sm flex-col items-center gap-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-400 shadow-[0_0_22px_rgba(249,115,22,0.25)]">
          <AlertTriangle className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">
            TattooGo MK
          </p>
          <h1 className="text-xl font-bold tracking-tight">Algo saiu do traço</h1>
          <p className="text-sm leading-relaxed text-zinc-400">
            Não conseguimos carregar esta área agora. Tente novamente — seus dados
            permanecem seguros.
          </p>
          <p className="mt-2 break-words text-red-500">{error.message}</p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-5 text-sm font-semibold text-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.25)] transition-colors hover:bg-orange-500/20"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2} />
          Tentar novamente
        </button>
      </div>
      </div>
    </div>
  );
}
