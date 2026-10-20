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
    <div className="relative h-[100dvh] w-full overflow-y-auto bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.05),rgba(255,255,255,0))] pb-[calc(env(safe-area-inset-bottom)+8rem)]">
      <GaleriaClient />
    </div>
  );
}
