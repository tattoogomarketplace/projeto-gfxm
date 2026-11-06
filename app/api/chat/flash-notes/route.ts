export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressRequest } from '@/lib/server/express-bff';

export async function GET(request: Request) {
  return proxyExpressRequest(request, '/api/chat/flash-notes', {
    fallbackError: 'Falha ao carregar as flash notes.',
  });
}

export async function POST(request: Request) {
  return proxyExpressRequest(request, '/api/chat/flash-notes', {
    fallbackError: 'Falha ao criar a flash note.',
  });
}
