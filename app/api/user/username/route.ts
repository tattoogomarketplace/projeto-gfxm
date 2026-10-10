export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { describeRequestAuth, resolvePerfilSession } from '@/lib/services/perfil-session';
import {
  isUsernameForbiddenForRole,
  normalizeUsername,
  validateUsername,
} from '@/lib/username';

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

  let body: { username?: unknown } = {};
  try {
    body = (await request.json()) as { username?: unknown };
  } catch {
    return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
  }

  try {
    const perfil = await prisma.perfil.findFirst({
      where: { clerk_id: userId, deleted_at: null },
      select: { id: true, role: true },
    });

    if (!perfil) {
      return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
    }

    // Blindagem soberana: estudios nunca podem definir um username.
    if (isUsernameForbiddenForRole(perfil.role)) {
      return NextResponse.json(
        { sucesso: false, erro: STUDIO_FORBIDDEN_MESSAGE },
        { status: 403 }
      );
    }

    const validation = validateUsername(body.username);
    if (!validation.valid) {
      return NextResponse.json(
        { sucesso: false, erro: 'Username inválido.', reason: validation.reason },
        { status: 400 }
      );
    }

    if (await usernameTaken(validation.username, perfil.id)) {
      return NextResponse.json(
        { sucesso: false, erro: 'Este @username já está em uso.', reason: 'taken' },
        { status: 409 }
      );
    }

    // Atualiza exclusivamente o username. O campo `nome` (Display Name) é
    // intocável por este fluxo.
    const updated = await prisma.perfil.update({
      where: { id: perfil.id },
      data: { username: validation.username },
      select: { id: true, nome: true, username: true, role: true },
    });

    return NextResponse.json({ sucesso: true, perfil: updated, username: updated.username });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Corrida de unicidade: outro request claimou o mesmo handle entre o check
    // e o update. O índice único garante a integridade.
    if (message.includes('perfis_username_unique_idx') || message.includes('Unique constraint')) {
      return NextResponse.json(
        { sucesso: false, erro: 'Este @username já está em uso.', reason: 'taken' },
        { status: 409 }
      );
    }
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
