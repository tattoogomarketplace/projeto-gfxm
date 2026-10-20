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
    <div className="min-h-[100dvh] w-full overflow-y-auto bg-[#030303] bg-[radial-gradient(ellipse_100%_40%_at_50%_0%,rgba(249,115,22,0.1),rgba(0,0,0,0))] pb-[calc(env(safe-area-inset-bottom)+8rem)]">
      <GaleriaClient />
    </div>
  );
}
