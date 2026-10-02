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
 * Valida a sessão a partir do header `Authorization: Bearer <token>` e, caso
 * ele falhe, repete a validação ignorando o header para que o cookie de sessão
 * — a mesma fonte de verdade das requisições GET — seja validado.
 *
 * O Clerk dá prioridade absoluta ao token do header sobre o cookie: quando o
 * token está expirado/rotacionado, ele marca a requisição como deslogada e
 * IGNORA o cookie válido. Era exatamente esse o sintoma "GET autentica, POST
 * retorna 401", já que apenas o POST envia o header. Remover o header no
 * fallback devolve a autenticação ao cookie, sem abrir mão da verificação
 * explícita do token quando ele é válido.
 */
async function resolveUserIdFromRequest(request: Request): Promise<string | null> {
  const verify = async (candidate: Request): Promise<string | null> => {
    try {
      const client = await clerkClient();
      const requestState = await client.authenticateRequest(candidate, {
        acceptsToken: 'session_token',
      });
      if (requestState.isAuthenticated) {
        return requestState.toAuth().userId ?? null;
      }
    } catch {
      // Token inválido/ausente: o chamador decide o próximo passo.
    }
    return null;
  };

  const fromHeader = await verify(request);
  if (fromHeader) return fromHeader;

  const headers = new Headers(request.headers);
  headers.delete('authorization');
  if (!headers.has('cookie')) return null;

  const cookieOnlyRequest = new Request(request.url, {
    method: request.method,
    headers,
  });
  return verify(cookieOnlyRequest);
}

/**
 * Estabelece a sessão a partir do token (auth) e, de forma defensiva, tenta
 * enriquecer com os metadados do usuário Clerk (currentUser). O gate de
 * autenticação é o `auth()` — leve, síncrono com o JWT e o padrão do App
 * Router — enquanto `currentUser()` é apenas complementar. Isso evita que uma
 * falha transitória da Backend API derrube a sessão com um 401 indevido.
 */
export async function resolvePerfilSession(request?: Request): Promise<PerfilSession> {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    // `auth()` lança quando o middleware Clerk não está presente/combina com a
    // rota; tratamos como sessão ausente e tentamos a verificação explícita.
    userId = null;
  }

  // Fallback para requisições que enviam o token no header (ex.: POST do
  // onboarding). O fluxo prioriza a validação explícita do Bearer e recorre ao
  // cookie de sessão quando o token não é aceito.
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
