export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { chatErrorResponse, requireChatActor } from '@/lib/services/chat';
import { deleteFlashNote, updateFlashNote } from '@/lib/services/flash-notes';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireChatActor(request);
    const { id } = await params;
    let body: {
      content?: unknown;
      backgroundId?: unknown;
      fontClass?: unknown;
      alignClass?: unknown;
    } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
    }

    const note = await updateFlashNote({
      actorId: actor.id,
      noteId: id,
      content: body.content,
      backgroundId: body.backgroundId,
      fontClass: body.fontClass,
      alignClass: body.alignClass,
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
