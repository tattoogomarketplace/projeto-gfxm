import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import ClienteDashboard from './cliente-dashboard';

export default async function ClienteDashboardPage() {
  await requireDashboardPerfil('cliente');
  return <ClienteDashboard />;
}
