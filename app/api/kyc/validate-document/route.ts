export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { analyzeKycDocument } from '@/lib/ai/kyc-validator';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { resolveClientIp, verifyTurnstileToken } from '@/lib/security/turnstile';
import { guardAppIntegrity } from '@/src/lib/security/attestation-validator';
import { fetchR2Object } from '@/lib/storage/r2';
import { invalidPayloadBody, kycValidateDocumentSchema } from '@/lib/security/validation';

/** Limite defensivo: o inlineData do Gemini aceita ~20MB; mantemos folga. */
const MAX_OBJECT_BYTES = 10 * 1024 * 1024;
const MAX_FILE_KEY_LENGTH = 512;
const DELIMITER = '/';

const ALLOWED_MIME_PREFIXES = ['image/', 'application/pdf'] as const;

type KycStatusValue = 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado' | 'nao_aplicavel';

/** Abaixo deste score a aprovação é retida para revisão humana. */
const MIN_AUTO_APPROVE_SCORE = 60;

/**
 * Sanitização impiedosa do payload: aceita `fileKey` cru do bucket OU
 * `publicUrl` do R2, mais `contentType` e `turnstileToken` obrigatório. Qualquer
 * outro formato é rejeitado com HTTP 400 antes de tocar em segurança ou banco.
 */
type ValidateDocumentPayload = z.infer<typeof kycValidateDocumentSchema>;

function sanitizeFileKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/^\/+/, '');
  if (!trimmed || trimmed.length > MAX_FILE_KEY_LENGTH) return null;
  if (trimmed.includes('..') || trimmed.includes('://')) return null;
  return trimmed;
}

/**
 * Resolve a chave do objeto a partir de `fileKey` OU de uma `publicUrl`.
 *
 * A URL só é aceita se pertencer ao domínio público configurado do R2, o que
 * elimina SSRF: nunca buscamos um host arbitrário fornecido pelo cliente.
 */
function resolveFileKey(body: ValidateDocumentPayload): string | null {
  const direct = sanitizeFileKey(body.fileKey);
  if (direct) return direct;

  const url = body.publicUrl?.trim();
  if (!url) return null;
  const base = (process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
  if (!base) return null;

  if (!url.startsWith(`${base}${DELIMITER}`)) return null;

  const rawKey = url.slice(base.length + 1).split(/[?#]/)[0];
  try {
    return sanitizeFileKey(decodeURIComponent(rawKey));
  } catch {
    return null;
  }
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: string }).name;
  const status =
    (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
  return name === 'NoSuchKey' || name === 'NotFound' || status === 404;
}

export async function POST(request: Request) {
  try {
    // 1) Sanitização impiedosa PRIMEIRO: payload malformado nunca toca em
    //    integridade, Turnstile, storage ou banco.
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
    }

    const parsed = kycValidateDocumentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(invalidPayloadBody(parsed.error), { status: 400 });
    }
    const body = parsed.data;

    // 2) Integridade do aplicativo.
    const integrity = await guardAppIntegrity(request);
    if (!integrity.allowed) {
      return NextResponse.json(
        { sucesso: false, erro: 'Integridade do aplicativo não verificada.', codigo: 'APP_INTEGRITY_REQUIRED' },
        { status: 403 }
      );
    }

    // 3) Sessão.
    const { userId } = await resolvePerfilSession(request);
    if (!userId) {
      return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { sucesso: false, erro: 'Validação indisponível. Configure GEMINI_API_KEY.' },
        { status: 503 }
      );
    }

    // 4) Anti-bot.
    const turnstile = await verifyTurnstileToken(body.turnstileToken, resolveClientIp(request));
    if (turnstile.configured && !turnstile.success) {
      return NextResponse.json(
        { sucesso: false, erro: 'Falha na verificação anti-bot. Recarregue a página e tente novamente.' },
        { status: 403 }
      );
    }

    const fileKey = resolveFileKey(body);
    if (!fileKey) {
      return NextResponse.json(
        { sucesso: false, erro: 'Informe um fileKey ou publicUrl válido do R2.' },
        { status: 400 }
      );
    }

    const perfil = await prisma.perfil.findUnique({
      where: { clerk_id: userId },
      select: { id: true, role: true, nome: true, deleted_at: true },
    });

    if (!perfil || perfil.deleted_at) {
      return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
    }

    // Documentos Pessoais são exigência exclusiva de profissionais (tatuador/estúdio).
    if (perfil.role === 'cliente') {
      return NextResponse.json(
        { sucesso: false, erro: 'Verificação de Documentos Pessoais não aplicável a clientes.' },
        { status: 409 }
      );
    }

    let object;
    try {
      object = await fetchR2Object(fileKey);
    } catch (error) {
      if (isNotFoundError(error)) {
        return NextResponse.json(
          { sucesso: false, erro: 'Documento não encontrado no storage.' },
          { status: 404 }
        );
      }
      throw error;
    }

    if (object.contentLength > MAX_OBJECT_BYTES) {
      return NextResponse.json(
        { sucesso: false, erro: 'Documento excede o tamanho máximo permitido.' },
        { status: 413 }
      );
    }

    const mimeType =
      object.contentType || body.contentType || 'application/octet-stream';

    if (!ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) {
      return NextResponse.json(
        { sucesso: false, erro: 'Formato de documento não suportado.' },
        { status: 415 }
      );
    }

    const base64 = Buffer.from(object.body).toString('base64');
    const analysis = await analyzeKycDocument({ base64, mimeType });

    const status: KycStatusValue = !analysis.isValid
      ? 'rejeitado'
      : analysis.confidenceScore >= MIN_AUTO_APPROVE_SCORE
        ? 'aprovado'
        : 'em_analise';

    const data: { kyc_status: KycStatusValue; nome?: string } = { kyc_status: status };
    if (analysis.isValid && !perfil.nome && analysis.extractedName) {
      data.nome = analysis.extractedName;
    }

    try {
      const updated = await prisma.perfil.updateMany({
        where: { id: perfil.id, clerk_id: userId, deleted_at: null },
        data,
      });
      if (updated.count === 0) {
        return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
      }
    } catch (error) {
      console.error('[kyc/validate-document] falha ao persistir status de Documentos Pessoais', {
        userId,
        perfilId: perfil.id,
        status,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { sucesso: false, erro: 'Falha ao atualizar o status de verificação.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      isValid: analysis.isValid,
      extractedName: analysis.extractedName,
      confidenceScore: analysis.confidenceScore,
      status,
    });
  } catch (error) {
    console.error('[DOCUMENTOS_AI_ERROR]', error);
    return NextResponse.json(
      {
        error: 'Erro interno na análise',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
