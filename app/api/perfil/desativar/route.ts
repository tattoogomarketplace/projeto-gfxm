export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const status =
    (error as { status?: number }).status ??
    (error as { statusCode?: number }).statusCode;
  return status === 404;
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, erro: 'Não autenticado.' },
      { status: 401 }
    );
  }

  try {
    await prisma.perfil.updateMany({
      where: { clerk_id: userId, deleted_at: null },
      data: { deleted_at: new Date() },
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
