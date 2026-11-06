export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressRequest } from '@/lib/server/express-bff';

export async function POST(request: Request) {
  return proxyExpressRequest(request, '/api/chat/enviar', {
    fallbackError: 'Falha ao enviar a mensagem.',
  });
}
