export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressRequest } from '@/lib/server/express-bff';

export async function GET(request: Request) {
  return proxyExpressRequest(request, '/api/user/username', {
    fallbackError: 'Falha ao verificar @username.',
  });
}

export async function POST(request: Request) {
  return proxyExpressRequest(request, '/api/user/username', {
    fallbackError: 'Falha ao definir @username.',
  });
}

export async function PUT(request: Request) {
  return proxyExpressRequest(request, '/api/user/username', {
    fallbackError: 'Falha ao definir @username.',
  });
}
