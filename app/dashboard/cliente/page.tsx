import { SessionHydrating } from '@/components/features/session-hydrating';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';
import ClienteDashboard from './cliente-dashboard';

export default async function ClienteDashboardPage() {
  let perfil = null;
  try {
    perfil = await requireDashboardPerfil('cliente');
  } catch (error) {
    rethrowNextControlFlow(error);
    console.error('[dashboard/cliente] sessão indisponível', error);
    return <SessionHydrating />;
  }
  if (!perfil) return <SessionHydrating />;
  return <ClienteDashboard />;
}
