import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShellBoundary } from '@/components/layout/app-shell-boundary';
import { PerfilBootstrapGate } from '@/components/layout/perfil-bootstrap-gate';
import { findPerfilByClerkId } from '@/lib/services/ensure-perfil';
import { resolvePerfilSessionFromIncomingRequest } from '@/lib/services/perfil-session';
import { isOnboardingComplete, isOnboardingPath, ONBOARDING_PATH } from '@/lib/utils/auth-redirect';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get('x-pathname') ?? '';

  if (pathname && !isOnboardingPath(pathname)) {
    let mustOnboard = false;
    let perfilMissing = false;
    try {
      const { userId } = await resolvePerfilSessionFromIncomingRequest();
      if (userId) {
        const perfil = await findPerfilByClerkId(userId);
        if (perfil) {
          mustOnboard = !isOnboardingComplete(perfil);
        } else {
          // Corrida pós-registro: autenticado no Clerk, mas o Perfil ainda não
          // foi persistido (webhook em processamento). Não tratamos como
          // "precisa de onboarding" nem deixamos estourar o Error Boundary:
          // renderizamos um gate que retenta até o registro existir.
          perfilMissing = true;
        }
      }
    } catch {
      mustOnboard = false;
    }
    if (perfilMissing) {
      return <PerfilBootstrapGate />;
    }
    if (mustOnboard) {
      redirect(ONBOARDING_PATH);
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--background)]">
      <AppShellBoundary title="TattooGo MK">{children}</AppShellBoundary>
    </div>
  );
}
