export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextResponse } from 'next/server';
import { ReceitaWsError, validateCnpj } from '@/lib/services/receitaws';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { isValidCnpj, onlyCnpjDigits } from '@/lib/utils/cnpj';

/**
 * Valida um CNPJ junto à ReceitaWS e devolve os dados cadastrais normalizados.
 * Requer sessão Clerk; o CNPJ é sanitizado/validado antes de qualquer chamada
 * externa. Não persiste nada (uso em pré-visualização/onboarding).
 */
export async function POST(request: Request) {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  let body: { cnpj?: unknown } = {};
  try {
    body = (await request.json()) as { cnpj?: unknown };
  } catch {
    return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
  }

  const cleanCnpj = onlyCnpjDigits(typeof body.cnpj === 'string' ? body.cnpj : '');
  if (!isValidCnpj(cleanCnpj)) {
    return NextResponse.json(
      { sucesso: false, erro: 'CNPJ inválido. Informe 14 dígitos válidos.' },
      { status: 400 }
    );
  }

  try {
    const empresa = await validateCnpj(cleanCnpj);
    return NextResponse.json({ sucesso: true, ...empresa });
  } catch (error) {
    if (error instanceof ReceitaWsError) {
      return NextResponse.json(
        { sucesso: false, erro: error.message },
        { status: error.status }
      );
    }
    console.error('[studios/validate-cnpj] falha inesperada', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { sucesso: false, erro: 'Falha ao validar o CNPJ.' },
      { status: 500 }
    );
  }
}
