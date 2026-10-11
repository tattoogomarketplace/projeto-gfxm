export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import {
  ArtistPortfolioError,
  assertTatuador,
  listArtistPortfolio,
  loadTatuadorActor,
  publishArtistPortfolio,
} from '@/lib/services/artist-portfolio';

async function resolveTatuador(request: Request) {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    throw new ArtistPortfolioError(401, 'Não autenticado.');
  }
  const actor = await loadTatuadorActor(userId);
  return assertTatuador(actor);
}

function errorResponse(error: unknown) {
  if (error instanceof ArtistPortfolioError) {
    return NextResponse.json({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[tatuador/portfolio] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    { sucesso: false, erro: 'Falha ao processar o portfólio.' },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const actor = await resolveTatuador(request);
    const items = await listArtistPortfolio(actor.id);
    return NextResponse.json({ sucesso: true, items });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await resolveTatuador(request);
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      throw new ArtistPortfolioError(400, 'Payload inválido.');
    }
    const item = await publishArtistPortfolio(actor.id, body);
    return NextResponse.json({ sucesso: true, item }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
