'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Sparkles } from 'lucide-react';

/** Intervalo de polling da existência do Perfil. */
const POLL_INTERVAL_MS = 1500;
/** Teto de tentativas antes de oferecer retry manual (evita loop infinito). */
const MAX_ATTEMPTS = 40;

/**
 * Espera ativa pela persistência do `Perfil` (corrida pós-registro).
 *
 * O Server Component do dashboard não pode lançar/estourar o Error Boundary
 * quando o usuário já está autenticado no Clerk mas o registro local ainda não
 * existe (webhook em processamento). Este componente assume o controle no
 * cliente: pinga `/api/perfil/ensure` (idempotente, auto-provisiona e devolve o
 * `perfil`) a cada 1,5s e SÓ chama `router.refresh()` quando o perfil existe,
 * revalidando os Server Components sem depender de cache/retry no servidor.
 *
 * 401 durante sessão pendente/inicializando (ex.: task Clerk ainda travando o
 * token) NÃO redireciona nem lança: tratamos como estado de espera e
 * continuamos o polling até a sessão ficar ativa.
 */
export function ProfileWaiter() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const attemptsRef = useRef(0);
  const lastRefreshRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (!isLoaded) {
      return () => {
        cancelled = true;
        stopPolling();
      };
    }

    if (!isSignedIn) {
      return () => {
        cancelled = true;
        stopPolling();
      };
    }

    const checkProfile = async () => {
      if (cancelled) return;

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setExhausted(true);
        stopPolling();
        return;
      }
      attemptsRef.current += 1;

      try {
        const response = await fetch('/api/perfil/ensure', {
          cache: 'no-store',
          credentials: 'include',
          headers: { accept: 'application/json' },
        });
        if (cancelled) return;

        // Sessão travada/inicializando: o token ainda não autentica a API.
        // Mantemos o estado de espera em vez de redirecionar ou lançar.
        if (response.status === 401) return;

        if (!response.ok) return;

        const data = (await response.json().catch(() => null)) as
          | { perfil?: unknown }
          | null;

        if (data?.perfil) {
          // Perfil existe: revalida os Server Components. O refresh é
          // re-solicitado (com throttle) enquanto este componente continuar
          // montado, cobrindo atraso de leitura (réplica) logo após a escrita —
          // antes, um único refresh que corresse antes da visibilidade do
          // registro deixava o usuário preso no loader até o reload manual.
          const now = Date.now();
          if (now - lastRefreshRef.current >= POLL_INTERVAL_MS) {
            lastRefreshRef.current = now;
            router.refresh();
          }
        }
      } catch {
        // Rede instável ou sessão ainda não pronta: a próxima iteração cobre.
      }
    };

    void checkProfile();
    intervalRef.current = setInterval(checkProfile, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [router, restartKey, isLoaded, isSignedIn]);

  const handleRetry = useCallback(() => {
    attemptsRef.current = 0;
    lastRefreshRef.current = 0;
    setExhausted(false);
    setRestartKey((key) => key + 1);
  }, []);

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
            onClick={handleRetry}
            className="min-h-11 rounded-xl border border-orange-500/40 bg-orange-500/10 px-5 text-sm font-semibold text-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.25)] transition-colors hover:bg-orange-500/20"
          >
            Tentar novamente
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default ProfileWaiter;
