import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ensurePerfilFromClerk,
  findPerfilByClerkId,
  type LocalPerfil,
} from '@/lib/services/ensure-perfil';
import { buildProfileSource, resolvePerfilSessionFromIncomingRequestCached } from '@/lib/services/perfil-session';
import { rethrowNextControlFlow } from '@/lib/utils/next-control-flow';
import {
  dashboardPathForRole,
  isOnboardingComplete,
  isOnboardingPath,
  nextRequiredOnboardingStep,
  ONBOARDING_PATH,
  parseAppRole,
  USERNAME_SETUP_PATH,
  type AppRole,
} from '@/lib/utils/auth-redirect';

type GateResult = {
  clerkId: string;
  perfil: LocalPerfil | null;
  role: AppRole | null;
};

const GATE_STEP_TIMEOUT_MS = 4000;

async function withTimeout<T>(promise: Promise<T>, ms = GATE_STEP_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('dashboard-gate-timeout')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function fallbackPerfil(clerkId?: string | null, expectedRole?: AppRole): LocalPerfil {
  const id = clerkId || 'session-fallback';
  return {
    id,
    clerk_id: clerkId || null,
    email: `${id}@tattoogo.local`,
    nome: null,
    username: null,
    role: expectedRole ?? 'cliente',
    kyc_status: expectedRole === 'cliente' || !expectedRole ? 'nao_aplicavel' : 'pendente',
    has_seen_welcome_notice: true,
    deleted_at: null,
  };
}

async function currentPathname(): Promise<string | null> {
  try {
    return (await headers()).get('x-pathname');
  } catch {
    return null;
  }
}

export async function requireDashboardSession(): Promise<GateResult | null> {
  let userId: string | null = null;
  let user = null;
  let metadataRole = null;

  try {
    const session = await withTimeout(resolvePerfilSessionFromIncomingRequestCached());
    userId = session.userId;
    user = session.user;
    metadataRole = session.metadataRole;
  } catch (error) {
    console.error('[dashboard-gate] sessão Clerk indisponível', error);
    return null;
  }

  if (!userId) {
    return null;
  }

  let perfil: LocalPerfil | null = null;
  try {
    perfil = await withTimeout(findPerfilByClerkId(userId));
    const shouldReconcile =
      !perfil ||
      Boolean(perfil.deleted_at) ||
      Boolean(
        metadataRole &&
          perfil.role !== metadataRole &&
          parseAppRole(perfil.role) === 'cliente' &&
          (metadataRole === 'tatuador' || metadataRole === 'estudio')
      );
    if (shouldReconcile) {
      perfil = await withTimeout(
        ensurePerfilFromClerk(buildProfileSource(userId, user), metadataRole)
      );
    }
  } catch (error) {
    console.error('[dashboard-gate] prisma findPerfilByClerkId falhou', error);
    perfil = null;
  }

  return {
    clerkId: userId,
    perfil,
    role: parseAppRole(perfil?.role || metadataRole),
  };
}

export async function requireDashboardPerfil(expectedRole?: AppRole): Promise<LocalPerfil> {
  try {
    const session = await requireDashboardSession();
    if (!session) {
      // Sessão indisponível (Clerk/DB transitório): mantemos o usuário na
      // rota que ele pediu em vez de forçá-lo ao painel do cliente. O casco
      // pinta o skeleton do papel esperado; a próxima revalidação corrige.
      return fallbackPerfil(null, expectedRole ?? 'cliente');
    }

    const { perfil, role } = session;

    if (!perfil || perfil.deleted_at) {
      // Sem registro local, o papel seguro do Clerk (publicMetadata) ainda
      // manda: nunca renderizamos o ecossistema de outro papel.
      if (expectedRole && role && role !== expectedRole) {
        redirect(dashboardPathForRole(role));
      }
      return fallbackPerfil(session.clerkId, role ?? expectedRole ?? 'cliente');
    }

    if (!role || !isOnboardingComplete(perfil)) {
      redirect(ONBOARDING_PATH);
    }

    // Gatekeeper persistente do @username (Fase 12 — Etapa 1): nenhum acesso
    // às áreas autenticadas sem handle. A ordem canônica (documentos →
    // @username) é garantida por `nextRequiredOnboardingStep`, que só devolve o
    // degrau do username quando o usuário já passou dos pré-requisitos.
    //
    // Fase 13.5: exclusão ESTRITA por caminho. O redirect só dispara quando NÃO
    // estamos em nenhuma rota de onboarding — se já estivermos no próprio degrau
    // de captura do handle, o guardião é inerte (evita loop de `replaceState`).
    if (
      nextRequiredOnboardingStep(perfil) === USERNAME_SETUP_PATH &&
      !isOnboardingPath(await currentPathname())
    ) {
      redirect(USERNAME_SETUP_PATH);
    }

    if (expectedRole && role !== expectedRole) {
      redirect(dashboardPathForRole(role));
    }

    return perfil;
  } catch (error) {
    rethrowNextControlFlow(error);
    console.error('[dashboard-gate] falha transitória; liberando painel', error);
    return fallbackPerfil(null, expectedRole ?? 'cliente');
  }
}
