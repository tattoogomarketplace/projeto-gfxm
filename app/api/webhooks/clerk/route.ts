export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressRaw } from '@/lib/server/express-bff';

export async function POST(request: Request) {
  return proxyExpressRaw(request, '/api/webhooks/clerk');
}
