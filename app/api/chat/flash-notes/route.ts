export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { chatErrorResponse, requireChatActor } from '@/lib/services/chat';
import { createFlashNote, listActiveFlashNotes } from '@/lib/services/flash-notes';

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
    const actor = await requireChatActor(request);
    let body: { content?: unknown; expiresAt?: unknown; expires_at?: unknown } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
    }

    const note = await createFlashNote({
      actorId: actor.id,
      actorRole: actor.role,
      content: body.content,
      expiresAt: body.expiresAt ?? body.expires_at,
    });

    return NextResponse.json({ sucesso: true, actorId: actor.id, note }, { status: 201 });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
