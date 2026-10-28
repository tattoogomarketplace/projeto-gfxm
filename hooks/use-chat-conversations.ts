'use client';

import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { bearerHeaders } from '@/lib/query/auth-headers';
import { queryKeys } from '@/lib/query/keys';
import { TAB_SWR } from '@/lib/query/swr';
import type { ChatConversationDto, ChatTab } from '@/lib/types/chat';

export type ChatConversationsPayload = {
  actorId: string | null;
  conversas: ChatConversationDto[];
};

async function fetchConversations(
  category: ChatTab,
  getToken: () => Promise<string | null>
): Promise<ChatConversationsPayload> {
  const res = await fetch(`/api/chat/conversas?categoria=${category}`, {
    headers: await bearerHeaders(getToken),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Falha ao carregar conversas.');
  }
  const json = (await res.json().catch(() => ({}))) as {
    actorId?: string;
    conversas?: ChatConversationDto[];
  };
  return {
    actorId: json.actorId ?? null,
    conversas: Array.isArray(json.conversas) ? json.conversas : [],
  };
}

export function useChatConversations(category: ChatTab, initial?: ChatConversationDto[]) {
  const { getToken } = useAuth();
  const tokenFn = useCallback(() => getToken({ skipCache: true }), [getToken]);

  return useQuery({
    queryKey: queryKeys.chatConversas(category),
    queryFn: () => fetchConversations(category, tokenFn),
    initialData: initial ? { actorId: null, conversas: initial } : undefined,
    ...TAB_SWR,
  });
}
