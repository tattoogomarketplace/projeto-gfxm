export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressCatalog } from '@/lib/server/express-bff';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyExpressCatalog(request, `/api/catalogo/artistas/${encodeURIComponent(id)}`, {
    fallbackError: 'Falha ao carregar a vitrine do artista.',
    noStore: false,
  });
}
