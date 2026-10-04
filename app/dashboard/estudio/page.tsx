import { SessionHydrating } from '@/components/features/session-hydrating';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';
import EstudioDashboard from './estudio-dashboard';

export default async function EstudioDashboardPage() {
  let perfil = null;
  try {
    perfil = await requireDashboardPerfil('estudio');
  } catch (error) {
    rethrowNextControlFlow(error);
    console.error('[dashboard/estudio] sessão indisponível', error);
    return <SessionHydrating />;
  }
  if (!perfil) return <SessionHydrating />;
  return <EstudioDashboard />;
}
