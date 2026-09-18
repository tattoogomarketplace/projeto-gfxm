export type AppRole = 'cliente' | 'tatuador' | 'estudio';

const ALLOWED_ROLES: AppRole[] = ['cliente', 'tatuador', 'estudio'];

export function normalizeAppRole(role?: string | null): AppRole {
  if (role && ALLOWED_ROLES.includes(role as AppRole)) {
    return role as AppRole;
  }
  return 'cliente';
}

export function dashboardPathForRole(role?: string | null): string {
  const normalized = normalizeAppRole(role);
  if (normalized === 'tatuador') return '/dashboard/tatuador';
  if (normalized === 'estudio') return '/dashboard/estudio';
  return '/dashboard/cliente';
}
