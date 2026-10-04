import { SessionHydrating } from '@/components/features/session-hydrating';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';

export default async function DashboardAiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let perfil = null;
  try {
    perfil = await requireDashboardPerfil();
  } catch (error) {
    rethrowNextControlFlow(error);
    console.error('[dashboard/ai/layout] sessão indisponível', error);
    return <SessionHydrating />;
  }
  if (!perfil) return <SessionHydrating />;
  return children;
}
