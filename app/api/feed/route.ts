export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressCatalog } from '@/lib/server/express-bff';

export async function GET(request: Request) {
  return proxyExpressCatalog(request, '/api/catalogo/feed', {
    fallbackError: 'Falha ao carregar o feed.',
    emptyItems: true,
    noStore: false,
  });
}
