import { SessionHydrating } from '@/components/features/session-hydrating';
import { AgendaPaymentsWorkspace } from '@/components/features/agenda-payments-workspace';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';
import { parseAppRole } from '@/lib/utils/auth-redirect';

export default async function PagamentosPage() {
  let perfil = null;
  try {
    perfil = await requireDashboardPerfil();
  } catch (error) {
    rethrowNextControlFlow(error);
    console.error('[dashboard/pagamentos] sessão indisponível', error);
    return <SessionHydrating />;
  }
  if (!perfil) return <SessionHydrating />;
  const role = parseAppRole(perfil.role) ?? 'cliente';
  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col pt-5">
      <AgendaPaymentsWorkspace role={role} initialView="payments" />
    </div>
  );
}
