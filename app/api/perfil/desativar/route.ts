export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressRequest } from '@/lib/server/express-bff';

export async function POST(request: Request) {
  return proxyExpressRequest(request, '/api/perfil/desativar', {
    fallbackError: 'Falha ao desativar conta.',
  });
}
