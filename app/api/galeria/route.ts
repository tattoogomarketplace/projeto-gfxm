export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  GaleriaError,
  listGaleriaInspiracoes,
  parseGaleriaSearchParams,
} from '@/lib/services/galeria';

function errorResponse(error: unknown) {
  if (error instanceof GaleriaError) {
    return NextResponse.json({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[galeria] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    { sucesso: false, erro: 'Falha ao carregar a galeria de inspirações.' },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filters = parseGaleriaSearchParams(url.searchParams);
    const items = await listGaleriaInspiracoes(filters);
    return NextResponse.json({ sucesso: true, items });
  } catch (error) {
    return errorResponse(error);
  }
}
