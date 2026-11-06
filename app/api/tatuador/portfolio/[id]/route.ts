export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressRequest } from '@/lib/server/express-bff';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyExpressRequest(request, `/api/tatuador/portfolio/${encodeURIComponent(id)}`, {
    fallbackError: 'Falha ao atualizar o portfólio.',
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyExpressRequest(request, `/api/tatuador/portfolio/${encodeURIComponent(id)}`, {
    fallbackError: 'Falha ao arquivar o portfólio.',
  });
}
