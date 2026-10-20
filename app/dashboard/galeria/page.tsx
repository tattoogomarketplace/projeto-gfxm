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
    <div className="relative min-h-0 w-full flex-1 bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.05),rgba(255,255,255,0))]">
      <GaleriaClient />
    </div>
  );
}
