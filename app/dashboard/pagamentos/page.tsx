import { SessionHydrating } from '@/components/features/session-hydrating';
import { PaymentsHub } from '@/components/features/payments-hub';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';

export default async function PagamentosPage() {
  let perfil = null;
  try {
    perfil = await requireDashboardPerfil('cliente');
  } catch (error) {
    rethrowNextControlFlow(error);
    console.error('[dashboard/pagamentos] sessão indisponível', error);
    return <SessionHydrating />;
  }
  if (!perfil) return <SessionHydrating />;
  return <PaymentsHub />;
}
