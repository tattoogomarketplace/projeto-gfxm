'use client';

import { ChatWorkspace } from '@/components/features/chat/chat-workspace';
import type { ChatConversationDto } from '@/lib/types/chat';

export default function ChatClient({
  actorId = null,
  initialDirect,
  initialBudget,
}: {
  actorId?: string | null;
  initialDirect?: ChatConversationDto[];
  initialBudget?: ChatConversationDto[];
}) {
  return (
    <ChatWorkspace
      actorId={actorId}
      initialDirect={initialDirect}
      initialBudget={initialBudget}
    />
  );
}
