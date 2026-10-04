export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextResponse } from 'next/server';
import { ReceitaWsError, validateCnpj } from '@/lib/services/receitaws';
import { isValidCnpj, onlyCnpjDigits } from '@/lib/utils/cnpj';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  const { cnpj } = await params;
  const cleanCnpj = onlyCnpjDigits(cnpj);

  if (!isValidCnpj(cleanCnpj)) {
    return NextResponse.json(
      { sucesso: false, erro: 'CNPJ inválido. Informe 14 dígitos válidos.' },
      { status: 400 }
    );
  }

  try {
    const empresa = await validateCnpj(cleanCnpj);
    return NextResponse.json({
      sucesso: true,
      nome: empresa.razaoSocial,
      fantasia: empresa.nomeFantasia,
    });
  } catch (error) {
    if (error instanceof ReceitaWsError) {
      return NextResponse.json(
        { sucesso: false, erro: error.message },
        { status: error.status }
      );
    }
    console.error('[cnpj] falha inesperada', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { sucesso: false, erro: 'Falha ao consultar o CNPJ.' },
      { status: 500 }
    );
  }
}
