export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { BudgetEstimatorError, getCheaperArtists } from '@/lib/services/budget-estimator';
import { requireApiUserId, NO_STORE_HEADERS } from '@/lib/security/api-guard';

function errorResponse(error: unknown) {
  if (error instanceof BudgetEstimatorError) {
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: error.status, headers: NO_STORE_HEADERS }
    );
  }
  console.error('[budget/cheaper] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    { sucesso: false, erro: 'Falha ao listar opções mais acessíveis.' },
    { status: 500, headers: NO_STORE_HEADERS }
  );
}

export async function GET(request: Request) {
  try {
    const session = await requireApiUserId(request);
    if (session.response) return session.response;

    const url = new URL(request.url);
    const maxRaw = url.searchParams.get('maxPriceLimit') ?? url.searchParams.get('maxPrice');
    const maxPriceLimit = maxRaw ? Number(maxRaw) : undefined;
    const artists = await getCheaperArtists({
      style: url.searchParams.get('style') ?? url.searchParams.get('styleId'),
      styleId: url.searchParams.get('styleId') ?? url.searchParams.get('style'),
      currentArtistId:
        url.searchParams.get('currentArtistId') ?? url.searchParams.get('artistId'),
      maxPriceLimit:
        typeof maxPriceLimit === 'number' && Number.isFinite(maxPriceLimit)
          ? maxPriceLimit
          : undefined,
      location: url.searchParams.get('location'),
    });
    return NextResponse.json({ sucesso: true, artists }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}
