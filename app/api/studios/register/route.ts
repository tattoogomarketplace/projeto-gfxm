export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ReceitaWsError, validateCnpj } from '@/lib/services/receitaws';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { isValidCnpj, onlyCnpjDigits } from '@/lib/utils/cnpj';

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  );
}

/**
 * Registra o vínculo fiscal de um estúdio.
 *
 * Só aceita CNPJ matematicamente válido E com situação ATIVA confirmada na
 * ReceitaWS. Persiste os dados em `EstudioCompliance` (1:1 com `Perfil`) e
 * espelha o CNPJ no perfil para consultas de catálogo.
 *
 * Não altera `kyc_status`/`role`: esses campos são protegidos por trigger de
 * banco e o KYC documental é responsabilidade de `/api/kyc/validate-document`.
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

  const perfil = await prisma.perfil.findUnique({
    where: { clerk_id: userId },
    select: { id: true, role: true, deleted_at: true },
  });

  if (!perfil || perfil.deleted_at) {
    return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
  }

  if (perfil.role !== 'estudio') {
    return NextResponse.json(
      { sucesso: false, erro: 'Apenas contas de estúdio podem registrar CNPJ.' },
      { status: 403 }
    );
  }

  let empresa;
  try {
    empresa = await validateCnpj(cleanCnpj);
  } catch (error) {
    if (error instanceof ReceitaWsError) {
      return NextResponse.json(
        { sucesso: false, erro: error.message },
        { status: error.status }
      );
    }
    console.error('[studios/register] falha ao validar CNPJ', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { sucesso: false, erro: 'Falha ao validar o CNPJ.' },
      { status: 500 }
    );
  }

  if (!empresa.ativa) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: `Não é possível registrar: situação cadastral "${empresa.situacao}".`,
        situacao: empresa.situacao,
      },
      { status: 422 }
    );
  }

  const razaoSocial = empresa.razaoSocial || empresa.nomeFantasia || cleanCnpj;
  const statusReceita = empresa.situacao.toLowerCase();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.estudioCompliance.upsert({
        where: { id: perfil.id },
        update: {
          cnpj: empresa.cnpj,
          razao_social: razaoSocial,
          endereco_oficial: empresa.endereco,
          status_receita: statusReceita,
        },
        create: {
          id: perfil.id,
          cnpj: empresa.cnpj,
          razao_social: razaoSocial,
          endereco_oficial: empresa.endereco,
          status_receita: statusReceita,
        },
      });

      await tx.perfil.update({
        where: { id: perfil.id },
        data: { cnpj: empresa.cnpj },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { sucesso: false, erro: 'Este CNPJ já está vinculado a outro estúdio.' },
        { status: 409 }
      );
    }
    console.error('[studios/register] falha ao persistir dados do estúdio', {
      userId,
      perfilId: perfil.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { sucesso: false, erro: 'Falha ao registrar os dados do estúdio.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sucesso: true,
    studio: {
      id: perfil.id,
      cnpj: empresa.cnpj,
      razaoSocial,
      nomeFantasia: empresa.nomeFantasia,
      situacao: empresa.situacao,
      endereco: empresa.endereco,
    },
    statusReceita,
  });
}
