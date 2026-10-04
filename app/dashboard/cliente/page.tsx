import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import ClienteDashboard from './cliente-dashboard';

export default async function ClienteDashboardPage() {
  const perfil = await requireDashboardPerfil('cliente');
  if (!perfil) return null;
  return <ClienteDashboard />;
}
