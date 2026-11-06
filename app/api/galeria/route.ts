export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressCatalog } from '@/lib/server/express-bff';

export async function GET(request: Request) {
  return proxyExpressCatalog(request, '/api/galeria', {
    fallbackError: 'Falha ao carregar a galeria de inspirações.',
    noStore: false,
  });
}
