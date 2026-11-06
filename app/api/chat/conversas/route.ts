export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressRequest } from '@/lib/server/express-bff';

export async function GET(request: Request) {
  return proxyExpressRequest(request, '/api/chat/conversas', {
    fallbackError: 'Falha ao carregar as conversas.',
  });
}
