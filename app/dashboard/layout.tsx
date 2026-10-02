import { headers } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AppShellBoundary } from '@/components/layout/app-shell-boundary';
import { findPerfilByClerkId } from '@/lib/services/ensure-perfil';
import { ONBOARDING_PATH } from '@/lib/utils/auth-redirect';

// O guard do painel lê o perfil autenticado (Clerk + Prisma). Renderizar o
// segmento de forma dinâmica e sem revalidação impede que uma árvore em cache
// sirva um estado defasado e devolva o usuário para o onboarding logo após
// ele entrar no painel.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isOnboardingPath(pathname: string): boolean {
  return pathname === ONBOARDING_PATH || pathname.startsWith(`${ONBOARDING_PATH}/`);
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get('x-pathname') ?? '';

  // Trava impenetrável: enquanto o onboarding não estiver confirmado no banco
  // (`has_seen_welcome_notice`), QUALQUER acesso a outra rota do painel é
  // devolvido ao onboarding — inclusive por manipulação direta da URL.
  if (pathname && !isOnboardingPath(pathname)) {
    const { userId } = await auth();
    if (userId) {
      let mustOnboard = false;
      try {
        const perfil = await findPerfilByClerkId(userId);
        // Sem perfil OU perfil ainda não confirmado no banco: onboarding
        // obrigatório. Cobre também rotas client-side sem guard próprio.
        mustOnboard = Boolean(
          !perfil || perfil.deleted_at || !perfil.has_seen_welcome_notice
        );
      } catch {
        // Falha de leitura não pode travar o painel por completo; os guards
        // de página (`requireDashboardPerfil`) reforçam a mesma checagem.
      }
      // O `redirect` lança NEXT_REDIRECT: precisa ficar FORA do try/catch para
      // não ser engolido pelo tratador de erro acima.
      if (mustOnboard) {
        redirect(ONBOARDING_PATH);
      }
    }
  }

  return (
    <div className="min-h-dvh bg-[var(--background)]">
      <AppShellBoundary title="TattooGo MK">{children}</AppShellBoundary>
    </div>
  );
}
