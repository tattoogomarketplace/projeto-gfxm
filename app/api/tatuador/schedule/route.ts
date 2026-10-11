export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import {
  ArtistScheduleError,
  assertTatuador,
  getArtistSchedule,
  loadTatuadorActor,
  saveArtistSchedule,
} from '@/lib/services/artist-schedule';

async function resolveTatuador(request: Request) {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    throw new ArtistScheduleError(401, 'Não autenticado.');
  }
  const actor = await loadTatuadorActor(userId);
  return assertTatuador(actor);
}

function errorResponse(error: unknown) {
  if (error instanceof ArtistScheduleError) {
    return NextResponse.json({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[tatuador/schedule] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    { sucesso: false, erro: 'Falha ao processar o expediente.' },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const actor = await resolveTatuador(request);
    const result = await getArtistSchedule(actor.id);
    return NextResponse.json({
      sucesso: true,
      schedule: result.schedule,
      persisted: result.persisted,
      updatedAt: result.updatedAt,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function upsertSchedule(request: Request) {
  const actor = await resolveTatuador(request);
  let body: { schedule?: unknown; scheduleJson?: unknown } = {};
  try {
    body = (await request.json()) as { schedule?: unknown; scheduleJson?: unknown };
  } catch {
    throw new ArtistScheduleError(400, 'Payload inválido.');
  }

  const raw = body.schedule ?? body.scheduleJson;
  if (raw === undefined) {
    throw new ArtistScheduleError(400, 'Informe o expediente em schedule.');
  }

  const result = await saveArtistSchedule(actor.id, raw);
  return NextResponse.json({
    sucesso: true,
    schedule: result.schedule,
    persisted: result.persisted,
    updatedAt: result.updatedAt,
  });
}

export async function POST(request: Request) {
  try {
    return await upsertSchedule(request);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    return await upsertSchedule(request);
  } catch (error) {
    return errorResponse(error);
  }
}
