export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  chatErrorResponse,
  listConversations,
  requireChatActor,
} from '@/lib/services/chat';

export async function GET(request: Request) {
  try {
    const actor = await requireChatActor(request);
    const conversas = await listConversations(actor.id);
    return NextResponse.json({ sucesso: true, actorId: actor.id, conversas });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
