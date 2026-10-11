export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  chatErrorResponse,
  ChatError,
  getChatContext,
  requireChatActor,
} from '@/lib/services/chat';

export async function GET(request: Request) {
  try {
    const actor = await requireChatActor(request);
    const url = new URL(request.url);
    const artistId = url.searchParams.get('artistId') ?? url.searchParams.get('tatuadorId');
    const artworkId = url.searchParams.get('artworkId') ?? url.searchParams.get('portfolioId');
    if (!artistId) {
      throw new ChatError(400, 'artistId obrigatório.');
    }
    const context = await getChatContext(actor.id, artistId, artworkId ?? undefined);
    return NextResponse.json({ sucesso: true, actorId: actor.id, ...context });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
