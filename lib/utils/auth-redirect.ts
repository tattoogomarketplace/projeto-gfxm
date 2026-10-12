export type AppRole = 'cliente' | 'tatuador' | 'estudio';

const ALLOWED_ROLES: AppRole[] = ['cliente', 'tatuador', 'estudio'];

export const ONBOARDING_PATH = '/dashboard/onboarding';
export const USERNAME_SETUP_PATH = '/dashboard/onboarding/username';
export const LOGIN_PATH = '/login';

/**
 * Degraus do fluxo PRÉ-identidade: escolha de papel, verificação de documentos
 * e a própria captura do @username. O guardião global do handle (Fase 12 —
 * Etapa 1) NUNCA intercepta estas rotas: cada uma é dona do seu próprio
 * sequenciamento (onboarding → documentos → @username).
 */
const USERNAME_GATE_EXEMPT_PATHS = [
  ONBOARDING_PATH,
  USERNAME_SETUP_PATH,
  '/dashboard/kyc-pendente',
  '/dashboard/seja-tatuador',
] as const;

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
 * Rotas servidas pelo framework/plataforma (bundles, dados RSC e API) que NUNCA
 * devem disparar um redirecionamento de navegação client-side. Um `router.replace`
 * sobre estas rotas — comum durante uma revalidação — gera um ciclo de
 * `history.replaceState` (o loop da Fase 13.5). O guardião do @username ignora-as
 * por completo, do mesmo modo que o matcher do middleware já as exclui.
 */
export function isNonNavigablePath(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  if (pathname === '/api' || pathname.startsWith('/api/')) return true;
  if (pathname === '/_next' || pathname.startsWith('/_next/')) return true;
  return /\.(?:css|js|mjs|cjs|map|json|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|csv|zip|webmanifest|mp3)$/i.test(
    pathname
  );
}

/**
 * Rotas pré-identidade que o gatekeeper do @username deve liberar. Sem isso, o
 * guardião interceptaria o próprio degrau de captura do handle (loop) ou os
 * passos anteriores (documentos do tatuador).
 */
export function isUsernameGateExemptPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return USERNAME_GATE_EXEMPT_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Regra soberana do gatekeeper (Fase 12 — Etapa 1): TODO perfil de cliente ou
 * tatuador precisa de um handle público não-vazio. Estúdios são estritamente
 * proibidos de possuir @username (regra de negócio), portanto ficam isentos.
 * Papel ainda não resolvido também não é forçado (evita travar a hidratação).
 */
export function requiresUsernameSetup(
  role?: string | null,
  username?: string | null
): boolean {
  if (role !== 'cliente' && role !== 'tatuador') return false;
  return !username || username.trim().length === 0;
}

/**
 * Documentos Pessoais aprovados são o único estado que libera a bancada do profissional. Todos os
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
  username?: string | null;
  kyc_status?: string | null;
  has_seen_welcome_notice?: boolean | null;
  onboarding_completed?: boolean | null;
  deleted_at?: Date | string | null;
} | null | undefined;

/**
 * Próximo degrau OBRIGATÓRIO do fluxo, na ordem canônica do produto:
 *   1) onboarding (escolha de papel) enquanto não concluído;
 *   2) Documentos Pessoais (tatuador sem KYC aprovado);
 *   3) identidade @username (cliente/tatuador sem handle).
 * `null` significa que o usuário está liberado para navegar pelo app.
 */
export function nextRequiredOnboardingStep(perfil: SyncedPerfil): string | null {
  const role = parseAppRole(perfil?.role);
  if (!perfil || perfil.deleted_at || !role || !isOnboardingComplete(perfil)) {
    return ONBOARDING_PATH;
  }
  if (role === 'tatuador' && perfil.kyc_status !== 'aprovado') {
    return postSignupPathForRole(role);
  }
  if (requiresUsernameSetup(role, perfil.username)) {
    return USERNAME_SETUP_PATH;
  }
  return null;
}

/**
 * Destino canônico após `/api/perfil/ensure` confirmar o registro local.
 * Onboarding incompleto permanece em `/dashboard/onboarding`; senão o próximo
 * degrau obrigatório (documentos do tatuador ou identidade @username) ou o
 * painel do papel quando o usuário já está liberado.
 */
export function destinationAfterProfileSync(
  perfil: SyncedPerfil,
  needsOnboarding?: boolean
): string {
  if (!perfil || needsOnboarding) return ONBOARDING_PATH;
  const step = nextRequiredOnboardingStep(perfil);
  return step ?? dashboardPathForRole(perfil.role);
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
