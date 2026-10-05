'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { OnboardingLoadingScreen } from '@/components/features/onboarding-loading-screen';
import { isOnboardingGrace, markOnboardingGrace } from '@/lib/utils/session';
import { LOGIN_PATH } from '@/lib/utils/auth-redirect';

const SIGNED_OUT_REDIRECT_MS = 8000;

export function ProfileWaiter() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const navigatingRef = useRef(false);
  const attemptedRef = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    if (isOnboardingGrace()) return;
    const timer = window.setTimeout(() => {
      if (isOnboardingGrace() || navigatingRef.current) return;
      router.push(LOGIN_PATH);
    }, SIGNED_OUT_REDIRECT_MS);
    return () => window.clearTimeout(timer);
  }, [isLoaded, isSignedIn, router]);

  const checkProfile = useCallback(async () => {
    if (navigatingRef.current) return;
    try {
      const token = await getToken({ skipCache: true });
      const response = await fetch('/api/perfil/ensure', {
        cache: 'no-store',
        credentials: 'include',
        headers: {
          accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (navigatingRef.current) return;
      if (response.status !== 200) {
        setFailed(true);
        return;
      }
      navigatingRef.current = true;
      markOnboardingGrace();
      router.push('/dashboard');
    } catch {
      setFailed(true);
    }
  }, [getToken, router]);

  useEffect(() => {
    if (!isLoaded || attemptedRef.current) return;
    attemptedRef.current = true;
    void checkProfile();
  }, [isLoaded, checkProfile]);

  const handleRetry = useCallback(() => {
    navigatingRef.current = false;
    setFailed(false);
    void checkProfile();
  }, [checkProfile]);

  return (
    <OnboardingLoadingScreen variant="sparkles">
      {failed ? (
        <button
          type="button"
          onClick={handleRetry}
          className="min-h-11 rounded-xl border border-orange-500/40 bg-orange-500/10 px-5 text-sm font-semibold text-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.25)] transition-colors hover:bg-orange-500/20"
        >
          Tentar novamente
        </button>
      ) : null}
    </OnboardingLoadingScreen>
  );
}

export default ProfileWaiter;
