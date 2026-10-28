export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { getUserSessions, UserSessionError } from '@/lib/services/user-sessions';

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof UserSessionError) {
    return NextResponse.json({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[sessoes] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json({ sucesso: false, erro: fallback }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const { userId } = await resolvePerfilSession(request);
    if (!userId) {
      return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
    }

    const actor = await prisma.perfil.findUnique({
      where: { clerk_id: userId },
      select: { id: true, deleted_at: true },
    });
    if (!actor || actor.deleted_at) {
      return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
    }

    const payload = await getUserSessions(actor.id);
    return NextResponse.json(
      { sucesso: true, userId: payload.userId, sessions: payload.sessions },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error, 'Falha ao carregar agenda.');
  }
}
