export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { normalizeSearchQuery, searchPerfisByUsername } from '@/lib/services/user-search';

/**
 * Descoberta global restrita a `@username`.
 *
 * O `q` pode chegar como `@gabriel` ou `gabriel` — o `@` e sempre descartado
 * antes da query. O filtro toca SOMENTE a coluna `username`; o Display Name
 * (`nome`) nao participa da busca.
 */
export async function GET(request: Request) {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  const perfil = await prisma.perfil.findFirst({
    where: { clerk_id: userId, deleted_at: null },
    select: { id: true },
  });
  if (!perfil) {
    return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
  }

  const raw = new URL(request.url).searchParams.get('q') ?? '';
  if (!normalizeSearchQuery(raw)) {
    return NextResponse.json({ sucesso: true, usuarios: [] });
  }

  try {
    const usuarios = await searchPerfisByUsername(raw, perfil.id);
    return NextResponse.json({ sucesso: true, usuarios });
  } catch (error) {
    console.error('[search] falha ao buscar usuarios por @username', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ sucesso: false, erro: 'Falha na busca.' }, { status: 500 });
  }
}
