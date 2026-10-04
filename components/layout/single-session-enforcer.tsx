'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { enforceSingleSession } from '@/app/actions/auth-actions';

/**
 * After the current Clerk session is fully established, revoke every other
 * active session for this user. Runs once per session in the background so
 * OTP / onboarding are never blocked.
 */
export function SingleSessionEnforcer() {
  const { isLoaded, isSignedIn, sessionId } = useAuth();
  const inFlight = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !sessionId || inFlight.current) return;

    inFlight.current = true;
    void enforceSingleSession(sessionId)
      .then((result) => {
        if (!result.ok) inFlight.current = false;
      })
      .catch((error) => {
        console.error('Single-session enforcement error:', error);
        inFlight.current = false;
      });
  }, [isLoaded, isSignedIn, sessionId]);

  return null;
}
