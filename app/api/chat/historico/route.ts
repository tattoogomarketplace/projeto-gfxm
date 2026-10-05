export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  chatErrorResponse,
  getHistorico,
  requireChatActor,
} from '@/lib/services/chat';

export async function GET(request: Request) {
  try {
    const actor = await requireChatActor(request);
    const url = new URL(request.url);
    const interlocutorId =
      url.searchParams.get('interlocutor_id') ??
      url.searchParams.get('artistId') ??
      '';
    const data = await getHistorico(actor.id, interlocutorId);
    return NextResponse.json({ sucesso: true, actorId: actor.id, data });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
