import { dashboardPathForRole, parseAppRole } from '@/lib/utils/auth-redirect';

export const PERFIL_ENSURE_FETCH_TIMEOUT_MS = 6000;
export const PERFIL_ENSURE_RETRY_DELAY_MS = 400;
export const PERFIL_ENSURE_MAX_ATTEMPTS = 3;
export const PERFIL_ENSURE_HARD_TIMEOUT_MS = 8000;
export const PERFIL_ENSURE_SIGNED_OUT_MS = 8000;

export type EnsurePerfilPayload = {
  autenticado?: boolean;
  sucesso?: boolean;
  needsOnboarding?: boolean;
  onboarding_completed?: boolean;
  perfil?: {
    role?: string | null;
    kyc_status?: string | null;
    has_seen_welcome_notice?: boolean | null;
    onboarding_completed?: boolean | null;
  } | null;
};

export function fallbackDashboardPath(role?: string | null): string {
  return dashboardPathForRole(parseAppRole(role) ?? 'cliente');
}

export async function fetchPerfilEnsure(options: {
  token?: string | null;
  signal?: AbortSignal;
}): Promise<{ status: number; payload: EnsurePerfilPayload }> {
  const response = await fetch('/api/perfil/ensure', {
    cache: 'no-store',
    credentials: 'include',
    signal: options.signal,
    headers: {
      accept: 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as EnsurePerfilPayload;
  return { status: response.status, payload };
}
