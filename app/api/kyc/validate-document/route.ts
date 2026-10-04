export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeKycDocument } from '@/lib/ai/kyc-validator';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { fetchR2Object } from '@/lib/storage/r2';

/** Limite defensivo: o inlineData do Gemini aceita ~20MB; mantemos folga. */
const MAX_OBJECT_BYTES = 10 * 1024 * 1024;
const MAX_FILE_KEY_LENGTH = 512;
const DELIMITER = '/';

const ALLOWED_MIME_PREFIXES = ['image/', 'application/pdf'] as const;

type KycStatusValue = 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado' | 'nao_aplicavel';

/** Abaixo deste score a aprovação é retida para revisão humana. */
const MIN_AUTO_APPROVE_SCORE = 60;

type ValidateDocumentBody = {
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

/**
 * Resolve a chave do objeto a partir de `fileKey` OU de uma `publicUrl`.
 *
 * A URL só é aceita se pertencer ao domínio público configurado do R2, o que
 * elimina SSRF: nunca buscamos um host arbitrário fornecido pelo cliente.
 */
function resolveFileKey(body: ValidateDocumentBody): string | null {
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
      return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { sucesso: false, erro: 'Validação indisponível. Configure GEMINI_API_KEY.' },
        { status: 503 }
      );
    }

    let body: ValidateDocumentBody = {};
    try {
      body = (await request.json()) as ValidateDocumentBody;
    } catch {
      return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
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

    // KYC é exigência exclusiva de profissionais (tatuador/estúdio).
    if (perfil.role === 'cliente') {
      return NextResponse.json(
        { sucesso: false, erro: 'Verificação KYC não aplicável a clientes.' },
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
      console.error('[kyc/validate-document] falha ao ler objeto do R2', {
        userId,
        fileKey,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { sucesso: false, erro: 'Falha ao recuperar o documento.' },
        { status: 502 }
      );
    }

    if (object.contentLength > MAX_OBJECT_BYTES) {
      return NextResponse.json(
        { sucesso: false, erro: 'Documento excede o tamanho máximo permitido.' },
        { status: 413 }
      );
    }

    const mimeType =
      object.contentType ||
      (typeof body.contentType === 'string' ? body.contentType.trim() : '') ||
      'application/octet-stream';

    if (!ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) {
      return NextResponse.json(
        { sucesso: false, erro: 'Formato de documento não suportado.' },
        { status: 415 }
      );
    }

    const base64 = Buffer.from(object.body).toString('base64');

    let analysis;
    try {
      analysis = await analyzeKycDocument({ base64, mimeType });
    } catch (error) {
      console.error('[kyc/validate-document] falha na análise de IA', {
        userId,
        fileKey,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { sucesso: false, erro: 'Não foi possível analisar o documento.' },
        { status: 502 }
      );
    }

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
      await prisma.perfil.update({ where: { id: perfil.id }, data });
    } catch (error) {
      console.error('[kyc/validate-document] falha ao persistir status KYC', {
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
    console.error('[KYC_AI_ERROR]', error);
    return NextResponse.json(
      {
        error: 'Erro interno na análise',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
