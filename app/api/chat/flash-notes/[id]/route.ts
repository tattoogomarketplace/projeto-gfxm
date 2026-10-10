export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { chatErrorResponse, requireChatActor } from '@/lib/services/chat';
import { deleteFlashNote } from '@/lib/services/flash-notes';

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
