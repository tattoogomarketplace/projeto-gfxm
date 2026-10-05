export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  chatErrorResponse,
  ChatError,
  enviarMensagem,
  requireChatActor,
} from '@/lib/services/chat';

export async function POST(request: Request) {
  try {
    const actor = await requireChatActor(request);

    let body: {
      destinatario_id?: unknown;
      mensagem?: unknown;
      artworkId?: unknown;
      artwork_id?: unknown;
    } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      throw new ChatError(400, 'Payload inválido.');
    }

    const destinatarioId =
      typeof body.destinatario_id === 'string' ? body.destinatario_id : '';
    const mensagem = typeof body.mensagem === 'string' ? body.mensagem : '';
    const artworkRaw = body.artworkId ?? body.artwork_id;
    const artworkId = typeof artworkRaw === 'string' ? artworkRaw : undefined;

    const mensagemCriada = await enviarMensagem({
      actorId: actor.id,
      destinatarioId,
      mensagem,
      artworkId,
    });

    return NextResponse.json({
      sucesso: true,
      actorId: actor.id,
      mensagem: mensagemCriada,
      status: mensagemCriada.status,
    });
  } catch (error) {
    return chatErrorResponse(error);
  }
}
