export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressRequest } from '@/lib/server/express-bff';

export async function GET(request: Request) {
  return proxyExpressRequest(request, '/api/user/language', {
    fallbackError: 'Falha ao carregar o idioma.',
  });
}

export async function POST(request: Request) {
  return proxyExpressRequest(request, '/api/user/language', {
    fallbackError: 'Falha ao salvar o idioma.',
  });
}

export async function PUT(request: Request) {
  return proxyExpressRequest(request, '/api/user/language', {
    fallbackError: 'Falha ao salvar o idioma.',
  });
}
