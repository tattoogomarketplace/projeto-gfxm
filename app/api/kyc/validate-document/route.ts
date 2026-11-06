export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressRequest } from '@/lib/server/express-bff';

export async function POST(request: Request) {
  return proxyExpressRequest(request, '/api/kyc/validate-document', {
    timeoutMs: 60_000,
    fallbackError: 'Falha ao validar documento.',
  });
}
