'use client';

import { AgendaPaymentsWorkspace } from '@/components/features/agenda-payments-workspace';
import { PaymentsChrome } from '@/components/ui/deep-route-chrome';
import { usePerfilEnsure } from '@/hooks/use-perfil-ensure';
import { parseAppRole } from '@/lib/utils/auth-redirect';

export default function PagamentosPage() {
  const ensure = usePerfilEnsure();
  const role = parseAppRole(ensure.data?.perfil?.role) ?? 'cliente';

  if (ensure.isLoading && !ensure.data) return <PaymentsChrome />;

  return (
    <div className="relative flex min-w-0 w-full flex-1 flex-col pt-5">
      <AgendaPaymentsWorkspace role={role} initialView="payments" />
    </div>
  );
}
