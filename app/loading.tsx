import { SilentAppSkeleton } from '@/components/layout/silent-app-skeleton';

/**
 * Root route-level loading boundary.
 *
 * Not a splash replay, not a text loader, not a spinner: the exact same silent
 * structural skeleton used by the `<ClerkLoading>` layer, so the suspended
 * segment and the auth hydration gap are visually indistinguishable.
 */
export default function Loading() {
  return <SilentAppSkeleton />;
}
