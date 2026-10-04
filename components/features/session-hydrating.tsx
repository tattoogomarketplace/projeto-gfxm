'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';

/** Janela pós-OTP: só redireciona se a sessão continuar morta após este prazo. */
const SIGNED_OUT_REDIRECT_MS = 4000;

export function SessionHydrating({ label = 'Carregando sessão...' }: { label?: string }) {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    const timer = window.setTimeout(() => {
      window.location.href = '/login';
    }, SIGNED_OUT_REDIRECT_MS);
    return () => window.clearTimeout(timer);
  }, [isLoaded, isSignedIn]);

  return (
    <div className="flex h-screen min-h-dvh items-center justify-center bg-[#121212] px-6 text-center text-white">
      <TattooMachineLoader label={label} />
    </div>
  );
}
