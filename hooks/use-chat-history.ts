'use client';

import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { bearerHeaders } from '@/lib/query/auth-headers';
import { queryKeys } from '@/lib/query/keys';
import { TAB_SWR } from '@/lib/query/swr';
import type { ChatMessageDto } from '@/lib/types/chat';

async function fetchHistory(
  peerId: string,
  getToken: () => Promise<string | null>
): Promise<ChatMessageDto[]> {
  const res = await fetch(`/api/chat/historico?interlocutor_id=${encodeURIComponent(peerId)}`, {
    headers: await bearerHeaders(getToken),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Falha ao carregar mensagens.');
  }
  const json = (await res.json().catch(() => ({}))) as { data?: ChatMessageDto[] };
  return Array.isArray(json.data) ? json.data : [];
}

export function useChatHistory(peerId: string | undefined) {
  const { getToken } = useAuth();
  const tokenFn = useCallback(() => getToken({ skipCache: true }), [getToken]);

  return useQuery({
    queryKey: queryKeys.chatHistorico(peerId ?? ''),
    queryFn: () => fetchHistory(peerId!, tokenFn),
    enabled: Boolean(peerId),
    refetchInterval: peerId ? 4000 : false,
    refetchIntervalInBackground: false,
    ...TAB_SWR,
  });
}
