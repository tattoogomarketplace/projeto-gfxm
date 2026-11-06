export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { revalidatePath } from 'next/cache';
import { proxyExpressRequest } from '@/lib/server/express-bff';

export async function GET(request: Request) {
  const response = await proxyExpressRequest(request, '/api/dev/seed', {
    fallbackError: 'Falha ao semear posts.',
  });
  if (response.ok) {
    try {
      revalidatePath('/', 'layout');
    } catch {
      // Cache revalidation is best-effort on the Next.js edge of the BFF.
    }
  }
  return response;
}
