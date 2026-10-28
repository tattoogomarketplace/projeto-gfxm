'use client';

import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { bearerHeaders } from '@/lib/query/auth-headers';
import { queryKeys } from '@/lib/query/keys';
import { TAB_SWR } from '@/lib/query/swr';
import type { UserSession } from '@/lib/types/user-session';

async function fetchUserSessions(getToken: () => Promise<string | null>): Promise<UserSession[]> {
  const res = await fetch('/api/sessoes', {
    method: 'GET',
    headers: await bearerHeaders(getToken),
    credentials: 'include',
    cache: 'no-store',
  });
  const payload = (await res.json().catch(() => ({}))) as {
    sessions?: UserSession[];
    erro?: string;
  };
  if (!res.ok) {
    throw new Error(payload.erro || 'Falha ao carregar agenda.');
  }
  return Array.isArray(payload.sessions) ? payload.sessions : [];
}

export function useUserSessions(initialSessions?: UserSession[]) {
  const { getToken } = useAuth();
  const tokenFn = useCallback(() => getToken({ skipCache: true }), [getToken]);

  return useQuery({
    queryKey: queryKeys.agendaSessions,
    queryFn: () => fetchUserSessions(tokenFn),
    ...(initialSessions ? { initialData: initialSessions } : {}),
    ...TAB_SWR,
  });
}
