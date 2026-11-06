export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressRequest } from '@/lib/server/express-bff';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyExpressRequest(request, `/api/reviews/${encodeURIComponent(id)}/reply`, {
    fallbackError: 'Falha ao responder a avaliação.',
  });
}
