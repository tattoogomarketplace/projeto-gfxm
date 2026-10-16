export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { describeRequestAuth, resolvePerfilSession } from '@/lib/services/perfil-session';
import { changeUsername } from '@/lib/services/username-change';
import { invalidPayloadBody } from '@/lib/security/validation';
import {
  isUsernameForbiddenForRole,
  normalizeUsername,
  validateUsername,
} from '@/lib/username';

/** Payload de identidade: `username` é sempre string (nunca array/objeto). */
const payloadSchema = z.object({
  username: z.string().trim().min(1, 'Username inválido.').max(64, 'Username inválido.'),
});

/**
 * Identidade universal (@username).
 *
 * Regras de negocio soberanas:
 *   1) O username e um handle publico secundario. Este endpoint NUNCA toca no
 *      campo `nome` (Display Name), que permanece a identidade principal.
 *   2) Estudios (`role === 'estudio'`) sao estritamente proibidos de ter
 *      username. Qualquer payload vindo de um estudio e rejeitado com 403,
 *      independentemente do formato do valor enviado.
 *   3) Unicidade e case-insensitive (armazenamos sempre em minusculas).
 */

const STUDIO_FORBIDDEN_MESSAGE = 'Estudios não podem definir um @username.';

async function usernameTaken(username: string, exceptPerfilId?: string): Promise<boolean> {
  const existing = await prisma.perfil.findFirst({
    where: {
      username: { equals: username, mode: 'insensitive' },
      ...(exceptPerfilId ? { id: { not: exceptPerfilId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function GET(request: Request) {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  const raw = new URL(request.url).searchParams.get('username');
  const normalized = normalizeUsername(raw);

  try {
    const perfil = await prisma.perfil.findFirst({
      where: { clerk_id: userId, deleted_at: null },
      select: { id: true, role: true, username: true },
    });

    if (!perfil) {
      return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
    }

    if (isUsernameForbiddenForRole(perfil.role)) {
      return NextResponse.json({
        sucesso: true,
        allowed: false,
        available: false,
        valid: false,
        reason: 'forbidden',
      });
    }

    const validation = validateUsername(normalized);
    if (!validation.valid) {
      return NextResponse.json({
        sucesso: true,
        allowed: true,
        valid: false,
        available: false,
        reason: validation.reason,
      });
    }

    // O proprio username já é "disponivel" para o dono da conta.
    const isOwn = perfil.username
      ? normalizeUsername(perfil.username) === validation.username
      : false;
    const taken = isOwn ? false : await usernameTaken(validation.username);

    return NextResponse.json({
      sucesso: true,
      allowed: true,
      valid: true,
      available: !taken,
      username: validation.username,
    });
  } catch (error) {
    console.error('[user/username] falha ao checar disponibilidade', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { sucesso: false, erro: 'Falha ao verificar o @username.' },
      { status: 500 }
    );
  }
}

async function claimUsername(request: Request) {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    console.error('[user/username] 401 - sessão não resolvida', {
      ...describeRequestAuth(request),
      method: request.method,
    });
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(invalidPayloadBody(parsed.error), { status: 400 });
  }

  try {
    const perfil = await prisma.perfil.findFirst({
      where: { clerk_id: userId, deleted_at: null },
      select: { id: true },
    });

    if (!perfil) {
      return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
    }

    // Toda a regra de negocio (formato, unicidade e trava de 30 dias) vive em
    // `changeUsername`, compartilhada com o Server Action `updateUsername`.
    const result = await changeUsername(perfil.id, parsed.data.username);

    switch (result.status) {
      case 'ok':
      case 'unchanged':
        return NextResponse.json({
          sucesso: true,
          username: result.username,
          last_username_change: result.lastUsernameChange,
          unchanged: result.status === 'unchanged',
        });
      case 'not_found':
        return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
      case 'forbidden':
        return NextResponse.json(
          { sucesso: false, erro: STUDIO_FORBIDDEN_MESSAGE, reason: 'forbidden' },
          { status: 403 }
        );
      case 'invalid':
        return NextResponse.json(
          { sucesso: false, erro: 'Username inválido.', reason: result.reason },
          { status: 400 }
        );
      case 'taken':
        return NextResponse.json(
          { sucesso: false, erro: 'Este @username já está em uso.', reason: 'taken' },
          { status: 409 }
        );
      case 'locked':
        return NextResponse.json(
          {
            sucesso: false,
            erro: `A troca de @username está bloqueada por 30 dias. Você poderá alterá-lo novamente em ${result.nextChangeAt.toISOString()}.`,
            reason: 'locked',
            nextChangeAt: result.nextChangeAt.toISOString(),
          },
          { status: 423 }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[user/username] falha ao salvar username', { userId, error: message });
    return NextResponse.json(
      { sucesso: false, erro: 'Falha ao salvar o @username.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return claimUsername(request);
}

export async function PUT(request: Request) {
  return claimUsername(request);
}
