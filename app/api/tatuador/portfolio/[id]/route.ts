export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import {
  ArtistPortfolioError,
  archiveArtistPortfolio,
  assertTatuador,
  loadTatuadorActor,
  updateArtistPortfolio,
} from '@/lib/services/artist-portfolio';
import { invalidPayloadBody, portfolioUpdateSchema } from '@/lib/security/validation';

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
  console.error('[tatuador/portfolio/:id] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    { sucesso: false, erro: 'Falha ao processar o portfólio.' },
    { status: 500 }
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      throw new ArtistPortfolioError(400, 'Payload inválido.');
    }
    const parsed = portfolioUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(invalidPayloadBody(parsed.error), { status: 400 });
    }
    const actor = await resolveTatuador(request);
    const { id } = await params;
    const item = await updateArtistPortfolio(actor.id, id, parsed.data);
    return NextResponse.json({ sucesso: true, item });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await resolveTatuador(request);
    const { id } = await params;
    await archiveArtistPortfolio(actor.id, id);
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return errorResponse(error);
  }
}
