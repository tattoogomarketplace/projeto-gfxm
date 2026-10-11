export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { BookingError, criarAgendamentoAtomico } from '@/lib/services/booking-transaction';

function errorResponse(error: unknown) {
  if (error instanceof BookingError) {
    return NextResponse.json(
      {
        sucesso: false,
        bloqueado: error.bloqueado || undefined,
        erro: error.message,
      },
      { status: error.status }
    );
  }
  console.error('[agendamentos] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    { sucesso: false, erro: 'Falha ao criar agendamento.' },
    { status: 500 }
  );
}

export async function POST(request: Request) {
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

    let body: {
      tatuador_id?: unknown;
      data_hora?: unknown;
      valor_total?: unknown;
      extras?: unknown;
    } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
    }

    const tatuadorId = typeof body.tatuador_id === 'string' ? body.tatuador_id.trim() : '';
    const dataHora = typeof body.data_hora === 'string' ? body.data_hora : '';
    if (!tatuadorId || !dataHora) {
      return NextResponse.json(
        { sucesso: false, erro: 'tatuador_id, data_hora e valor_total sao obrigatorios.' },
        { status: 400 }
      );
    }

    const result = await criarAgendamentoAtomico({
      clienteId: actor.id,
      tatuadorId,
      dataHora,
      valorTotal: body.valor_total,
      extras: Array.isArray(body.extras) ? body.extras : [],
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
