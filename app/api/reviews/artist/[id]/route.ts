export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { getArtistReviews, ReviewError } from '@/lib/services/reviews';
import { catalogJson } from '@/lib/security/api-guard';

function errorResponse(error: unknown) {
  if (error instanceof ReviewError) {
    return catalogJson({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[reviews/artist/:id] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return catalogJson(
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
    return catalogJson({ sucesso: true, ...payload });
  } catch (error) {
    return errorResponse(error);
  }
}
