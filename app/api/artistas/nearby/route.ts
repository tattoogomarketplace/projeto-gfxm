export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressCatalog } from '@/lib/server/express-bff';

export async function GET(request: Request) {
  return proxyExpressCatalog(request, '/api/artistas/nearby', {
    fallbackError: 'Falha ao localizar artistas próximos.',
  });
}
