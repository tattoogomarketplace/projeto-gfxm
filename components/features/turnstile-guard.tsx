'use client';

import { Component, ReactNode } from 'react';
import dynamic from 'next/dynamic';

const Turnstile = dynamic(
  () => import('@marsidev/react-turnstile').then((mod) => mod.Turnstile),
  { ssr: false, loading: () => null }
);

class TurnstileErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export function getTurnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || '';
}

export function isTurnstileEnabled() {
  return Boolean(getTurnstileSiteKey());
}

type TurnstileGuardProps = {
  onToken: (token: string | undefined) => void;
};

export function TurnstileGuard({ onToken }: TurnstileGuardProps) {
  const siteKey = getTurnstileSiteKey();
  if (!siteKey) return null;

  return (
    <TurnstileErrorBoundary>
      <Turnstile
        siteKey={siteKey}
        onSuccess={(token) => onToken(token)}
        onError={() => onToken(undefined)}
        onExpire={() => onToken(undefined)}
        onTimeout={() => onToken(undefined)}
      />
    </TurnstileErrorBoundary>
  );
}
