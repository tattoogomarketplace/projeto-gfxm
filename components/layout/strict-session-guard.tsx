'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { checkCurrentSession } from '@/app/actions/auth-actions';
import {
  clearClientSession,
  isIntentionalSignOut,
  resetIntentionalSignOut,
} from '@/lib/utils/session';

const POLL_INTERVAL_MS = 15000;

/**
 * Global enforcer of the strict single-device policy.
 *
 * It watches the Clerk auth state and proactively polls the Backend API. When
 * the current session is revoked remotely (a second device logged in), the
 * user is intercepted with a blocking modal instead of the standard silent
 * redirect, then cleanly signed out on acknowledgement.
 */
export function StrictSessionGuard() {
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();

  const [kicked, setKicked] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const wasSignedIn = useRef(false);
  const kickedRef = useRef(false);

  const triggerKick = useCallback(() => {
    if (kickedRef.current) return;
    kickedRef.current = true;
    setKicked(true);
  }, []);

  // Detect a signed-out transition while the app was open. An intentional
  // logout is ignored; any other loss of authentication is a remote kick.
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      wasSignedIn.current = true;
      return;
    }

    if (wasSignedIn.current && !kickedRef.current) {
      if (isIntentionalSignOut()) {
        resetIntentionalSignOut();
        wasSignedIn.current = false;
      } else {
        triggerKick();
      }
    }
  }, [isLoaded, isSignedIn, triggerKick]);

  // Poll Clerk so a remote revocation is detected in real time, before the
  // session token naturally expires and Clerk falls back to its own redirect.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || kickedRef.current) return;

    let stopped = false;

    const verify = async () => {
      if (stopped || kickedRef.current) return;
      try {
        const { status } = await checkCurrentSession();
        if (!stopped && status === 'revoked') {
          triggerKick();
        }
      } catch {
        // Falha de rede: não pune o usuário, apenas tenta no próximo ciclo.
      }
    };

    const interval = window.setInterval(verify, POLL_INTERVAL_MS);
    const onFocus = () => void verify();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void verify();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    void verify();

    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isLoaded, isSignedIn, triggerKick]);

  const handleAcknowledge = useCallback(async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      clearClientSession();
      await clerk.signOut({ redirectUrl: '/login' });
    } catch {
      // Mesmo com falha do Clerk, garantimos a limpeza e a saída local.
    } finally {
      window.location.href = '/login';
    }
  }, [leaving, clerk]);

  if (!kicked) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="strict-session-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-6 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-3xl border border-orange-500/30 bg-zinc-950 p-8 text-center shadow-2xl"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/10">
          <span className="text-2xl font-bold text-orange-500">!</span>
        </div>
        <h2 id="strict-session-title" className="mt-5 text-xl font-bold text-white">
          Sessão encerrada por segurança
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Sua conta foi logada/acessada em outro dispositivo. Você será
          desconectado por segurança para proteger seus dados.
        </p>
        <button
          type="button"
          onClick={handleAcknowledge}
          disabled={leaving}
          className="mt-7 min-h-11 w-full rounded-lg bg-orange-500 py-3 font-bold text-black transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-50"
        >
          {leaving ? 'Saindo...' : 'OK'}
        </button>
      </motion.div>
    </div>
  );
}
