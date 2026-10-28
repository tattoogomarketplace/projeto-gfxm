'use client';

import type { ReactNode } from 'react';
import { PerfilSegmentSkeleton } from '@/app/dashboard/perfil/loading';
import { DashboardHomeSkeleton } from '@/components/features/dashboard-home-skeleton';
import { OnboardingSkeleton } from '@/components/features/onboarding-skeleton';
import {
  AgendaWorkspaceSkeleton,
  GaleriaFeedSkeleton,
  InspiracoesGridSkeleton,
} from '@/components/ui/destination-skeletons';
import {
  AgendaPaymentsSkeleton,
  AiChatSkeleton,
  AppRouteSkeleton,
  ArtistHubSkeleton,
  ArtistVerificationSkeleton,
  AuthFormSkeleton,
  ChatInboxSkeleton,
  GalleryGridSkeleton,
  KycPendingSkeleton,
  PublicProfileSkeleton,
  StudioDashboardSkeleton,
  UsernameOnboardingSkeleton,
} from '@/components/ui/route-skeletons';

function isAt(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function hidesAppShellHeader(pathname: string): boolean {
  if (!pathname.startsWith('/dashboard')) return false;
  return (
    isAt(pathname, '/dashboard/onboarding') ||
    isAt(pathname, '/dashboard/ai') ||
    isAt(pathname, '/dashboard/kyc-pendente') ||
    isAt(pathname, '/dashboard/seja-tatuador') ||
    isAt(pathname, '/dashboard/mapa') ||
    isAt(pathname, '/dashboard/chat') ||
    isAt(pathname, '/dashboard/artista') ||
    /^\/dashboard\/artistas\/.+/.test(pathname) ||
    isAt(pathname, '/dashboard/agenda') ||
    isAt(pathname, '/dashboard/galeria') ||
    isAt(pathname, '/dashboard/inspiracoes') ||
    isAt(pathname, '/dashboard/salvos') ||
    isAt(pathname, '/dashboard/perfil')
  );
}

export function isSelfScrollingPath(pathname: string): boolean {
  return (
    hidesAppShellHeader(pathname) ||
    isAt(pathname, '/dashboard/perfil/configuracoes')
  );
}

export function isAuthPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/register/') ||
    pathname === '/forgot-password'
  );
}

export function resolveDestinationSkeleton(pathname: string): ReactNode {
  if (pathname === '/' || pathname === '/dashboard') return null;
  if (isAuthPath(pathname)) return <AuthFormSkeleton />;
  if (isAt(pathname, '/dashboard/tatuador')) return <ArtistHubSkeleton />;
  if (isAt(pathname, '/dashboard/estudio')) return <StudioDashboardSkeleton />;
  if (isAt(pathname, '/dashboard/cliente')) return <DashboardHomeSkeleton />;
  if (isAt(pathname, '/dashboard/agenda')) return <AgendaWorkspaceSkeleton />;
  if (isAt(pathname, '/dashboard/pagamentos')) return <AgendaPaymentsSkeleton />;
  if (isAt(pathname, '/dashboard/chat')) return <ChatInboxSkeleton />;
  if (isAt(pathname, '/dashboard/galeria')) return <GaleriaFeedSkeleton />;
  if (isAt(pathname, '/dashboard/inspiracoes') || isAt(pathname, '/dashboard/salvos')) {
    return <InspiracoesGridSkeleton />;
  }
  if (isAt(pathname, '/dashboard/perfil')) return <PerfilSegmentSkeleton />;
  if (isAt(pathname, '/dashboard/onboarding/username')) return <UsernameOnboardingSkeleton />;
  if (isAt(pathname, '/dashboard/onboarding')) return <OnboardingSkeleton />;
  if (isAt(pathname, '/dashboard/ai')) return <AiChatSkeleton />;
  if (isAt(pathname, '/dashboard/kyc-pendente')) return <KycPendingSkeleton />;
  if (isAt(pathname, '/dashboard/seja-tatuador')) return <ArtistVerificationSkeleton />;
  if (isAt(pathname, '/dashboard/artista') || isAt(pathname, '/profile')) {
    return <PublicProfileSkeleton />;
  }
  if (/^\/dashboard\/artistas\/.+/.test(pathname)) return <PublicProfileSkeleton />;
  if (pathname === '/dashboard/artistas') return <GalleryGridSkeleton />;
  if (pathname === '/dashboard/avaliacoes') return <GalleryGridSkeleton />;
  return <AppRouteSkeleton />;
}
