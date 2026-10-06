import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShellBoundary } from '@/components/layout/app-shell-boundary';
import { TatuadorKycBlock } from '@/components/features/tatuador-kyc-block';
import { ensurePerfilFromClerk, findPerfilByClerkId, type LocalPerfil } from '@/lib/services/ensure-perfil';
import { buildProfileSource, resolvePerfilSessionFromIncomingRequest } from '@/lib/services/perfil-session';
import {
  isKycApproved,
  isOnboardingComplete,
  isOnboardingPath,
  ONBOARDING_PATH,
} from '@/lib/utils/auth-redirect';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="luxury-canvas relative flex h-full min-h-0 w-full flex-col overflow-hidden overscroll-none bg-background text-neutral-900 select-none dark:text-white">
      <AppShellBoundary title="TattooGo MK">{children}</AppShellBoundary>
    </div>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get('x-pathname') ?? '';
  const isOnboarding = isOnboardingPath(pathname);

  if (isOnboarding) {
    return <>{children}</>;
  }

  let perfil: LocalPerfil | null = null;
  let clerkUserId: string | null = null;

  try {
    const session = await Promise.race([
      resolvePerfilSessionFromIncomingRequest(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
    clerkUserId = session?.userId ?? null;
    if (clerkUserId && session) {
      perfil = await Promise.race([
        findPerfilByClerkId(clerkUserId),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
      ]);
      if (!perfil || perfil.deleted_at) {
        perfil = await Promise.race([
          ensurePerfilFromClerk(
            buildProfileSource(clerkUserId, session.user),
            session.metadataRole
          ),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
        ]);
      }
    }
  } catch (error) {
    console.error('[dashboard/layout] sessão/perfil indisponível', error);
    clerkUserId = clerkUserId || null;
    perfil = null;
  }

  if (!clerkUserId || !perfil || perfil.deleted_at) {
    return <DashboardShell>{children}</DashboardShell>;
  }

  if (!isOnboarding && !isOnboardingComplete(perfil)) {
    redirect(ONBOARDING_PATH);
  }

  const isKycPendentePath =
    pathname === '/dashboard/kyc-pendente' || pathname.startsWith('/dashboard/kyc-pendente/');
  if (
    perfil &&
    !isOnboarding &&
    perfil?.role === 'tatuador' &&
    !isKycApproved(perfil?.kyc_status) &&
    !isKycPendentePath
  ) {
    return <TatuadorKycBlock userId={clerkUserId} status={perfil?.kyc_status} />;
  }

  if (isKycPendentePath) {
    return children;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
