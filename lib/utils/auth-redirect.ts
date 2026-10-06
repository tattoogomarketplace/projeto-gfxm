export type AppRole = 'cliente' | 'tatuador' | 'estudio';

const ALLOWED_ROLES: AppRole[] = ['cliente', 'tatuador', 'estudio'];

export const ONBOARDING_PATH = '/dashboard/onboarding';
export const LOGIN_PATH = '/login';

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

type SyncedPerfil = {
  role?: string | null;
  kyc_status?: string | null;
  has_seen_welcome_notice?: boolean | null;
  onboarding_completed?: boolean | null;
  deleted_at?: Date | string | null;
} | null | undefined;

/**
 * Destino canônico após `/api/perfil/ensure` confirmar o registro local.
 * Onboarding incompleto permanece em `/dashboard/onboarding`; senão o painel
 * do papel (tatuador sem KYC vai para a tela de documentos).
 */
export function destinationAfterProfileSync(
  perfil: SyncedPerfil,
  needsOnboarding?: boolean
): string {
  const role = parseAppRole(perfil?.role);
  if (!perfil || !role || needsOnboarding || !isOnboardingComplete(perfil)) {
    return ONBOARDING_PATH;
  }
  if (role === 'tatuador' && perfil.kyc_status !== 'aprovado') {
    return postSignupPathForRole(role);
  }
  return dashboardPathForRole(role);
}

const ASSIGN_RELOAD_KEY = 'tattoogo:assign-reload-at';

export function assignAppPath(path: string): void {
  if (typeof window === 'undefined') return;
  const dest = path.startsWith('/') ? path : `/${path}`;
  if (window.location.pathname === dest) {
    try {
      const last = Number(window.sessionStorage.getItem(ASSIGN_RELOAD_KEY) || 0);
      if (Date.now() - last < 5000) return;
      window.sessionStorage.setItem(ASSIGN_RELOAD_KEY, String(Date.now()));
    } catch {
      return;
    }
    window.location.reload();
    return;
  }
  window.location.assign(dest);
}
