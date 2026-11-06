export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { proxyExpressRequest } from '@/lib/server/express-bff';

export async function GET(request: Request) {
  return proxyExpressRequest(request, '/api/agendamentos', {
    fallbackError: 'Falha ao carregar os agendamentos.',
  });
}

export async function POST(request: Request) {
  return proxyExpressRequest(request, '/api/agendamentos', {
    fallbackError: 'Falha ao criar o agendamento.',
  });
}
