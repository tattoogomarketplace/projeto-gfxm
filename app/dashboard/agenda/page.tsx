import { ImmersiveAgenda } from '@/components/features/immersive-agenda';
import { SessionHydrating } from '@/components/features/session-hydrating';
import { getUserSessions } from '@/lib/services/user-sessions';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';

export default async function AgendaPage() {
  let perfil = null;
  try {
    perfil = await requireDashboardPerfil();
  } catch (error) {
    rethrowNextControlFlow(error);
    console.error('[dashboard/agenda] sessão indisponível', error);
    return <SessionHydrating />;
  }
  if (!perfil) return <SessionHydrating />;

  const payload = await getUserSessions(perfil.id);

  return <ImmersiveAgenda sessions={payload.sessions} />;
}
