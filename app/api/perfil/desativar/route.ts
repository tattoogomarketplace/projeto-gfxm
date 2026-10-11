export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { describeRequestAuth, resolvePerfilSession } from '@/lib/services/perfil-session';

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const status =
    (error as { status?: number }).status ??
    (error as { statusCode?: number }).statusCode;
  return status === 404;
}

export async function POST(request: Request) {
  // Mesma resolução de sessão usada por /api/perfil/ensure: aceita o Bearer
  // recém-emitido pelo cliente e cai para o cookie de sessão (com verificação
  // criptográfica dos candidatos). O `auth()` isolado do middleware falhava
  // quando o cookie era descartado (mobile/proxy) ou quando um Bearer não-Clerk
  // era enviado, devolvendo 401 indevido na exclusão de conta.
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    console.error('[perfil/desativar] 401 - sessão não resolvida no POST', {
      ...describeRequestAuth(request),
      method: request.method,
    });
    return NextResponse.json(
      { success: false, erro: 'Não autenticado.' },
      { status: 401 }
    );
  }

  try {
    await prisma.perfil.updateMany({
      where: { clerk_id: userId, deleted_at: null },
      data: { deleted_at: new Date(), agenda_bloqueada: true },
    });

    try {
      const client = await clerkClient();
      await client.users.deleteUser(userId);
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[perfil/desativar] falha ao desativar conta', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, erro: 'Falha ao desativar a conta.' },
      { status: 500 }
    );
  }
}
