import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import EstudioDashboard from './estudio-dashboard';

export default async function EstudioDashboardPage() {
  await requireDashboardPerfil('estudio');
  return <EstudioDashboard />;
}
