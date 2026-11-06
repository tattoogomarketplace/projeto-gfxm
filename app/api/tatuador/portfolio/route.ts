export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressRequest } from '@/lib/server/express-bff';

export async function GET(request: Request) {
  return proxyExpressRequest(request, '/api/tatuador/portfolio', {
    fallbackError: 'Falha ao carregar o portfólio.',
  });
}

export async function POST(request: Request) {
  return proxyExpressRequest(request, '/api/tatuador/portfolio', {
    fallbackError: 'Falha ao publicar no portfólio.',
  });
}
