export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import {
  loadSaveActor,
  SavedInspirationError,
  toggleSavedInspiration,
} from '@/lib/services/saved-inspiration';

function errorResponse(error: unknown) {
  if (error instanceof SavedInspirationError) {
    return NextResponse.json(
      { success: false, sucesso: false, erro: error.message },
      { status: error.status }
    );
  }
  console.error('[inspirations/:postId/save] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    { success: false, sucesso: false, erro: 'Falha ao salvar a inspiração.' },
    { status: 500 }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { userId } = await resolvePerfilSession(request);
    if (!userId) {
      throw new SavedInspirationError(401, 'Não autenticado.');
    }

    const actor = await loadSaveActor(userId);
    const { postId } = await params;
    const result = await toggleSavedInspiration(actor.id, postId);

    return NextResponse.json({
      success: true,
      sucesso: true,
      isSaved: result.isSaved,
      message: result.message,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
