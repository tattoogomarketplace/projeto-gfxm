'use client';

import { memo } from 'react';
import { usePathname } from 'next/navigation';
import { resolveDestinationSkeleton } from '@/components/features/destination-route-skeleton';

/**
 * Session-hydration state of the panels.
 *
 * Rendered as page content while `requireDashboardPerfil` has not resolved.
 * Paints the same Dark Luxury skeleton as the destination `loading.tsx`
 * (inside the App Shell) rather than a blank canvas or a foreign home, so
 * Clerk/Prisma resolution never flashes a second loading screen.
 */
function SessionHydratingBase() {
  const pathname = usePathname();
  return resolveDestinationSkeleton(pathname);
}

export const SessionHydrating = memo(SessionHydratingBase);
