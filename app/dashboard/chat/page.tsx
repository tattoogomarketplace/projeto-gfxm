import { listConversations } from '@/lib/services/chat';
import type { ChatConversationDto } from '@/lib/types/chat';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';
import ChatClient from './chat-client';
import ChatLoading from './loading';

const EMPTY_INBOX: ChatConversationDto[] = [];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function hydrateInbox(actorId: string): Promise<{
  actorId: string | null;
  direct: ChatConversationDto[];
  budget: ChatConversationDto[];
}> {
  try {
    const [direct, budget] = await Promise.all([
      listConversations(actorId, 'DIRECT'),
      listConversations(actorId, 'BUDGET'),
    ]);
    return { actorId, direct, budget };
  } catch (error) {
    console.error('[dashboard/chat] hidratação Prisma falhou', error);
    return { actorId: null, direct: EMPTY_INBOX, budget: EMPTY_INBOX };
  }
}

export default async function DashboardChatPage() {
  let perfil = null;
  try {
    perfil = await requireDashboardPerfil();
  } catch (error) {
    rethrowNextControlFlow(error);
    console.error('[dashboard/chat] sessão indisponível', error);
    return <ChatLoading />;
  }
  if (!perfil) return <ChatLoading />;
  if (!UUID_RE.test(perfil.id)) {
    return <ChatClient actorId={null} initialDirect={EMPTY_INBOX} initialBudget={EMPTY_INBOX} />;
  }

  const inbox = await hydrateInbox(perfil.id);

  return (
    <ChatClient
      actorId={inbox.actorId}
      initialDirect={inbox.direct}
      initialBudget={inbox.budget}
    />
  );
}
