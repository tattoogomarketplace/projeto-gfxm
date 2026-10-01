export type AppRole = 'cliente' | 'tatuador' | 'estudio';

const ALLOWED_ROLES: AppRole[] = ['cliente', 'tatuador', 'estudio'];

export const ONBOARDING_PATH = '/dashboard/onboarding';

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
