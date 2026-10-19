export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getArtistReviews, ReviewError } from '@/lib/services/reviews';

function errorResponse(error: unknown) {
  if (error instanceof ReviewError) {
    return NextResponse.json({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[reviews/artist/:id] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    { sucesso: false, erro: 'Falha ao carregar as avaliações do artista.' },
    { status: 500 }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await getArtistReviews(id);
    return NextResponse.json({ sucesso: true, ...payload });
  } catch (error) {
    return errorResponse(error);
  }
}
