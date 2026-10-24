import { SessionHydrating } from '@/components/features/session-hydrating';
import type { InspirationItem } from '@/lib/gallery-mock';
import { listSavedInspirations } from '@/lib/services/saved-inspiration';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';
import { parseAppTab } from '@/lib/utils/route-tab';
import ClienteDashboard from './cliente-dashboard';

type DashboardPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ClienteDashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab = parseAppTab(tabParam) ?? 'portfolio';

  let perfil = null;
  try {
    perfil = await requireDashboardPerfil('cliente');
  } catch (error) {
    rethrowNextControlFlow(error);
    console.error('[dashboard/cliente] sessão indisponível', error);
    return <SessionHydrating />;
  }
  if (!perfil) return <SessionHydrating />;

  let savedItems: InspirationItem[] = [];
  try {
    savedItems = await listSavedInspirations(perfil.id, { take: 5 });
  } catch (error) {
    console.error('[dashboard/cliente] falha ao listar inspirações salvas', error);
    savedItems = [];
  }

  return <ClienteDashboard initialTab={initialTab} savedItems={savedItems} />;
}
