import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import EstudioDashboard from './estudio-dashboard';

export default async function EstudioDashboardPage() {
  const perfil = await requireDashboardPerfil('estudio');
  if (!perfil) return null;
  return <EstudioDashboard />;
}
