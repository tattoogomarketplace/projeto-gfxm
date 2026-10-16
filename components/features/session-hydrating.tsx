'use client';

import { memo } from 'react';
import { ArtistHubSkeleton } from '@/components/ui/route-skeletons';

/**
 * Session-hydration state of the panels.
 *
 * Rendered as page content while `requireDashboardPerfil` has not resolved.
 * Paints the premium Dark Luxury skeleton (inside the App Shell) rather than a
 * blank black canvas, sealing the blank-screen gap during Clerk/Prisma
 * resolution.
 */
function SessionHydratingBase() {
  return <ArtistHubSkeleton />;
}

export const SessionHydrating = memo(SessionHydratingBase);
