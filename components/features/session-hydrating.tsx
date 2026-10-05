'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { OnboardingLoadingScreen } from '@/components/features/onboarding-loading-screen';
import { isOnboardingGrace } from '@/lib/utils/session';

/** Janela pós-OTP: só redireciona se a sessão continuar morta após este prazo. */
const SIGNED_OUT_REDIRECT_MS = 8000;

export function SessionHydrating({ label = 'Carregando sessão...' }: { label?: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || isSignedIn || isOnboardingGrace()) return;
    const timer = window.setTimeout(() => {
      if (isOnboardingGrace()) return;
      router.push('/login');
    }, SIGNED_OUT_REDIRECT_MS);
    return () => window.clearTimeout(timer);
  }, [isLoaded, isSignedIn, router]);

  void label;
  return <OnboardingLoadingScreen />;
}
