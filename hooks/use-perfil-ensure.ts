'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { TAB_SWR } from '@/lib/query/swr';

export type PerfilEnsurePayload = {
  sucesso?: boolean;
  needsOnboarding?: boolean;
  perfil?: {
    role?: string | null;
    username?: string | null;
    kyc_status?: string | null;
    has_seen_welcome_notice?: boolean | null;
    onboarding_completed?: boolean | null;
  } | null;
};

async function fetchPerfilEnsure(): Promise<PerfilEnsurePayload> {
  const response = await fetch('/api/perfil/ensure', { cache: 'no-store' });
  if (response.status === 401) {
    throw new Error('session-initializing');
  }
  return (await response.json().catch(() => ({}))) as PerfilEnsurePayload;
}

export function usePerfilEnsure(enabled = true) {
  return useQuery({
    queryKey: queryKeys.perfilEnsure,
    queryFn: fetchPerfilEnsure,
    enabled,
    ...TAB_SWR,
  });
}
