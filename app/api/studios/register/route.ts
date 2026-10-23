export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ReceitaWsError, validateCnpj } from '@/lib/services/receitaws';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { isValidCnpj, onlyCnpjDigits } from '@/lib/utils/cnpj';
import { cnpjSchema, invalidPayloadBody } from '@/lib/security/validation';

const payloadSchema = z.object({ cnpj: cnpjSchema });

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
 * banco e os Documentos Pessoais são responsabilidade de `/api/kyc/validate-document`.
 */
export async function POST(request: Request) {
  // Sanitização impiedosa PRIMEIRO: CNPJ malformado nunca toca em sessão/banco.
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
      const mutated = await tx.perfil.updateMany({
        where: { id: perfil.id, clerk_id: userId, deleted_at: null, role: 'estudio' },
        data: { cnpj: empresa.cnpj },
      });
      if (mutated.count === 0) {
        throw new Error('PERFIL_NOT_FOUND');
      }

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
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'PERFIL_NOT_FOUND') {
      return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
    }
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
