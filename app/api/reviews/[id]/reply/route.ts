export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { loadReviewActor, replyToReview, ReviewError } from '@/lib/services/reviews';

function errorResponse(error: unknown) {
  if (error instanceof ReviewError) {
    return NextResponse.json({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[reviews/:id/reply] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    { sucesso: false, erro: 'Falha ao responder a avaliação.' },
    { status: 500 }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await resolvePerfilSession(request);
    if (!userId) {
      throw new ReviewError(401, 'Não autenticado.');
    }

    const actor = await loadReviewActor(userId);
    const { id } = await params;

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      throw new ReviewError(400, 'Payload inválido.');
    }

    const reply =
      typeof body === 'object' && body && 'reply' in body
        ? (body as { reply?: unknown }).reply
        : typeof body === 'object' && body && 'artistReply' in body
          ? (body as { artistReply?: unknown }).artistReply
          : '';

    const item = await replyToReview(actor, id, typeof reply === 'string' ? reply : '');
    return NextResponse.json({ sucesso: true, item });
  } catch (error) {
    return errorResponse(error);
  }
}
