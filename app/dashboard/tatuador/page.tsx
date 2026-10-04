import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import TatuadorDashboard from './tatuador-dashboard';

export default async function TatuadorDashboardPage() {
  const perfil = await requireDashboardPerfil('tatuador');
  if (!perfil) return null;
  return <TatuadorDashboard />;
}
