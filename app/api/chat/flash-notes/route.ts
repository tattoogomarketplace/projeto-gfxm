export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { chatErrorResponse, requireChatActor } from '@/lib/services/chat';
import { createFlashNote, listActiveFlashNotes } from '@/lib/services/flash-notes';
import { flashNoteCreateSchema, invalidPayloadBody } from '@/lib/security/validation';

export async function GET(request: Request) {
  try {
    const actor = await requireChatActor(request);
    const url = new URL(request.url);
    const mine = url.searchParams.get('mine') === '1' || url.searchParams.get('mine') === 'true';
    const notes = await listActiveFlashNotes(mine ? actor.id : undefined);
    return NextResponse.json({ sucesso: true, actorId: actor.id, notes });
  } catch (error) {
    return chatErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
    }

    const parsed = flashNoteCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(invalidPayloadBody(parsed.error), { status: 400 });
    }

    const actor = await requireChatActor(request);
    const body = parsed.data;
    const ownerIds = [actor.id, actor.clerk_id].filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0
    );
    const note = await createFlashNote({
      actorId: actor.id,
      actorRole: actor.role,
      content: body.content,
      expiresAt: body.expiresAt ?? body.expires_at,
      backgroundId: body.backgroundId,
      fontClass: body.fontClass,
      alignClass: body.alignClass,
      price: body.price,
      discountPercentage: body.discountPercentage,
      imageUrl: body.imageUrl,
      ownerIds,
    });

    return NextResponse.json({ sucesso: true, actorId: actor.id, note }, { status: 201 });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
