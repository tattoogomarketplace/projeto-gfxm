import { SessionHydrating } from '@/components/features/session-hydrating';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';
import { parseAppTab } from '@/lib/utils/route-tab';
import TatuadorDashboard from './tatuador-dashboard';

type DashboardPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function TatuadorDashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab = parseAppTab(tabParam) ?? 'portfolio';

  let perfil = null;
  try {
    perfil = await requireDashboardPerfil('tatuador');
  } catch (error) {
    rethrowNextControlFlow(error);
    console.error('[dashboard/tatuador] sessão indisponível', error);
    return <SessionHydrating />;
  }
  if (!perfil) return <SessionHydrating />;
  return <TatuadorDashboard initialTab={initialTab} />;
}
