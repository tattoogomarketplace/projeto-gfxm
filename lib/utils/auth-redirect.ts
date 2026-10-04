export type AppRole = 'cliente' | 'tatuador' | 'estudio';

const ALLOWED_ROLES: AppRole[] = ['cliente', 'tatuador', 'estudio'];

export const ONBOARDING_PATH = '/dashboard/onboarding';
export const LOGIN_PATH = '/login';

/** Post-OTP Clerk limbo: isSignedIn can briefly drop before the session hydrates. */
export const AUTH_HYDRATION_GRACE_MS = 3500;

type OnboardingFlagSource = {
  has_seen_welcome_notice?: boolean | null;
  onboarding_completed?: boolean | null;
  deleted_at?: Date | string | null;
} | null | undefined;

/**
 * Fonte única de verdade para "onboarding concluído".
 * O banco persiste `has_seen_welcome_notice`; a API expõe o alias
 * `onboarding_completed`. Qualquer um dos dois em `true` libera o painel.
 * Conta ausente, soft-deleted ou flag falso = onboarding obrigatório.
 */
export function isOnboardingComplete(perfil: OnboardingFlagSource): boolean {
  if (!perfil || perfil.deleted_at) return false;
  return perfil.has_seen_welcome_notice === true || perfil.onboarding_completed === true;
}

export function isOnboardingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === ONBOARDING_PATH || pathname.startsWith(`${ONBOARDING_PATH}/`);
}

/**
 * KYC aprovado é o único estado que libera a bancada do profissional. Todos os
 * demais (`pendente`, `em_analise`, `rejeitado`, `nao_aplicavel`) mantêm o
 * bloqueio global — a verificação é feita no servidor, não apenas na UI.
 */
export function isKycApproved(status?: string | null): boolean {
  return status === 'aprovado';
}

export function parseAppRole(role?: string | null): AppRole | null {
  if (role && ALLOWED_ROLES.includes(role as AppRole)) {
    return role as AppRole;
  }
  return null;
}

export function normalizeAppRole(role?: string | null): AppRole {
  return parseAppRole(role) ?? 'cliente';
}

export function dashboardPathForRole(role?: string | null): string {
  const normalized = normalizeAppRole(role);
  if (normalized === 'tatuador') return '/dashboard/tatuador';
  if (normalized === 'estudio') return '/dashboard/estudio';
  return '/dashboard/cliente';
}

export function postSignupPathForRole(role?: string | null): string {
  const normalized = normalizeAppRole(role);
  if (normalized === 'tatuador') return '/dashboard/kyc-pendente';
  if (normalized === 'estudio') return '/dashboard/estudio';
  return '/dashboard/cliente';
}
