import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { LocalPerfil } from '@/lib/services/ensure-perfil';
import { fetchExpressApi } from '@/lib/server/express-bff';
import { resolvePerfilSessionFromIncomingRequestCached } from '@/lib/services/perfil-session';
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

function parseDeletedAt(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapExpressPerfil(raw: unknown, clerkId: string): LocalPerfil | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === 'string' && record.id ? record.id : '';
  const email = typeof record.email === 'string' && record.email ? record.email : '';
  if (!id || !email) return null;
  const role = parseAppRole(typeof record.role === 'string' ? record.role : null) ?? 'cliente';
  return {
    id,
    clerk_id: typeof record.clerk_id === 'string' && record.clerk_id ? record.clerk_id : clerkId,
    email,
    nome: typeof record.nome === 'string' ? record.nome : null,
    username: typeof record.username === 'string' ? record.username : null,
    role,
    kyc_status: typeof record.kyc_status === 'string' && record.kyc_status ? record.kyc_status : 'pendente',
    has_seen_welcome_notice: record.has_seen_welcome_notice === true,
    deleted_at: parseDeletedAt(record.deleted_at),
  };
}

async function resolveClerkBearerToken(): Promise<{ token: string | null; cookie: string | null }> {
  let token: string | null = null;
  let cookie: string | null = null;

  try {
    const { getToken } = await auth();
    token = (await getToken()) || null;
  } catch {
    token = null;
  }

  try {
    const incoming = await headers();
    cookie = incoming.get('cookie');
    if (!token) {
      const authorization = incoming.get('authorization');
      if (authorization?.startsWith('Bearer ')) {
        const extracted = authorization.slice(7).trim();
        if (extracted) token = extracted;
      }
    }
  } catch {
    cookie = null;
  }

  return { token, cookie };
}

async function fetchDashboardPerfil(clerkId: string): Promise<LocalPerfil | null> {
  const { token, cookie } = await resolveClerkBearerToken();
  const headersInit: Record<string, string> = { Accept: 'application/json' };
  if (token) headersInit.Authorization = `Bearer ${token}`;
  if (cookie) headersInit.cookie = cookie;

  const { status, payload } = await fetchExpressApi('/api/perfil/me', {
    method: 'GET',
    headers: headersInit,
    timeoutMs: GATE_STEP_TIMEOUT_MS,
  });

  if (status === 401 || status === 403 || status >= 500) {
    return null;
  }
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const body = payload as { sucesso?: boolean; perfil?: unknown };
  if (body.sucesso === false || !body.perfil) {
    return null;
  }
  return mapExpressPerfil(body.perfil, clerkId);
}

export async function requireDashboardSession(): Promise<GateResult | null> {
  let userId: string | null = null;
  let metadataRole = null;

  try {
    const session = await withTimeout(resolvePerfilSessionFromIncomingRequestCached());
    userId = session.userId;
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
    perfil = await withTimeout(fetchDashboardPerfil(userId));
  } catch (error) {
    console.error('[dashboard-gate] GET /api/perfil/me falhou', error);
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
      return fallbackPerfil(null, expectedRole ?? 'cliente');
    }

    const { perfil, role } = session;

    if (!perfil || perfil.deleted_at) {
      if (expectedRole && role && role !== expectedRole) {
        redirect(dashboardPathForRole(role));
      }
      return fallbackPerfil(session.clerkId, role ?? expectedRole ?? 'cliente');
    }

    if (!role || !isOnboardingComplete(perfil)) {
      redirect(ONBOARDING_PATH);
    }

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
