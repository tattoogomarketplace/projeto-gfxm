export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { getFeaturedReviews, ReviewError } from '@/lib/services/reviews';
import { catalogJson } from '@/lib/security/api-guard';

function errorResponse(error: unknown) {
  if (error instanceof ReviewError) {
    return catalogJson({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[reviews/featured] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return catalogJson(
    { sucesso: false, erro: 'Falha ao carregar as avaliações em destaque.' },
    { status: 500 }
  );
}

export async function GET() {
  try {
    const payload = await getFeaturedReviews();
    return catalogJson({ sucesso: true, ...payload });
  } catch (error) {
    return errorResponse(error);
  }
}
