'use client';

import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import type { InspirationItem } from '@/lib/gallery-mock';
import { bearerHeaders } from '@/lib/query/auth-headers';
import { QueryHttpError } from '@/lib/query/http-error';
import { queryKeys } from '@/lib/query/keys';
import { TAB_SWR } from '@/lib/query/swr';

async function fetchSavedInspirations(
  getToken: () => Promise<string | null>
): Promise<InspirationItem[]> {
  const res = await fetch('/api/inspirations', {
    headers: await bearerHeaders(getToken),
    cache: 'no-store',
  });
  const payload = (await res.json().catch(() => ({}))) as {
    sucesso?: boolean;
    erro?: string;
    items?: InspirationItem[];
  };
  if (!res.ok || payload.sucesso === false) {
    throw new QueryHttpError(res.status || 500, payload.erro || 'Falha ao listar inspirações salvas.');
  }
  return Array.isArray(payload.items) ? payload.items : [];
}

async function fetchSavedInspirationIds(
  getToken: () => Promise<string | null>
): Promise<string[]> {
  const res = await fetch('/api/inspirations?ids=1', {
    headers: await bearerHeaders(getToken),
    cache: 'no-store',
  });
  const payload = (await res.json().catch(() => ({}))) as {
    sucesso?: boolean;
    erro?: string;
    ids?: string[];
  };
  if (!res.ok || payload.sucesso === false) {
    throw new QueryHttpError(res.status || 500, payload.erro || 'Falha ao listar ids salvos.');
  }
  return Array.isArray(payload.ids) ? payload.ids : [];
}

export function useSavedInspirations() {
  const { getToken } = useAuth();
  const tokenFn = useCallback(() => getToken({ skipCache: true }), [getToken]);

  return useQuery({
    queryKey: queryKeys.savedInspirations,
    queryFn: () => fetchSavedInspirations(tokenFn),
    ...TAB_SWR,
  });
}

export function useSavedInspirationIds() {
  const { getToken } = useAuth();
  const tokenFn = useCallback(() => getToken({ skipCache: true }), [getToken]);

  return useQuery({
    queryKey: queryKeys.savedInspirationIds,
    queryFn: () => fetchSavedInspirationIds(tokenFn),
    ...TAB_SWR,
  });
}
