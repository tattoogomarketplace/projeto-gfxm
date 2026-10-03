import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShellBoundary } from '@/components/layout/app-shell-boundary';
import { ProfileWaiter } from '@/components/features/profile-waiter';
import { TatuadorKycBlock } from '@/components/features/tatuador-kyc-block';
import { findPerfilByClerkId, type LocalPerfil } from '@/lib/services/ensure-perfil';
import { resolvePerfilSessionFromIncomingRequest } from '@/lib/services/perfil-session';
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

  let perfil: LocalPerfil | null = null;
  let clerkUserId = '';

  if (pathname && !isOnboardingPath(pathname)) {
    let mustOnboard = false;
    let perfilMissing = false;
    let authenticated = false;

    try {
      const { userId } = await resolvePerfilSessionFromIncomingRequest();
      clerkUserId = userId ?? '';
      authenticated = Boolean(userId);
    } catch {
      // Falha ao resolver a sessão: tratamos como não autenticado; o
      // middleware redireciona quem realmente é anônimo.
      authenticated = false;
    }

    if (authenticated) {
      try {
        perfil = await findPerfilByClerkId(clerkUserId);
      } catch {
        // Erro transitório de banco não pode estourar o Error Boundary.
        perfil = null;
      }

      if (perfil) {
        mustOnboard = !isOnboardingComplete(perfil);
      } else {
        // Corrida pós-registro: autenticado no Clerk, mas o Perfil ainda não
        // foi persistido (webhook em processamento) — ou a leitura falhou de
        // forma transitória. NÃO lançamos erro: delegamos a espera ao cliente,
        // que pinga o auto-provisionamento e revalida até o registro existir.
        perfilMissing = true;
      }
    }

    if (perfilMissing) {
      return <ProfileWaiter />;
    }
    if (mustOnboard) {
      redirect(ONBOARDING_PATH);
    }
  }

  // Bloqueio global de KYC: um tatuador não homologado não acessa NENHUMA rota
  // do painel (Portfólio/Agendar/Chat/Perfil). Como o AppShell com a navegação
  // inferior vive aqui, retornar cedo garante que as abas nem sejam renderizadas.
  const isKycPendentePath =
    pathname === '/dashboard/kyc-pendente' || pathname.startsWith('/dashboard/kyc-pendente/');
  if (
    perfil &&
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
    <div className="min-h-dvh bg-[var(--background)]">
      <AppShellBoundary title="TattooGo MK">{children}</AppShellBoundary>
    </div>
  );
}
