import { DashboardHomeSkeleton } from '@/components/features/dashboard-home-skeleton';

/**
 * Route-level fallback of `/dashboard/*`.
 *
 * Paints the premium Dark Luxury content skeleton inside the already-resolved
 * App Shell — the dock and header stay visible. Unified with the authentication
 * handoff (`<ClerkLoading>` -> `BootShellSkeleton`) on the SAME
 * `DashboardHomeSkeleton`, so the boot skeleton and this route boundary are
 * pixel-identical (zero layout shift before the hydrated feed lands).
 */
export default function DashboardLoading() {
  return <DashboardHomeSkeleton />;
}
