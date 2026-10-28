'use client';

import { useQuery } from '@tanstack/react-query';
import { QueryHttpError } from '@/lib/query/http-error';
import { queryKeys } from '@/lib/query/keys';
import { TAB_SWR } from '@/lib/query/swr';
import type { PublicProfileData } from '@/lib/services/public-profile';

async function fetchPublicProfile(username: string): Promise<PublicProfileData> {
  const res = await fetch(`/api/profile/${encodeURIComponent(username)}`, { cache: 'no-store' });
  const payload = (await res.json().catch(() => ({}))) as {
    sucesso?: boolean;
    erro?: string;
    profile?: PublicProfileData;
  };
  if (!res.ok || payload.sucesso === false || !payload.profile) {
    throw new QueryHttpError(res.status || 500, payload.erro || 'Falha ao carregar o perfil público.');
  }
  return payload.profile;
}

export function usePublicProfile(username: string | undefined) {
  return useQuery({
    queryKey: queryKeys.publicProfile(username ?? ''),
    queryFn: () => fetchPublicProfile(username!),
    enabled: Boolean(username),
    ...TAB_SWR,
  });
}
