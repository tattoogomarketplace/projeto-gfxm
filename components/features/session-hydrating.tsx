'use client';

import { memo } from 'react';
import { usePathname } from 'next/navigation';
import { DashboardHomeSkeleton } from '@/components/features/dashboard-home-skeleton';
import {
  AgendaPaymentsSkeleton,
  AppRouteSkeleton,
  ArtistHubSkeleton,
  ChatInboxSkeleton,
  GalleryGridSkeleton,
  ProfileSkeleton,
  PublicProfileSkeleton,
  StudioDashboardSkeleton,
} from '@/components/ui/route-skeletons';

/**
 * Session-hydration state of the panels.
 *
 * Rendered as page content while `requireDashboardPerfil` has not resolved.
 * Paints the same Dark Luxury skeleton as the destination `loading.tsx`
 * (inside the App Shell) rather than a blank canvas or a foreign home, so
 * Clerk/Prisma resolution never flashes a second loading screen.
 */
function resolveHydrationSkeleton(pathname: string) {
  if (pathname.startsWith('/dashboard/tatuador')) return <ArtistHubSkeleton />;
  if (pathname.startsWith('/dashboard/estudio')) return <StudioDashboardSkeleton />;
  if (pathname.startsWith('/dashboard/cliente')) return <DashboardHomeSkeleton />;
  if (pathname.startsWith('/dashboard/agenda') || pathname.startsWith('/dashboard/pagamentos')) {
    return <AgendaPaymentsSkeleton />;
  }
  if (pathname.startsWith('/dashboard/chat')) return <ChatInboxSkeleton />;
  if (
    pathname.startsWith('/dashboard/artistas') ||
    pathname.startsWith('/dashboard/galeria') ||
    pathname.startsWith('/dashboard/inspiracoes') ||
    pathname.startsWith('/dashboard/salvos')
  ) {
    return <GalleryGridSkeleton />;
  }
  if (pathname.startsWith('/dashboard/perfil')) return <ProfileSkeleton />;
  if (pathname.startsWith('/dashboard/artista/') || pathname.startsWith('/profile/')) {
    return <PublicProfileSkeleton />;
  }
  return <AppRouteSkeleton />;
}

function SessionHydratingBase() {
  const pathname = usePathname();
  return resolveHydrationSkeleton(pathname);
}

export const SessionHydrating = memo(SessionHydratingBase);
