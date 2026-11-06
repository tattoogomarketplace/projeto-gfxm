export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressRequest } from '@/lib/server/express-bff';

export async function POST(request: Request) {
  return proxyExpressRequest(request, '/api/kyc/verify', {
    timeoutMs: 60_000,
    fallbackError: 'Falha ao verificar KYC.',
  });
}
