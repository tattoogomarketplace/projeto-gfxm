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
  const isOnboarding = isOnboardingPath(pathname);

  let perfil: LocalPerfil | null = null;
  let clerkUserId: string | null = null;

  try {
    const { userId } = await resolvePerfilSessionFromIncomingRequest();
    clerkUserId = userId;
  } catch {
    clerkUserId = null;
  }

  // Transição pós-OTP: `auth()` devolve userId nulo. Nunca chamar Prisma
  // nem renderizar children — o cliente hidrata e o waiter faz refresh.
  if (!clerkUserId) {
    return <ProfileWaiter />;
  }

  try {
    perfil = await findPerfilByClerkId(clerkUserId);
  } catch {
    // Erro transitório de banco não pode estourar o Error Boundary.
    perfil = null;
  }

  // Corrida pós-OTP: sessão Clerk ativa, mas o `Perfil` ainda está sendo
  // criado pelo auto-provisionamento. NUNCA renderizamos os children neste
  // estado — tanto nas rotas do painel quanto no onboarding — para evitar o
  // null-reference crash. O `ProfileWaiter` faz o polling idempotente e
  // dispara `router.refresh()` quando o registro fica visível.
  if (!perfil) {
    return <ProfileWaiter />;
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
    <div className="min-h-dvh bg-[var(--background)]">
      <AppShellBoundary title="TattooGo MK">{children}</AppShellBoundary>
    </div>
  );
}
