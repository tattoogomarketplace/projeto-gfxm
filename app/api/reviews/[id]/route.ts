export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getReviewById, ReviewError } from '@/lib/services/reviews';

function errorResponse(error: unknown) {
  if (error instanceof ReviewError) {
    return NextResponse.json({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[reviews/:id] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
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
    return NextResponse.json({ sucesso: true, review });
  } catch (error) {
    return errorResponse(error);
  }
}
