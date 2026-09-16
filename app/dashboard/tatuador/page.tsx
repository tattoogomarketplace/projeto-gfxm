import { redirect } from 'next/navigation';
import { checkAccess } from '@/lib/utils/rbac-guard';
import TatuadorDashboard from './tatuador-dashboard';

export default async function TatuadorDashboardPage() {
  const access = await checkAccess('tatuador');

  if (!access.allowed) {
    redirect(access.redirect);
  }

  return <TatuadorDashboard />;
}
