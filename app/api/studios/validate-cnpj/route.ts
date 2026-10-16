export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ReceitaWsError, validateCnpj } from '@/lib/services/receitaws';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { isValidCnpj, onlyCnpjDigits } from '@/lib/utils/cnpj';
import { cnpjSchema, invalidPayloadBody } from '@/lib/security/validation';

const payloadSchema = z.object({ cnpj: cnpjSchema });

/**
 * Valida um CNPJ junto à ReceitaWS e devolve os dados cadastrais normalizados.
 * Requer sessão Clerk; o CNPJ é sanitizado/validado antes de qualquer chamada
 * externa. Não persiste nada (uso em pré-visualização/onboarding).
 */
export async function POST(request: Request) {
  // Sanitização impiedosa PRIMEIRO: CNPJ malformado nunca toca em sessão/provedor.
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(invalidPayloadBody(parsed.error), { status: 400 });
  }

  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  const cleanCnpj = onlyCnpjDigits(parsed.data.cnpj);
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
