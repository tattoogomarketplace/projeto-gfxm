import { SessionHydrating } from '@/components/features/session-hydrating';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';
import ChatClient from './chat-client';

export default async function DashboardChatPage() {
  let perfil = null;
  try {
    perfil = await requireDashboardPerfil();
  } catch (error) {
    rethrowNextControlFlow(error);
    console.error('[dashboard/chat] sessão indisponível', error);
    return <SessionHydrating />;
  }
  if (!perfil) return <SessionHydrating />;
  return <ChatClient />;
}
