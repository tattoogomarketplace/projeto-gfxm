export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { loadReviewActor, replyToReview, ReviewError } from '@/lib/services/reviews';
import { invalidPayloadBody, reviewReplySchema } from '@/lib/security/validation';

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
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new ReviewError(400, 'Payload inválido.');
    }

    const parsed = reviewReplySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(invalidPayloadBody(parsed.error), { status: 400 });
    }

    const { userId } = await resolvePerfilSession(request);
    if (!userId) {
      throw new ReviewError(401, 'Não autenticado.');
    }

    const actor = await loadReviewActor(userId);
    const { id } = await params;
    const reply = parsed.data.reply ?? parsed.data.artistReply ?? '';
    const item = await replyToReview(actor, id, reply);
    return NextResponse.json({ sucesso: true, item });
  } catch (error) {
    return errorResponse(error);
  }
}
