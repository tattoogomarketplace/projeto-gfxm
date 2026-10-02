import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { parseAppRole, type AppRole } from '@/lib/utils/auth-redirect';
import type { ClerkProfileSource, LocalPerfil } from '@/lib/services/ensure-perfil';

type ClerkUser = Awaited<ReturnType<typeof currentUser>>;

export type PerfilSession = {
  userId: string | null;
  user: ClerkUser;
  metadataRole: AppRole | null;
};

/**
 * Resumo seguro da autenticação da requisição para logs de diagnóstico.
 *
 * NUNCA expõe o valor do Bearer nem o conteúdo dos cookies (credenciais de
 * sessão). Publica apenas o que é decisivo para sabermos o que a Vercel está
 * recebendo/descartando: presença e formato do header, nomes dos cookies e o
 * status do `auth()` resolvido pelo middleware.
 */
export function describeRequestAuth(request?: Request): Record<string, unknown> {
  const authHeader = request?.headers.get('authorization') ?? null;
  const cookieHeader = request?.headers.get('cookie') ?? null;
  const cookieNames = cookieHeader
    ? cookieHeader
        .split(';')
        .map((part) => part.split('=')[0]?.trim())
        .filter((name): name is string => Boolean(name))
    : [];

  return {
    authorization: authHeader
      ? {
          scheme: authHeader.split(' ')[0] ?? 'desconhecido',
          length: authHeader.length,
          jwtShape: authHeader.split('.').length === 3,
        }
      : 'ausente',
    cookieNames,
    cookieCount: cookieNames.length,
  };
}

/**
 * Valida a sessão a partir da requisição crua como fallback.
 *
 * Não removemos mais o header `Authorization`: o cliente envia um Bearer
 * sempre renovado (`getToken({ skipCache: true })`), então o Clerk deve
 * processá-lo normalmente. Esta via só é acionada quando o `auth()` do
 * middleware não consegue resolver a sessão (contexto ausente/incompatível).
 */
async function resolveUserIdFromRequest(request: Request): Promise<string | null> {
  try {
    const client = await clerkClient();
    const requestState = await client.authenticateRequest(request, {
      acceptsToken: 'session_token',
    });
    if (requestState.isAuthenticated) {
      return requestState.toAuth().userId ?? null;
    }
  } catch (error) {
    console.error('[perfil-session] authenticateRequest lançou', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return null;
}

/**
 * Estabelece a sessão pelo `auth()` do Clerk, idioma canônico do App Router:
 * ele resolve com prioridade o header `Authorization` (o Bearer recém-emitido
 * pelo cliente) e cai para o cookie de sessão. Assim a mutação permanece
 * autenticada mesmo quando o cookie é descartado (mobile/proxy), sem depender
 * do header-stripping anterior. A requisição crua é apenas fallback para
 * quando o middleware não fornece contexto; `currentUser()` enriquece o perfil
 * sem poder vetar a autenticação já resolvida.
 */
export async function resolvePerfilSession(request?: Request): Promise<PerfilSession> {
  let userId: string | null = null;
  let middlewareUserId: string | null = null;
  let authThrew: string | null = null;

  // 1) Fonte primária: `auth()` do middleware, que processa o Bearer renovado e
  //    o cookie pela mesma via usada nas requisições GET.
  try {
    ({ userId: middlewareUserId } = await auth());
  } catch (error) {
    // `auth()` lança quando o middleware Clerk não está presente/combina com a
    // rota; tratamos como sessão ausente e tentamos a requisição crua.
    authThrew = error instanceof Error ? error.message : String(error);
  }
  userId = middlewareUserId;

  // 2) Fallback explícito para a requisição crua quando não há contexto de
  //    middleware (ex.: execução fora do App Router).
  let rawResolved = false;
  if (!userId && request) {
    userId = await resolveUserIdFromRequest(request);
    rawResolved = Boolean(userId);
  }

  if (!userId) {
    // Diagnóstico agressivo: ponto exato em que a sessão se perde. Logamos o
    // suficiente para saber se o problema é header, cookie ou middleware —
    // SEM nunca imprimir o token/cookie (credenciais de sessão).
    console.error('[perfil-session] sessão NÃO resolvida (401)', {
      ...describeRequestAuth(request),
      middlewareAuthUserId: middlewareUserId ? 'presente' : 'ausente',
      authThrew,
      rawAuthenticateRequest: rawResolved ? 'presente' : 'ausente',
    });
    return { userId: null, user: null, metadataRole: null };
  }

  let user: ClerkUser = null;
  try {
    user = await currentUser();
  } catch {
    user = null;
  }

  if (!user) {
    try {
      const client = await clerkClient();
      user = await client.users.getUser(userId);
    } catch {
      user = null;
    }
  }

  const metadata = (user?.unsafeMetadata || user?.publicMetadata || {}) as Record<string, unknown>;
  return { userId, user, metadataRole: parseAppRole(metadata.role as string | undefined) };
}

/**
 * Monta uma fonte de perfil a partir SEMPRE do `userId` autenticado (auth()),
 * enriquecida com o usuário Clerk quando disponível. Isso desacopla o
 * auto-provisionamento de `currentUser()`: mesmo que a Backend API falhe, o
 * `clerk_id` continua garantido e o upsert pode ser tentado.
 */
export function buildProfileSource(userId: string, user: ClerkUser): ClerkProfileSource {
  return {
    id: userId,
    firstName: user?.firstName ?? null,
    lastName: user?.lastName ?? null,
    fullName: user?.fullName ?? null,
    primaryEmailAddress: user?.primaryEmailAddress
      ? { emailAddress: user.primaryEmailAddress.emailAddress }
      : null,
    emailAddresses: (user?.emailAddresses ?? []).map((item) => ({
      emailAddress: item.emailAddress ?? null,
    })),
    unsafeMetadata: (user?.unsafeMetadata ?? {}) as Record<string, unknown>,
    publicMetadata: (user?.publicMetadata ?? {}) as Record<string, unknown>,
  };
}

/**
 * Contrato público do perfil exposto ao cliente. `onboarding_completed` é o
 * alias estável de `has_seen_welcome_notice`, mantido para desacoplar a UI do
 * nome da coluna persistida no banco.
 */
export function perfilResponse(perfil: LocalPerfil) {
  return {
    id: perfil.id,
    email: perfil.email,
    nome: perfil.nome,
    role: perfil.role,
    kyc_status: perfil.kyc_status,
    onboarding_completed: perfil.has_seen_welcome_notice,
  };
}
