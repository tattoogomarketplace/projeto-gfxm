import { SavedInspirationsGallery } from '@/components/features/saved-inspirations-gallery';
import { SessionHydrating } from '@/components/features/session-hydrating';
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
  return (
    <div className="absolute inset-0 z-0 min-h-0 w-full max-w-none overflow-x-hidden overflow-y-auto overscroll-none bg-[#121212] pb-[calc(env(safe-area-inset-bottom)+5rem)] [-webkit-overflow-scrolling:touch]">
      <SavedInspirationsGallery />
    </div>
  );
}
