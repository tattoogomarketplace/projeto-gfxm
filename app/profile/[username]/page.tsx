import { notFound } from 'next/navigation';
import { PublicProfileScreen } from '@/components/features/public-profile-screen';
import { SessionHydrating } from '@/components/features/session-hydrating';
import { getPublicProfileByUsername, PublicProfileError } from '@/lib/services/public-profile';
import { requireDashboardSession } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';
import { BRAND_NAME } from '@/lib/i18n/brands';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
};

/**
 * TATTOOGO MK — PERFIL PÚBLICO POR @USERNAME (APPLE-TIER)
 *
 * Porta pública de leitura do perfil alheio, no mesmo padrão de sessão das
 * rotas autenticadas. O handle é resolvido de forma blindada no servidor
 * (`getPublicProfileByUsername`) — nenhum dado sensível cruza a fronteira.
 * A geometria global (100dvh, safe-area e dock inferior) é herdada do
 * `app/layout.tsx`, portanto não há container próprio a redefinir aqui.
 */
export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  let viewerUsername: string | null = null;
  try {
    const session = await requireDashboardSession();
    if (!session) return <SessionHydrating />;
    viewerUsername = session.perfil?.username ?? null;
  } catch (error) {
    rethrowNextControlFlow(error);
    return <SessionHydrating />;
  }

  const { username } = await params;
  let data = null;
  try {
    data = await getPublicProfileByUsername(username);
  } catch (error) {
    if (error instanceof PublicProfileError && error.status === 404) {
      notFound();
    }
    rethrowNextControlFlow(error);
    console.error(`[profile] falha ao carregar perfil público no ${BRAND_NAME}`, error);
    notFound();
  }

  return <PublicProfileScreen data={data} viewerUsername={viewerUsername} />;
}
