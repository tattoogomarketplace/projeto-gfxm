import { SessionHydrating } from '@/components/features/session-hydrating';
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
  return (
    <div className="min-h-[100dvh] w-full overflow-y-auto bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a0a03] via-[#050505] to-black pb-[calc(env(safe-area-inset-bottom)+8rem)]">
      <GaleriaClient />
    </div>
  );
}
