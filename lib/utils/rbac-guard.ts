import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NO_STORE_HEADERS, unauthorizedJson } from '@/lib/security/api-guard';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import {
  dashboardPathForRole,
  ONBOARDING_PATH,
  parseAppRole,
  type AppRole,
} from '@/lib/utils/auth-redirect';

export type AppRoleName = AppRole;

type AccessAllowed = {
  allowed: true;
  userId: string;
  role: AppRole;
  perfilId: string;
};

type AccessDenied = {
  allowed: false;
  redirect: string;
};

export type AccessResult = AccessAllowed | AccessDenied;

type ApiRoleOk = {
  userId: string;
  perfilId: string;
  role: AppRole;
  response: null;
};

type ApiRoleDenied = {
  userId: null;
  perfilId: null;
  role: null;
  response: NextResponse;
};

async function loadActiveRole(
  clerkUserId: string
): Promise<{ role: AppRole; perfilId: string } | null> {
  const perfil = await prisma.perfil.findFirst({
    where: { clerk_id: clerkUserId, deleted_at: null },
    select: { id: true, role: true },
  });
  const role = parseAppRole(perfil?.role);
  if (!perfil || !role) return null;
  return { role, perfilId: perfil.id };
}

export function forbiddenJson(message = 'Acesso negado.') {
  return NextResponse.json(
    { sucesso: false, erro: message, codigo: 'FORBIDDEN' },
    { status: 403, headers: NO_STORE_HEADERS }
  );
}

export const checkAccess = async (requiredRole: AppRole): Promise<AccessResult> => {
  const { userId } = await resolvePerfilSession();
  if (!userId) return { allowed: false, redirect: ONBOARDING_PATH };

  const loaded = await loadActiveRole(userId);
  if (!loaded) return { allowed: false, redirect: ONBOARDING_PATH };
  if (loaded.role !== requiredRole) {
    return { allowed: false, redirect: dashboardPathForRole(loaded.role) };
  }
  return { allowed: true, userId, role: loaded.role, perfilId: loaded.perfilId };
};

export async function requireApiRoles(
  request: Request,
  allowedRoles: readonly AppRole[],
  forbiddenMessage = 'Acesso negado.'
): Promise<ApiRoleOk | ApiRoleDenied> {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    return { userId: null, perfilId: null, role: null, response: unauthorizedJson() };
  }

  const loaded = await loadActiveRole(userId);
  if (!loaded) {
    return {
      userId: null,
      perfilId: null,
      role: null,
      response: NextResponse.json(
        { sucesso: false, erro: 'Perfil não encontrado.' },
        { status: 404, headers: NO_STORE_HEADERS }
      ),
    };
  }

  if (!allowedRoles.includes(loaded.role)) {
    return {
      userId: null,
      perfilId: null,
      role: null,
      response: forbiddenJson(forbiddenMessage),
    };
  }

  return { userId, perfilId: loaded.perfilId, role: loaded.role, response: null };
}
