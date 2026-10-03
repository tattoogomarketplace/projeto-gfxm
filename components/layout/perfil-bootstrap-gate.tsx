'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

const RETRY_DELAY_MS = 1500;
const MAX_RETRIES = 20;

/**
 * Estado de espera durante a corrida pós-registro.
 *
 * O usuário já está autenticado no Clerk, mas o `Perfil` ainda não foi
 * persistido (webhook em processamento). Em vez de lançar erro ou redirecionar
 * para o onboarding, mantemos a UI viva: forçamos o auto-provisionamento
 * idempotente (`/api/perfil/ensure`) e revalidamos o Server Component a cada
 * 1,5s até o perfil existir — momento em que este gate é desmontado.
 */
export function PerfilBootstrapGate() {
  const router = useRouter();
  const retriesRef = useRef(0);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    if (exhausted) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleRetry = () => {
      timer = setTimeout(async () => {
        if (cancelled) return;
        if (retriesRef.current >= MAX_RETRIES) {
          setExhausted(true);
          return;
        }
        retriesRef.current += 1;
        try {
          await fetch('/api/perfil/ensure', {
            cache: 'no-store',
            credentials: 'include',
          });
        } catch {
          // Falha de rede: a próxima tentativa cobre.
        }
        if (cancelled) return;
        router.refresh();
        scheduleRetry();
      }, RETRY_DELAY_MS);
    };

    scheduleRetry();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [router, exhausted]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#121212] px-6 text-center text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(249,115,22,0.18),transparent_60%)]"
      />
      <div className="relative flex flex-col items-center gap-6">
        <span className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-orange-500/20" />
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-orange-500/60 border-t-orange-500 shadow-[0_0_28px_rgba(249,115,22,0.55)]" />
          <Sparkles className="h-7 w-7 text-orange-400" strokeWidth={1.75} />
        </span>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">
            TattooGo MK
          </p>
          <h1 className="text-xl font-bold tracking-tight text-white">Preparando seu espaço...</h1>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-zinc-400">
            Estamos finalizando a criação do seu perfil. Isso leva só um instante.
          </p>
        </div>
        {exhausted ? (
          <button
            type="button"
            onClick={() => {
              retriesRef.current = 0;
              setExhausted(false);
            }}
            className="min-h-11 rounded-xl border border-orange-500/40 bg-orange-500/10 px-5 text-sm font-semibold text-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.25)] transition-colors hover:bg-orange-500/20"
          >
            Tentar novamente
          </button>
        ) : null}
      </div>
    </div>
  );
}
