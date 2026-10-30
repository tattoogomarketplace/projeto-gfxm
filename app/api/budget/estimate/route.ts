export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { BudgetEstimatorError, getBudgetEstimate } from '@/lib/services/budget-estimator';
import { requireApiUserId, NO_STORE_HEADERS } from '@/lib/security/api-guard';

function errorResponse(error: unknown) {
  if (error instanceof BudgetEstimatorError) {
    return NextResponse.json(
      { sucesso: false, erro: error.message },
      { status: error.status, headers: NO_STORE_HEADERS }
    );
  }
  console.error('[budget/estimate] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    { sucesso: false, erro: 'Falha ao calcular a estimativa.' },
    { status: 500, headers: NO_STORE_HEADERS }
  );
}

export async function GET(request: Request) {
  try {
    const session = await requireApiUserId(request);
    if (session.response) return session.response;

    const url = new URL(request.url);
    const data = await getBudgetEstimate({
      style: url.searchParams.get('style'),
      location: url.searchParams.get('location'),
      artistId: url.searchParams.get('artistId') ?? url.searchParams.get('tatuadorId'),
      artworkId: url.searchParams.get('artworkId') ?? url.searchParams.get('portfolioId'),
      artistName: url.searchParams.get('artistName'),
    });
    return NextResponse.json({ sucesso: true, data }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}
