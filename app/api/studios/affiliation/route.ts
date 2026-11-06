export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressRequest } from '@/lib/server/express-bff';

export async function GET(request: Request) {
  return proxyExpressRequest(request, '/api/studios/affiliation', {
    fallbackError: 'Falha ao carregar afiliação.',
  });
}

export async function POST(request: Request) {
  return proxyExpressRequest(request, '/api/studios/affiliation', {
    fallbackError: 'Falha ao solicitar afiliação.',
  });
}

export async function PATCH(request: Request) {
  return proxyExpressRequest(request, '/api/studios/affiliation', {
    fallbackError: 'Falha ao decidir afiliação.',
  });
}
