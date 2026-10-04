import { SessionHydrating } from '@/components/features/session-hydrating';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';
import TatuadorDashboard from './tatuador-dashboard';

export default async function TatuadorDashboardPage() {
  let perfil = null;
  try {
    perfil = await requireDashboardPerfil('tatuador');
  } catch (error) {
    rethrowNextControlFlow(error);
    console.error('[dashboard/tatuador] sessão indisponível', error);
    return <SessionHydrating />;
  }
  if (!perfil) return <SessionHydrating />;
  return <TatuadorDashboard />;
}
