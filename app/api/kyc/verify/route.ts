export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  composeKycVerdict,
  verifyCpfIdentity,
  verifyLiveness,
  type KycOutcome,
} from '@/lib/services/kyc-service';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { resolveClientIp, verifyTurnstileToken } from '@/lib/security/turnstile';
import { maskCnpj, onlyCnpjDigits } from '@/lib/utils/cnpj';
import { onlyCpfDigits } from '@/lib/utils/cpf';
import { maskCpf } from '@/lib/utils-security';

/** Limite defensivo para chaves/URLs de documento. */
const MAX_DOCUMENT_REF_LENGTH = 1024;
const DELIMITER = '/';

/**
 * Status persistidos no enum `kyc_status` (convenção do projeto):
 * PENDING = `pendente`, APPROVED = `aprovado`, REJECTED = `rejeitado`,
 * análise humana = `em_analise`.
 */
type KycStatusValue = 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado' | 'nao_aplicavel';

const STATUS_LABEL: Record<KycStatusValue, string> = {
  pendente: 'PENDENTE',
  em_analise: 'EM_ANALISE',
  aprovado: 'APROVADO',
  rejeitado: 'REJEITADO',
  nao_aplicavel: 'NAO_APLICAVEL',
};

const payloadSchema = z.object({
  cpf: z.string().trim().min(11, 'CPF/CNPJ inválido.').max(20),
  fullName: z.string().trim().min(5, 'Informe o nome completo do titular.').max(160),
  selfieUrl: z.string().trim().min(1, 'Selfie (prova de vida) é obrigatória.').max(MAX_DOCUMENT_REF_LENGTH),
  documentFrontUrl: z
    .string()
    .trim()
    .min(1, 'Frente do documento é obrigatória.')
    .max(MAX_DOCUMENT_REF_LENGTH),
  documentBackUrl: z.string().trim().max(MAX_DOCUMENT_REF_LENGTH).optional(),
  turnstileToken: z.string().trim().max(2048).optional(),
});

/**
 * Sanitiza uma referência de documento. Aceita tanto a chave crua do bucket
 * quanto a `publicUrl` do R2 — e SÓ essa última, eliminando SSRF (nunca
 * buscamos um host arbitrário fornecido pelo cliente).
 */
function resolveDocumentRef(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_DOCUMENT_REF_LENGTH) return null;

  const base = (process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
  let rawKey = trimmed;

  if (trimmed.includes('://')) {
    if (!base || !trimmed.startsWith(`${base}${DELIMITER}`)) return null;
    rawKey = trimmed.slice(base.length + 1).split(/[?#]/)[0];
    try {
      rawKey = decodeURIComponent(rawKey);
    } catch {
      return null;
    }
  }

  const normalized = rawKey.replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) return null;
  return normalized;
}

function outcomeToStatus(outcome: KycOutcome): KycStatusValue {
  if (outcome === 'aprovado') return 'aprovado';
  if (outcome === 'rejeitado') return 'rejeitado';
  return 'em_analise';
}

function maskDocument(document: string): string {
  return document.length === 14
    ? maskCnpj(document) ?? '***'
    : maskCpf(document);
}

export async function POST(request: Request) {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { sucesso: false, erro: parsed.error.issues[0]?.message ?? 'Payload inválido.' },
      { status: 400 }
    );
  }

  const turnstile = await verifyTurnstileToken(parsed.data.turnstileToken, resolveClientIp(request));
  if (turnstile.configured && !turnstile.success) {
    return NextResponse.json(
      { sucesso: false, erro: 'Falha na verificação anti-bot. Recarregue a página e tente novamente.' },
      { status: 403 }
    );
  }

  const { cpf, fullName, selfieUrl, documentFrontUrl, documentBackUrl } = parsed.data;

  const selfieRef = resolveDocumentRef(selfieUrl);
  const frontRef = resolveDocumentRef(documentFrontUrl);
  const backRef = documentBackUrl ? resolveDocumentRef(documentBackUrl) : null;
  if (!selfieRef || !frontRef || (documentBackUrl && !backRef)) {
    return NextResponse.json(
      { sucesso: false, erro: 'Referências de documento inválidas ou fora do storage permitido.' },
      { status: 400 }
    );
  }

  try {
    const perfil = await prisma.perfil.findUnique({
      where: { clerk_id: userId },
      select: { id: true, role: true, kyc_status: true, deleted_at: true },
    });

    if (!perfil || perfil.deleted_at) {
      return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
    }

    // KYC é exigência exclusiva de profissionais (tatuador/estúdio).
    if (perfil.role === 'cliente') {
      return NextResponse.json(
        { sucesso: false, erro: 'Verificação de identidade não aplicável a clientes.' },
        { status: 409 }
      );
    }

    // Idempotência: conta já verificada não refaz o fluxo (evita nova consulta
    // externa e re-cobrança de quota do provedor).
    if (perfil.kyc_status === 'aprovado') {
      return NextResponse.json({
        sucesso: true,
        status: 'aprovado',
        statusLabel: STATUS_LABEL.aprovado,
        outcome: 'aprovado',
      });
    }

    // Anti-fraude (falsidade ideológica): bloqueia reuso do mesmo documento.
    const normalizedDocument = onlyCpfDigits(cpf).length === 11
      ? onlyCpfDigits(cpf)
      : onlyCnpjDigits(cpf);

    const [documentOwner, kycOwner] = await Promise.all([
      prisma.perfil.findFirst({
        where: {
          OR: [{ cpf: normalizedDocument }, { cnpj: normalizedDocument }],
          NOT: { id: perfil.id },
          deleted_at: null,
        },
        select: { id: true },
      }),
      prisma.kycProfile.findFirst({
        where: { cpfCnpj: normalizedDocument, NOT: { user_id: perfil.id }, deleted_at: null },
        select: { id: true },
      }),
    ]);

    if (documentOwner || kycOwner) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: 'Este documento já está vinculado a outra conta. Procure o suporte.',
        },
        { status: 409 }
      );
    }

    const [identity, liveness] = await Promise.all([
      verifyCpfIdentity(cpf, fullName),
      verifyLiveness(selfieRef, frontRef),
    ]);

    const verdict = composeKycVerdict(identity, liveness);
    const status = outcomeToStatus(verdict.outcome);
    const reviewedAt = status === 'em_analise' ? null : new Date();
    const documentPatch =
      normalizedDocument.length === 14
        ? { cnpj: identity.normalizedDocument }
        : { cpf: identity.normalizedDocument };

    await prisma.$transaction([
      prisma.perfil.update({
        where: { id: perfil.id },
        data: { kyc_status: status, ...documentPatch },
      }),
      prisma.kycProfile.upsert({
        where: { user_id: perfil.id },
        create: {
          user_id: perfil.id,
          status,
          document_type: normalizedDocument.length === 14 ? 'cnpj' : 'cpf',
          documentFrontUrl: frontRef,
          documentBackUrl: backRef,
          selfieUrl: selfieRef,
          cpfCnpj: identity.normalizedDocument,
          rejection_reason: verdict.reason ?? null,
          reviewed_at: reviewedAt,
        },
        update: {
          status,
          document_type: normalizedDocument.length === 14 ? 'cnpj' : 'cpf',
          documentFrontUrl: frontRef,
          documentBackUrl: backRef,
          selfieUrl: selfieRef,
          cpfCnpj: identity.normalizedDocument,
          rejection_reason: verdict.reason ?? null,
          reviewed_at: reviewedAt,
        },
      }),
    ]);

    const httpStatus = status === 'aprovado' ? 200 : status === 'em_analise' ? 202 : 422;

    return NextResponse.json(
      {
        sucesso: verdict.outcome !== 'rejeitado',
        status,
        statusLabel: STATUS_LABEL[status],
        outcome: verdict.outcome,
        document: maskDocument(identity.normalizedDocument),
        identity: {
          verified: identity.verified,
          nameMatches: identity.nameMatches,
          provider: identity.provider,
        },
        liveness: {
          verified: liveness.verified,
          samePerson: liveness.samePerson,
          score: liveness.score,
          provider: liveness.provider,
        },
        ...(verdict.reason ? { motivo: verdict.reason } : {}),
      },
      { status: httpStatus }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { sucesso: false, erro: 'Este documento já está vinculado a outra conta.' },
        { status: 409 }
      );
    }
    console.error('[kyc/verify] falha inesperada', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { sucesso: false, erro: 'Não foi possível concluir a verificação de identidade.' },
      { status: 500 }
    );
  }
}
