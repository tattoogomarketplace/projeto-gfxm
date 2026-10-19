export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getFeaturedReviews, ReviewError } from '@/lib/services/reviews';

function errorResponse(error: unknown) {
  if (error instanceof ReviewError) {
    return NextResponse.json({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[reviews/featured] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    { sucesso: false, erro: 'Falha ao carregar as avaliações em destaque.' },
    { status: 500 }
  );
}

export async function GET() {
  try {
    const payload = await getFeaturedReviews();
    return NextResponse.json({ sucesso: true, ...payload });
  } catch (error) {
    return errorResponse(error);
  }
}
