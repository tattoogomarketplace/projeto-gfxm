export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { BookingError, criarAgendamentoAtomico } from '@/lib/services/booking-transaction';
import {
  AgendamentoQueryError,
  listAgendamentosForActor,
} from '@/lib/services/agendamento-query';
import { authorizeBookingCreation } from '@/lib/services/booking-authorization';
import { agendamentoCreateSchema, invalidPayloadBody } from '@/lib/security/validation';

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof BookingError || error instanceof AgendamentoQueryError) {
    return NextResponse.json(
      {
        sucesso: false,
        bloqueado: error instanceof BookingError ? error.bloqueado || undefined : undefined,
        erro: error.message,
      },
      { status: error.status }
    );
  }
  console.error('[agendamentos] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json({ sucesso: false, erro: fallback }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const { userId } = await resolvePerfilSession(request);
    if (!userId) {
      return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
    }

    const actor = await prisma.perfil.findUnique({
      where: { clerk_id: userId },
      select: { id: true, deleted_at: true, role: true },
    });
    if (!actor || actor.deleted_at) {
      return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
    }

    const agendamentos = await listAgendamentosForActor({
      actorId: actor.id,
      role: actor.role,
    });

    return NextResponse.json({ sucesso: true, agendamentos }, { status: 200 });
  } catch (error) {
    return errorResponse(error, 'Falha ao carregar agendamentos.');
  }
}

export async function POST(request: Request) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
    }

    const parsed = agendamentoCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(invalidPayloadBody(parsed.error), { status: 400 });
    }

    const { userId } = await resolvePerfilSession(request);
    if (!userId) {
      return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
    }

    const actor = await prisma.perfil.findUnique({
      where: { clerk_id: userId },
      select: { id: true, deleted_at: true, role: true },
    });
    if (!actor || actor.deleted_at) {
      return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
    }

    const authorized = await authorizeBookingCreation({
      actor,
      tatuadorId: parsed.data.tatuador_id,
      clienteId: parsed.data.cliente_id,
    });

    const result = await criarAgendamentoAtomico({
      clienteId: authorized.clienteId,
      tatuadorId: authorized.tatuadorId,
      actorId: authorized.actorId,
      dataHora: parsed.data.data_hora,
      valorTotal: parsed.data.valor_total,
      extras: parsed.data.extras ?? [],
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Falha ao criar agendamento.');
  }
}
