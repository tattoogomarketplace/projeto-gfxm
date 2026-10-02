import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { verifyToken } from '@clerk/backend';
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { parseAppRole, type AppRole } from '@/lib/utils/auth-redirect';
import type { ClerkProfileSource, LocalPerfil } from '@/lib/services/ensure-perfil';

type ClerkUser = Awaited<ReturnType<typeof currentUser>>;

export type PerfilSession = {
  userId: string | null;
  user: ClerkUser;
  metadataRole: AppRole | null;
};

const SESSION_COOKIE = '__session';

/**
 * O Clerk deriva o sufixo dos cookies do publishable key:
 * `base64url(SHA1(publishableKey)).slice(0, 8)` — ex.: `__session_Ob3hTssd`.
 * Cookies sem sufixo (`__session`) são legado/instância anterior e podem
 * coexistir com os sufixados, fazendo o heurístico `usesSuffixedCookies()` do
 * Clerk escolher o token de uma instância que não corresponde ao secret key da
 * produção. Calcular o sufixo esperado permite priorizar o cookie correto.
 */
function getInstanceCookieSuffix(): string | null {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return null;
  return createHash('sha1')
    .update(publishableKey)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .slice(0, 8);
}

function parseCookieHeader(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!name) continue;
    cookies[name] = value;
  }
  return cookies;
}

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
    instanceSuffix: getInstanceCookieSuffix() ?? 'ausente',
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
 * Resolve o usuário verificando criptograficamente (`verifyToken`) o token de
 * sessão presente na requisição, sem depender do heurístico de cookie sufixado
 * do Clerk nem da propagação de headers pelo middleware.
 *
 * Ordem: Bearer renovado pelo cliente, cookie sufixado da instância
 * configurada, demais `__session_*` e, por fim, o `__session` legado. Testamos
 * TODOS os candidatos porque a produção carrega cookies duplicados de
 * instâncias distintas; o primeiro que validar com `CLERK_SECRET_KEY` é a
 * sessão real. Nenhum valor de token é exposto em log.
 */
async function resolveUserIdFromTokenCandidates(
  request: Request
): Promise<{ userId: string | null; tried: string[]; source: string | null; suffix: string | null }> {
  const suffix = getInstanceCookieSuffix();
  const secretKey = process.env.CLERK_SECRET_KEY;
  const tried: string[] = [];
  const candidates: Array<{ source: string; token: string }> = [];

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    candidates.push({ source: 'authorization', token: authHeader.slice('Bearer '.length) });
  }

  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const preferred = suffix ? `${SESSION_COOKIE}_${suffix}` : null;
  const sessionCookieNames = Object.keys(cookies)
    .filter((name) => name === SESSION_COOKIE || name.startsWith(`${SESSION_COOKIE}_`))
    .sort((a, b) => {
      if (a === preferred) return -1;
      if (b === preferred) return 1;
      if (a === SESSION_COOKIE) return 1;
      if (b === SESSION_COOKIE) return -1;
      return 0;
    });

  const seenTokens = new Set<string>();
  for (const name of sessionCookieNames) {
    const token = cookies[name];
    if (!token || seenTokens.has(token)) continue;
    seenTokens.add(token);
    candidates.push({ source: name, token });
  }

  if (!secretKey) {
    return { userId: null, tried, source: null, suffix };
  }

  for (const candidate of candidates) {
    tried.push(candidate.source);
    try {
      const payload = await verifyToken(candidate.token, { secretKey });
      if (payload?.sub) {
        return { userId: payload.sub, tried, source: candidate.source, suffix };
      }
    } catch {
      // Candidato inválido ou de outra instância: tenta o próximo.
    }
  }

  return { userId: null, tried, source: null, suffix };
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

  // 3) Verificação criptográfica direta dos candidatos de token (Bearer +
  //    cookies `__session`/`__session_<suffix>`). Resolve a duplicidade de
  //    cookies de instâncias distintas e independe do middleware.
  let tokenTried: string[] = [];
  let tokenSource: string | null = null;
  let instanceSuffix: string | null = null;
  if (!userId && request) {
    const verified = await resolveUserIdFromTokenCandidates(request);
    userId = verified.userId;
    tokenTried = verified.tried;
    tokenSource = verified.source;
    instanceSuffix = verified.suffix;
    if (userId && !middlewareUserId && !rawResolved) {
      // O middleware e o authenticateRequest falharam, mas a verificação
      // direta do token/cookie recuperou a sessão. Útil para confirmar em
      // produção qual instância/cookie é a fonte de verdade.
      console.warn('[perfil-session] sessão recuperada via verificação direta', {
        tokenSource,
        instanceSuffix: instanceSuffix ?? 'ausente',
      });
    }
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
      tokenCandidatesTried: tokenTried,
      instanceSuffix: instanceSuffix ?? 'ausente',
      secretKeyConfigured: Boolean(process.env.CLERK_SECRET_KEY),
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
 * Mesma resolução de sessão das rotas `/api/perfil/*`, alimentada pelos
 * headers da RSC (cookies + Authorization). Evita o split-brain em que o
 * `auth()` do layout falha, o cliente autentica no `/api/perfil/ensure` e os
 * dois lados se devolvem em loop entre onboarding e o painel.
 */
export async function resolvePerfilSessionFromIncomingRequest(): Promise<PerfilSession> {
  const incoming = await headers();
  const request = new Request('http://localhost', { headers: incoming });
  return resolvePerfilSession(request);
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
  const onboardingCompleted = perfil.has_seen_welcome_notice === true;
  return {
    id: perfil.id,
    email: perfil.email,
    nome: perfil.nome,
    role: perfil.role,
    kyc_status: perfil.kyc_status,
    has_seen_welcome_notice: onboardingCompleted,
    onboarding_completed: onboardingCompleted,
  };
}
