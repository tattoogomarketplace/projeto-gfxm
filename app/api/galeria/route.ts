export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import {
  GaleriaError,
  listGaleriaInspiracoes,
  parseGaleriaSearchParams,
} from '@/lib/services/galeria';
import { catalogJson } from '@/lib/security/api-guard';

function errorResponse(error: unknown) {
  if (error instanceof GaleriaError) {
    return catalogJson({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[galeria] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return catalogJson(
    { sucesso: false, erro: 'Falha ao carregar a galeria de inspirações.' },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = parseGaleriaSearchParams(url.searchParams);
    const items = await listGaleriaInspiracoes(filters);
    return catalogJson({ sucesso: true, items });
  } catch (error) {
    return errorResponse(error);
  }
}
