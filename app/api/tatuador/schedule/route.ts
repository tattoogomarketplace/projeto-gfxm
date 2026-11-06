export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressRequest } from '@/lib/server/express-bff';

export async function GET(request: Request) {
  return proxyExpressRequest(request, '/api/tatuador/schedule', {
    fallbackError: 'Falha ao carregar o expediente.',
  });
}

export async function POST(request: Request) {
  return proxyExpressRequest(request, '/api/tatuador/schedule', {
    fallbackError: 'Falha ao salvar o expediente.',
  });
}

export async function PUT(request: Request) {
  return proxyExpressRequest(request, '/api/tatuador/schedule', {
    fallbackError: 'Falha ao salvar o expediente.',
  });
}
