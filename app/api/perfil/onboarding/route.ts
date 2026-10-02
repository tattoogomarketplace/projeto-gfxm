export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  ensurePerfilFromClerk,
  findPerfilByClerkId,
  markOnboardingCompleted,
  type LocalPerfil,
} from '@/lib/services/ensure-perfil';
import {
  buildProfileSource,
  describeRequestAuth,
  perfilResponse,
  resolvePerfilSession,
} from '@/lib/services/perfil-session';
import { parseAppRole } from '@/lib/utils/auth-redirect';

/**
 * Conclui o onboarding de forma idempotente.
 *
 * 1. Garante que o perfil local existe (cria a partir do Clerk se necessário).
 * 2. Avança o status persistido marcando `has_seen_welcome_notice = true`
 *    (exposto ao cliente como `onboarding_completed`).
 *
 * Como a operação é idempotente, cliques repetidos ou retries de rede nunca
 * duplicam registros nem deixam o usuário preso em loop de redirecionamento.
 */
export async function POST(request: Request) {
  const { userId, user, metadataRole } = await resolvePerfilSession(request);
  if (!userId) {
    // Diagnóstico agressivo no ponto exato do 401. Registra o que a Vercel
    // recebeu (header/cookies) e o que o `resolvePerfilSession` conseguiu
    // resolver. Nunca imprime o Bearer nem o conteúdo dos cookies.
    console.error('[perfil/onboarding] 401 - sessão não resolvida no POST', {
      ...describeRequestAuth(request),
      method: request.method,
      contentType: request.headers.get('content-type'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
    });
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

  // O papel persistido tem prioridade absoluta; na primeira criação vale o
  // papel escolhido no cadastro/seleção (metadata ou corpo da requisição).
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
  if (!existing && !role) {
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
      console.error('[perfil/onboarding] criação falhou', { userId, role, error });
      perfil = null;
    }
  }

  if (!perfil) {
    return NextResponse.json(
      { sucesso: false, erro: 'Não foi possível criar o perfil local.', needsOnboarding: true },
      { status: 409 }
    );
  }

  if (!perfil.has_seen_welcome_notice) {
    const updated = await markOnboardingCompleted(userId);
    if (updated) perfil = updated;
  }

  // O flag devolvido reflete o estado REALMENTE persistido no banco. Um 200 com
  // `onboarding_completed` forçado a `true` recriava o loop: o layout do painel
  // lia `has_seen_welcome_notice === false` e devolvia o usuário ao onboarding.
  // Se a marcação não persistiu, falhamos explicitamente para o cliente exibir
  // o erro e permanecer na tela, em vez de navegar para um loop de redirect.
  const onboardingCompleted = perfil.has_seen_welcome_notice === true;
  if (!onboardingCompleted) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: 'Não foi possível concluir o cadastro. Tente novamente.',
        needsOnboarding: true,
        onboarding_completed: false,
        perfil: perfilResponse(perfil),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sucesso: true,
    needsOnboarding: false,
    onboarding_completed: true,
    perfil: perfilResponse(perfil),
  });
}
