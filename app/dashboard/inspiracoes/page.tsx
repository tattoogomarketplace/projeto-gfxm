export const dynamic = 'force-dynamic';

import { SavedInspirationsGallery } from '@/components/features/saved-inspirations-gallery';
import { SessionHydrating } from '@/components/features/session-hydrating';
import type { InspirationItem } from '@/lib/gallery-mock';
import { listSavedInspirations } from '@/lib/services/saved-inspiration';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';

export default async function InspiracoesPage() {
  let perfil = null;
  try {
    perfil = await requireDashboardPerfil('cliente');
  } catch (error) {
    rethrowNextControlFlow(error);
    console.error('[dashboard/inspiracoes] sessão indisponível', error);
    return <SessionHydrating />;
  }
  if (!perfil) return <SessionHydrating />;

  let items: InspirationItem[] = [];
  try {
    items = await listSavedInspirations(perfil.clerk_id ?? '');
  } catch (error) {
    console.error('[dashboard/inspiracoes] falha ao listar salvos', error);
    items = [];
  }

  return (
    <div className="absolute inset-0 z-0 min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-none bg-[#121212] pb-[calc(env(safe-area-inset-bottom)+5rem)] [-webkit-overflow-scrolling:touch]">
      <SavedInspirationsGallery items={items} />
    </div>
  );
}
