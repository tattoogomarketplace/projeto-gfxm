export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  chatErrorResponse,
  listConversations,
  parseCategoriaFilter,
  requireChatActor,
} from '@/lib/services/chat';

export async function GET(request: Request) {
  try {
    const actor = await requireChatActor(request);
    const url = new URL(request.url);
    const categoria = parseCategoriaFilter(
      url.searchParams.get('categoria') ?? url.searchParams.get('tab')
    );
    const conversas = await listConversations(actor.id, categoria);
    return NextResponse.json({
      sucesso: true,
      actorId: actor.id,
      categoria: categoria ?? null,
      conversas,
    });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
