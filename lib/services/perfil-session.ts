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
  } catch {
    // Token inválido/ausente: o chamador decide o próximo passo.
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

  // 1) Fonte primária: `auth()` do middleware, que processa o Bearer renovado e
  //    o cookie pela mesma via usada nas requisições GET.
  try {
    ({ userId } = await auth());
  } catch {
    // `auth()` lança quando o middleware Clerk não está presente/combina com a
    // rota; tratamos como sessão ausente e tentamos a requisição crua.
    userId = null;
  }

  // 2) Fallback explícito para a requisição crua quando não há contexto de
  //    middleware (ex.: execução fora do App Router).
  if (!userId && request) {
    userId = await resolveUserIdFromRequest(request);
  }

  if (!userId) {
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
