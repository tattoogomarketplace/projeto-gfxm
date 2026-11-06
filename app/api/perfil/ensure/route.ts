export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressRequest } from '@/lib/server/express-bff';

export async function GET(request: Request) {
  return proxyExpressRequest(request, '/api/perfil/ensure', {
    method: 'POST',
    fallbackError: 'Falha ao garantir perfil.',
  });
}

export async function POST(request: Request) {
  return proxyExpressRequest(request, '/api/perfil/ensure', {
    fallbackError: 'Falha ao garantir perfil.',
  });
}
