export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import {
  listSavedInspirationIds,
  listSavedInspirations,
  SavedInspirationError,
} from '@/lib/services/saved-inspiration';

function errorResponse(error: unknown) {
  if (error instanceof SavedInspirationError) {
    return NextResponse.json({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[inspirations] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    { sucesso: false, erro: 'Falha ao listar inspirações salvas.' },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const { userId } = await resolvePerfilSession(request);
    if (!userId) {
      throw new SavedInspirationError(401, 'Não autenticado.');
    }

    const url = new URL(request.url);
    const idsOnly = url.searchParams.get('ids') === '1';
    if (idsOnly) {
      const ids = await listSavedInspirationIds(userId);
      return NextResponse.json({ sucesso: true, ids });
    }

    const items = await listSavedInspirations(userId);
    return NextResponse.json({ sucesso: true, items });
  } catch (error) {
    return errorResponse(error);
  }
}
