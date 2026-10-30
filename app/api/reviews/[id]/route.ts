export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { getReviewById, ReviewError } from '@/lib/services/reviews';
import { catalogJson } from '@/lib/security/api-guard';

function errorResponse(error: unknown) {
  if (error instanceof ReviewError) {
    return catalogJson({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[reviews/:id] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return catalogJson(
    { sucesso: false, erro: 'Falha ao carregar a avaliação.' },
    { status: 500 }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const review = await getReviewById(id);
    return catalogJson({ sucesso: true, review });
  } catch (error) {
    return errorResponse(error);
  }
}
