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
    <div className="relative h-[100dvh] w-full overflow-y-auto">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#030303]">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
        <div
          className="absolute -top-[20%] -left-[10%] h-[70vw] w-[70vw] animate-pulse rounded-full bg-orange-600/5 blur-[120px]"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="absolute top-[40%] -right-[20%] h-[60vw] w-[60vw] animate-pulse rounded-full bg-orange-500/5 blur-[100px]"
          style={{ animationDuration: '12s', animationDelay: '2s' }}
        />
        <div
          className="absolute -bottom-[20%] left-[20%] h-[80vw] w-[80vw] animate-pulse rounded-full bg-orange-900/10 blur-[150px]"
          style={{ animationDuration: '10s', animationDelay: '4s' }}
        />
      </div>
      <div className="relative z-10 min-h-[100dvh] w-full pb-[calc(env(safe-area-inset-bottom)+8rem)]">
        <GaleriaClient />
      </div>
    </div>
  );
}
