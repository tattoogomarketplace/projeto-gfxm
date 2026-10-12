export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { fetchR2Object } from '@/lib/storage/r2';
import { inspectDocumentBuffer } from '@/lib/ai/document-forensics';

/**
 * RECUPERAÇÃO DE ACESSO — ANÁLISE DE DOCUMENTO DE IDENTIDADE
 *
 * Etapa 2 do fluxo "Esqueci a Senha". Reutiliza o mesmo motor seguro de upload
 * do módulo de verificação profissional (presign no R2), mas a análise de
 * segurança aqui é determinística e LOCAL (`inspectDocumentBuffer`): valida
 * assinatura, integridade e formato do documento sem depender de provedores de
 * IA externos nem exigir papel profissional — permitindo que CLIENTES também
 * comprovem identidade na recuperação.
 */

const MAX_OBJECT_BYTES = 10 * 1024 * 1024;
const MAX_FILE_KEY_LENGTH = 512;
const DELIMITER = '/';

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
      return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
    }

    let body: RecoveryDocumentBody = {};
    try {
      body = (await request.json()) as RecoveryDocumentBody;
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
        { sucesso: false, status: 'rejeitado', erro: inspection.reason ?? 'Documento inválido.' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      status: 'aprovado',
      mimeType: inspection.mimeType,
      size: inspection.size,
    });
  } catch (error) {
    console.error('[auth/recovery/validate-document] falha', error);
    return NextResponse.json(
      { sucesso: false, erro: 'Não foi possível analisar o documento.' },
      { status: 500 }
    );
  }
}
