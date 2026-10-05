import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShellBoundary } from '@/components/layout/app-shell-boundary';
import { ProfileWaiter } from '@/components/features/profile-waiter';
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
    const session = await resolvePerfilSessionFromIncomingRequest();
    clerkUserId = session.userId;
    if (clerkUserId) {
      perfil = await findPerfilByClerkId(clerkUserId);
      if (!perfil || perfil.deleted_at) {
        perfil = await ensurePerfilFromClerk(
          buildProfileSource(clerkUserId, session.user),
          session.metadataRole
        );
      }
    }
  } catch (error) {
    console.error('[dashboard/layout] sessão/perfil indisponível', error);
    clerkUserId = clerkUserId || null;
    perfil = null;
  }

  if (!clerkUserId) {
    return <ProfileWaiter />;
  }

  if (!perfil || perfil.deleted_at) {
    return (
      <div className="luxury-canvas flex min-h-screen flex-col text-neutral-900 dark:text-white">
        <AppShellBoundary title="TattooGo MK">{children}</AppShellBoundary>
      </div>
    );
  }

  if (!isOnboarding && !isOnboardingComplete(perfil)) {
    redirect(ONBOARDING_PATH);
  }

  // Bloqueio global de KYC: um tatuador não homologado não acessa NENHUMA rota
  // do painel (Portfólio/Agendar/Chat/Perfil). Como o AppShell com a navegação
  // inferior vive aqui, retornar cedo garante que as abas nem sejam renderizadas.
  // O onboarding é a exceção: ele precede o KYC e não pode ser bloqueado.
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

  return (
    <div className="luxury-canvas flex min-h-screen flex-col text-neutral-900 dark:text-white">
      <AppShellBoundary title="TattooGo MK">{children}</AppShellBoundary>
    </div>
  );
}
