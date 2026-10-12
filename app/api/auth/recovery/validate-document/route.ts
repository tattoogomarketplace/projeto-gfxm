export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { fetchR2Object } from '@/lib/storage/r2';
import { inspectDocumentBuffer } from '@/lib/ai/document-forensics';
import { analyzeKycDocument } from '@/lib/ai/kyc-validator';

/**
 * RECUPERAÇÃO DE ACESSO — ANÁLISE DE DOCUMENTO DE IDENTIDADE
 *
 * Etapa 2 do fluxo "Esqueci a Senha". Reutiliza o mesmo motor seguro de upload
 * do módulo de verificação profissional (presign no R2) e aplica uma guarda
 * ESTRITA em duas camadas: (1) forense determinística local
 * (`inspectDocumentBuffer`) valida assinatura, integridade e formato; (2) visão
 * computacional (`analyzeKycDocument`) confirma que a imagem é de fato um
 * documento de identificação legível. A rota FALHA FECHADO: qualquer resposta
 * ambígua, ausência de provedor de visão ou baixa confiança resulta em
 * `success: false`, impedindo a máquina de estados de avançar.
 */

const MAX_OBJECT_BYTES = 10 * 1024 * 1024;
const MAX_FILE_KEY_LENGTH = 512;
const DELIMITER = '/';
const MIN_CONFIDENCE = 60;
const GENERIC_REJECTION = 'Documento inválido ou ilegível. Tente novamente.';

type RecoveryDocumentBody = {
  fileKey?: unknown;
  publicUrl?: unknown;
  contentType?: unknown;
};

function sanitizeFileKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/^\/+/, '');
  if (!trimmed || trimmed.length > MAX_FILE_KEY_LENGTH) return null;
  if (trimmed.includes('..') || trimmed.includes('://')) return null;
  return trimmed;
}

/** Aceita `fileKey` OU uma `publicUrl` restrita ao domínio público do R2 (anti-SSRF). */
function resolveFileKey(body: RecoveryDocumentBody): string | null {
  const direct = sanitizeFileKey(body.fileKey);
  if (direct) return direct;

  if (typeof body.publicUrl !== 'string' || !body.publicUrl.trim()) return null;
  const base = (process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
  if (!base) return null;

  const url = body.publicUrl.trim();
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
    const { userId } = await resolvePerfilSession(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, valid: false, erro: 'Não autenticado.' },
        { status: 401 }
      );
    }

    let body: RecoveryDocumentBody = {};
    try {
      body = (await request.json()) as RecoveryDocumentBody;
    } catch {
      return NextResponse.json(
        { success: false, valid: false, erro: 'Payload inválido.' },
        { status: 400 }
      );
    }

    const fileKey = resolveFileKey(body);
    if (!fileKey) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          erro: 'Informe um fileKey ou publicUrl válido do R2.',
        },
        { status: 400 }
      );
    }

    let object;
    try {
      object = await fetchR2Object(fileKey);
    } catch (error) {
      if (isNotFoundError(error)) {
        return NextResponse.json(
          { success: false, valid: false, erro: 'Documento não encontrado no storage.' },
          { status: 404 }
        );
      }
      throw error;
    }

    if (object.contentLength > MAX_OBJECT_BYTES) {
      return NextResponse.json(
        { success: false, valid: false, erro: 'Documento excede o tamanho máximo permitido.' },
        { status: 413 }
      );
    }

    const declaredMime =
      object.contentType ||
      (typeof body.contentType === 'string' ? body.contentType.trim() : '');

    const inspection = inspectDocumentBuffer({
      body: object.body,
      declaredMime,
      fileName: fileKey,
      kind: 'pessoal',
    });

    if (!inspection.ok) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          status: 'rejeitado',
          erro: inspection.reason ?? GENERIC_REJECTION,
        },
        { status: 422 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('[auth/recovery/validate-document] provedor de visão indisponível');
      return NextResponse.json(
        {
          success: false,
          valid: false,
          status: 'indisponivel',
          erro: 'Validação de segurança indisponível. Tente novamente mais tarde.',
        },
        { status: 503 }
      );
    }

    let analysis;
    try {
      analysis = await analyzeKycDocument({
        base64: Buffer.from(object.body).toString('base64'),
        mimeType: inspection.mimeType,
        kind: 'pessoal',
      });
    } catch (error) {
      console.error('[auth/recovery/validate-document] falha na análise de visão', {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { success: false, valid: false, status: 'rejeitado', erro: GENERIC_REJECTION },
        { status: 422 }
      );
    }

    if (analysis.isValid !== true || analysis.confidenceScore < MIN_CONFIDENCE) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          status: 'rejeitado',
          erro: analysis.rejectionReason || GENERIC_REJECTION,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      status: 'aprovado',
      mimeType: inspection.mimeType,
      size: inspection.size,
      documentType: analysis.documentType ?? null,
      confidenceScore: analysis.confidenceScore,
    });
  } catch (error) {
    console.error('[auth/recovery/validate-document] falha', error);
    return NextResponse.json(
      { success: false, valid: false, erro: 'Não foi possível analisar o documento.' },
      { status: 500 }
    );
  }
}
