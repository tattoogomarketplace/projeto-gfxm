'use client';

import { ChatThread } from '@/components/features/chat/chat-thread';

export function ChatBox({ destinatarioId }: { destinatarioId?: string }) {
  return <ChatThread actorId={null} destinatarioId={destinatarioId} />;
}
