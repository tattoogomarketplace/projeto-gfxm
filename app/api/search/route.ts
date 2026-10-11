export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import {
  isValidUsernameSearchQuery,
  searchPerfisByUsername,
} from '@/lib/services/user-search';

/**
 * Descoberta global restrita a `@username`.
 *
 * Blindagem em duas camadas:
 * 1. Gate Regex soberano (`^@[a-z0-9_]+$`) executado ANTES de qualquer toque no
 *    banco de dados — queries malformadas morrem aqui com `400`.
 * 2. Query Prisma com `take` rigido e `select` minimo (nunca devolve payloads
 *    gigantes nem objetos de usuario completos).
 *
 * O filtro toca SOMENTE a coluna `username`; o Display Name (`nome`) nao
 * participa da busca.
 */
export async function GET(request: Request) {
  // 1) Portao de validacao — zero operacoes de banco em caso de falha.
  const raw = new URL(request.url).searchParams.get('q') ?? '';
  if (!isValidUsernameSearchQuery(raw)) {
    return NextResponse.json(
      { sucesso: false, erro: 'Consulta inválida.' },
      { status: 400 }
    );
  }

  try {
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

    const usuarios = await searchPerfisByUsername(raw, perfil.id);
    return NextResponse.json({ sucesso: true, usuarios });
  } catch (error) {
    console.error('[search] falha ao buscar usuarios por @username', {
      error: error instanceof Error ? error.name : 'unknown',
    });
    return NextResponse.json({ sucesso: false, erro: 'Falha na busca.' }, { status: 500 });
  }
}
