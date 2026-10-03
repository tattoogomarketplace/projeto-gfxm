export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  ensurePerfilFromClerk,
  findPerfilByClerkId,
  type LocalPerfil,
} from '@/lib/services/ensure-perfil';
import {
  buildProfileSource,
  describeRequestAuth,
  perfilResponse,
  resolvePerfilSession,
} from '@/lib/services/perfil-session';
import { isOnboardingComplete, parseAppRole } from '@/lib/utils/auth-redirect';

export async function GET(request: Request) {
  const { userId, user, metadataRole } = await resolvePerfilSession(request);
  if (!userId) {
    // Diagnóstico explícito: NÃO mascaramos mais a queda de sessão com 200.
    // Retornar 401 força o cliente a saber, já no carregamento da página, que o
    // servidor não resolveu a sessão — exatamente o sintoma que antecede o 401
    // do POST. O 200 anterior escondia a causa raiz e mantinha o usuário na UI.
    console.error('[perfil/ensure] 401 - sessão não resolvida no GET', {
      ...describeRequestAuth(request),
      method: request.method,
    });
    return NextResponse.json(
      {
        sucesso: false,
        autenticado: false,
        erro: 'Não autenticado.',
        perfil: null,
        needsOnboarding: false,
      },
      { status: 401 }
    );
  }

  let perfil: LocalPerfil | null = null;
  try {
    perfil = await findPerfilByClerkId(userId);
    if (!perfil) {
      perfil = await ensurePerfilFromClerk(buildProfileSource(userId, user), metadataRole);
    }
  } catch (error) {
    console.error('[perfil/ensure] auto-provisionamento falhou', { userId, error });
    perfil = null;
  }

  if (!perfil) {
    return NextResponse.json(
      { sucesso: true, perfil: null, needsOnboarding: true },
      { status: 200 }
    );
  }

  if (perfil.deleted_at) {
    return NextResponse.json(
      { sucesso: false, erro: 'Conta desativada.', perfil: null },
      { status: 403 }
    );
  }

  const onboardingCompleted = isOnboardingComplete(perfil);
  return NextResponse.json({
    sucesso: true,
    reactivated: perfil.reactivated === true,
    needsOnboarding: !onboardingCompleted,
    onboarding_completed: onboardingCompleted,
    perfil: perfilResponse(perfil),
  });
}

export async function POST(request: Request) {
  const { userId, user, metadataRole } = await resolvePerfilSession(request);
  if (!userId) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  let body: { role?: string } = {};
  try {
    body = (await request.json()) as { role?: string };
  } catch {
    body = {};
  }

  const requestedRole = parseAppRole(body.role);

  let existing: LocalPerfil | null = null;
  try {
    existing = await findPerfilByClerkId(userId);
  } catch {
    existing = null;
  }

  if (existing?.deleted_at) {
    return NextResponse.json(
      { sucesso: false, erro: 'Conta desativada.', perfil: null },
      { status: 403 }
    );
  }

  // Fonte de verdade do papel: o perfil já persistido no banco tem prioridade
  // absoluta; na primeira criação vale o papel escolhido no cadastro (metadata).
  const authoritativeRole = existing?.role ?? metadataRole;

  if (authoritativeRole && requestedRole && requestedRole !== authoritativeRole) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: 'O perfil é definido no cadastro e não pode ser alterado.',
        role: authoritativeRole,
      },
      { status: 403 }
    );
  }

  const role = authoritativeRole ?? requestedRole;
  if (!role) {
    return NextResponse.json(
      { sucesso: false, erro: 'Selecione um perfil para continuar.', needsOnboarding: true },
      { status: 400 }
    );
  }

  let perfil: LocalPerfil | null = existing;
  if (!perfil) {
    try {
      perfil = await ensurePerfilFromClerk(buildProfileSource(userId, user), role);
    } catch (error) {
      console.error('[perfil/ensure] criação falhou', { userId, role, error });
      perfil = null;
    }
  }

  if (!perfil) {
    return NextResponse.json(
      { sucesso: false, erro: 'Não foi possível criar o perfil local.', needsOnboarding: true },
      { status: 409 }
    );
  }

  const onboardingCompleted = isOnboardingComplete(perfil);
  return NextResponse.json({
    sucesso: true,
    reactivated: perfil.reactivated === true,
    needsOnboarding: !onboardingCompleted,
    onboarding_completed: onboardingCompleted,
    perfil: perfilResponse(perfil),
  });
}
