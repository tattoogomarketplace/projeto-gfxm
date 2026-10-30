export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  chatErrorResponse,
  ChatError,
  enviarMensagem,
  requireChatActor,
} from '@/lib/services/chat';
import { chatEnviarSchema, invalidPayloadBody } from '@/lib/security/validation';

export async function POST(request: Request) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new ChatError(400, 'Payload inválido.');
    }

    const parsed = chatEnviarSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(invalidPayloadBody(parsed.error), { status: 400 });
    }

    const actor = await requireChatActor(request);
    const artworkId = parsed.data.artworkId ?? parsed.data.artwork_id;

    const mensagemCriada = await enviarMensagem({
      actorId: actor.id,
      actorRole: actor.role,
      destinatarioId: parsed.data.destinatario_id,
      mensagem: parsed.data.mensagem,
      artworkId,
      categoria: parsed.data.categoria,
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
