import { SessionHydrating } from '@/components/features/session-hydrating';
import { listSavedInspirationIds } from '@/lib/services/saved-inspiration';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';
import GaleriaClient from './galeria-client';

export default async function GaleriaPage() {
  let perfil = null;
  try {
    perfil = await requireDashboardPerfil('cliente');
  } catch (error) {
    rethrowNextControlFlow(error);
    console.error('[dashboard/galeria] sessão indisponível', error);
    return <SessionHydrating />;
  }
  if (!perfil) return <SessionHydrating />;

  let savedIds: string[] = [];
  try {
    savedIds = await listSavedInspirationIds(perfil.id);
  } catch (error) {
    console.error('[dashboard/galeria] falha ao listar ids salvos', error);
    savedIds = [];
  }

  return (
    <div className="absolute inset-0 z-0 min-h-0 w-full max-w-none overflow-x-hidden overflow-y-auto overscroll-none bg-[#0a0a0c] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/20 via-[#0a0a0c] to-[#050505] pb-[var(--dock-clearance)] [-webkit-overflow-scrolling:touch]">
      <GaleriaClient savedIds={savedIds} />
    </div>
  );
}
