import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import TatuadorDashboard from './tatuador-dashboard';

export default async function TatuadorDashboardPage() {
  await requireDashboardPerfil('tatuador');
  return <TatuadorDashboard />;
}
