export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { chatErrorResponse, requireChatActor } from '@/lib/services/chat';
import { deleteFlashNote, updateFlashNote } from '@/lib/services/flash-notes';
import { flashNoteUpdateSchema, invalidPayloadBody } from '@/lib/security/validation';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
    }

    const parsed = flashNoteUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(invalidPayloadBody(parsed.error), { status: 400 });
    }

    const actor = await requireChatActor(request);
    const { id } = await params;
    const body = parsed.data;
    const ownerIds = [actor.id, actor.clerk_id].filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0
    );
    const note = await updateFlashNote({
      actorId: actor.id,
      noteId: id,
      content: body.content,
      backgroundId: body.backgroundId,
      fontClass: body.fontClass,
      alignClass: body.alignClass,
      price: body.price,
      discountPercentage: body.discountPercentage,
      imageUrl: body.imageUrl,
      ownerIds,
    });

    return NextResponse.json({ sucesso: true, actorId: actor.id, note });
  } catch (error) {
    return chatErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireChatActor(request);
    const { id } = await params;
    await deleteFlashNote({ actorId: actor.id, noteId: id });
    return NextResponse.json({ sucesso: true, actorId: actor.id, id });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
