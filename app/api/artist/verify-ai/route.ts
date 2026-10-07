export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  analyzeKycDocument,
  composeDualCredentialVerdict,
  type KycDocumentAnalysis,
} from '@/lib/ai/kyc-validator';
import {
  inspectDocumentBuffer,
  namesAlign,
  type CredentialKind,
  type ForensicResult,
} from '@/lib/ai/document-forensics';
import { prisma } from '@/lib/prisma';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { fetchR2Object } from '@/lib/storage/r2';

const MAX_OBJECT_BYTES = 10 * 1024 * 1024;
const MAX_FILE_KEY_LENGTH = 512;
const DELIMITER = '/';
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf']);

type KycStatusValue = 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado' | 'nao_aplicavel';

type SlotPayload = {
  file?: File | Blob | null;
  fileName?: string;
  fileKey?: string | null;
  publicUrl?: string | null;
  contentType?: string | null;
};

function sanitizeFileKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/^\/+/, '');
  if (!trimmed || trimmed.length > MAX_FILE_KEY_LENGTH) return null;
  if (trimmed.includes('..') || trimmed.includes('://')) return null;
  return trimmed;
}

function resolveFileKey(fileKey: unknown, publicUrl: unknown): string | null {
  const direct = sanitizeFileKey(fileKey);
  if (direct) return direct;
  if (typeof publicUrl !== 'string' || !publicUrl.trim()) return null;
  const base = (process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
  if (!base) return null;
  const url = publicUrl.trim();
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function readSlotFromRecord(
  record: Record<string, unknown>,
  keys: string[],
  fallbacks: { fileKey?: string; publicUrl?: string; fileName?: string; contentType?: string }
): SlotPayload {
  for (const key of keys) {
    const nested = asRecord(record[key]);
    if (Object.keys(nested).length > 0) {
      return {
        fileName: typeof nested.fileName === 'string' ? nested.fileName : undefined,
        fileKey: typeof nested.fileKey === 'string' ? nested.fileKey : undefined,
        publicUrl: typeof nested.publicUrl === 'string' ? nested.publicUrl : undefined,
        contentType: typeof nested.contentType === 'string' ? nested.contentType : undefined,
      };
    }
  }
  return {
    fileName: typeof record[fallbacks.fileName ?? ''] === 'string' ? String(record[fallbacks.fileName!]) : undefined,
    fileKey: typeof record[fallbacks.fileKey ?? ''] === 'string' ? String(record[fallbacks.fileKey!]) : undefined,
    publicUrl:
      typeof record[fallbacks.publicUrl ?? ''] === 'string' ? String(record[fallbacks.publicUrl!]) : undefined,
    contentType:
      typeof record[fallbacks.contentType ?? ''] === 'string' ? String(record[fallbacks.contentType!]) : undefined,
  };
}

function formValueToSlot(value: FormDataEntryValue | null, fileNameFallback?: string): SlotPayload {
  if (!value) return {};
  if (typeof value === 'string') {
    return { fileKey: value, fileName: fileNameFallback };
  }
  return { file: value, fileName: value.name || fileNameFallback };
}

async function parseIncomingSlots(request: Request): Promise<{
  pessoal: SlotPayload;
  habilidade: SlotPayload;
} | { error: string; status: number }> {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return { error: 'Payload multipart inválido.', status: 400 };
    }

    const pessoal = formValueToSlot(
      form.get('pessoal') ?? form.get('documentoPessoal') ?? form.get('personalId'),
      typeof form.get('pessoalFileName') === 'string' ? String(form.get('pessoalFileName')) : undefined
    );
    const habilidade = formValueToSlot(
      form.get('habilidade') ?? form.get('diploma') ?? form.get('professionalProof'),
      typeof form.get('habilidadeFileName') === 'string'
        ? String(form.get('habilidadeFileName'))
        : undefined
    );

    pessoal.fileKey =
      pessoal.fileKey ||
      (typeof form.get('pessoalFileKey') === 'string' ? String(form.get('pessoalFileKey')) : undefined);
    pessoal.publicUrl =
      typeof form.get('pessoalPublicUrl') === 'string' ? String(form.get('pessoalPublicUrl')) : undefined;
    pessoal.contentType =
      typeof form.get('pessoalContentType') === 'string' ? String(form.get('pessoalContentType')) : undefined;

    habilidade.fileKey =
      habilidade.fileKey ||
      (typeof form.get('habilidadeFileKey') === 'string'
        ? String(form.get('habilidadeFileKey'))
        : undefined);
    habilidade.publicUrl =
      typeof form.get('habilidadePublicUrl') === 'string'
        ? String(form.get('habilidadePublicUrl'))
        : undefined;
    habilidade.contentType =
      typeof form.get('habilidadeContentType') === 'string'
        ? String(form.get('habilidadeContentType'))
        : undefined;

    return { pessoal, habilidade };
  }

  let body: Record<string, unknown> = {};
  try {
    body = asRecord(await request.json());
  } catch {
    return { error: 'Payload inválido.', status: 400 };
  }

  return {
    pessoal: readSlotFromRecord(body, ['pessoal', 'documentoPessoal', 'personalId'], {
      fileKey: 'pessoalFileKey',
      publicUrl: 'pessoalPublicUrl',
      fileName: 'pessoalFileName',
      contentType: 'pessoalContentType',
    }),
    habilidade: readSlotFromRecord(body, ['habilidade', 'diploma', 'professionalProof'], {
      fileKey: 'habilidadeFileKey',
      publicUrl: 'habilidadePublicUrl',
      fileName: 'habilidadeFileName',
      contentType: 'habilidadeContentType',
    }),
  };
}

async function materializeBuffer(slot: SlotPayload, kind: CredentialKind): Promise<
  | { body: Uint8Array; declaredMime?: string; fileName?: string }
  | { error: string; status: number }
> {
  if (slot.file) {
    const blob = slot.file;
    const size = blob.size;
    if (size > MAX_OBJECT_BYTES) {
      return {
        error:
          kind === 'pessoal'
            ? 'O documento pessoal excede o tamanho máximo permitido.'
            : 'O comprovante profissional excede o tamanho máximo permitido.',
        status: 413,
      };
    }
    const body = new Uint8Array(await blob.arrayBuffer());
    return {
      body,
      declaredMime: blob.type || slot.contentType || undefined,
      fileName: slot.fileName || (blob instanceof File ? blob.name : undefined),
    };
  }

  const fileKey = resolveFileKey(slot.fileKey, slot.publicUrl);
  if (!fileKey) {
    return {
      error:
        kind === 'pessoal'
          ? 'Envie o documento pessoal (RG / CNH).'
          : 'Envie o comprovante profissional (diploma / habilidade).',
      status: 400,
    };
  }

  try {
    const object = await fetchR2Object(fileKey);
    if (object.contentLength > MAX_OBJECT_BYTES) {
      return {
        error:
          kind === 'pessoal'
            ? 'O documento pessoal excede o tamanho máximo permitido.'
            : 'O comprovante profissional excede o tamanho máximo permitido.',
        status: 413,
      };
    }
    return {
      body: object.body,
      declaredMime: object.contentType || slot.contentType || undefined,
      fileName: slot.fileName,
    };
  } catch (error) {
    if (isNotFoundError(error)) {
      return {
        error:
          kind === 'pessoal'
            ? 'Documento pessoal não encontrado no storage.'
            : 'Comprovante profissional não encontrado no storage.',
        status: 404,
      };
    }
    throw error;
  }
}

function forensicToAnalysis(forensic: ForensicResult, kind: CredentialKind): KycDocumentAnalysis {
  if (!forensic.ok) {
    return {
      isValid: false,
      extractedName: '',
      confidenceScore: 12,
      documentType: 'desconhecido',
      rejectionReason: forensic.reason || 'Arquivo rejeitado na verificação de integridade.',
    };
  }

  return {
    isValid: true,
    extractedName: '',
    confidenceScore: forensic.mimeType === 'application/pdf' ? 78 : 72,
    documentType: kind === 'pessoal' ? 'documento_oficial' : 'credencial_profissional',
    rejectionReason: '',
  };
}

async function analyzeSlot(
  forensic: ForensicResult,
  body: Uint8Array,
  kind: CredentialKind
): Promise<KycDocumentAnalysis> {
  const fallback = forensicToAnalysis(forensic, kind);
  if (!forensic.ok) return fallback;
  if (!process.env.GEMINI_API_KEY) return fallback;

  try {
    return await analyzeKycDocument({
      base64: Buffer.from(body).toString('base64'),
      mimeType: forensic.mimeType,
      kind,
    });
  } catch (error) {
    console.error('[artist/verify-ai] falha na análise Gemini', {
      kind,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

async function persistArtistPromotion(input: {
  perfilId: string;
  clerkId: string;
  extractedName: string;
  currentName: string | null;
  currentRole: string;
  publicMetadata: Record<string, unknown>;
  unsafeMetadata: Record<string, unknown>;
}): Promise<void> {
  const nome = !input.currentName && input.extractedName ? input.extractedName : undefined;
  const nextRole = input.currentRole === 'estudio' ? 'estudio' : 'tatuador';

  await prisma.perfil.update({
    where: { id: input.perfilId },
    data: {
      kyc_status: 'aprovado' as KycStatusValue,
      role: nextRole,
      ...(nome ? { nome } : {}),
    },
  });

  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(input.clerkId, {
      publicMetadata: {
        ...input.publicMetadata,
        role: nextRole,
        kyc_status: 'aprovado',
      },
      unsafeMetadata: {
        ...input.unsafeMetadata,
        role: nextRole,
        kyc_status: 'aprovado',
      },
    });
  } catch (error) {
    console.error('[artist/verify-ai] falha ao sincronizar Clerk', {
      clerkId: input.clerkId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, user } = await resolvePerfilSession(request);
    if (!userId) {
      return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
    }

    const parsed = await parseIncomingSlots(request);
    if ('error' in parsed) {
      return NextResponse.json({ sucesso: false, erro: parsed.error }, { status: parsed.status });
    }

    const perfil = await prisma.perfil.findUnique({
      where: { clerk_id: userId },
      select: { id: true, role: true, nome: true, kyc_status: true, deleted_at: true },
    });

    if (!perfil || perfil.deleted_at) {
      return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
    }

    if (perfil.role === 'tatuador' && perfil.kyc_status === 'aprovado') {
      return NextResponse.json({
        sucesso: true,
        isValid: true,
        status: 'aprovado',
        statusLabel: 'APROVADO',
        role: 'tatuador',
        roleLabel: 'TATUADOR',
        extractedName: perfil.nome || '',
        confidenceScore: 100,
      });
    }

    const pessoalMaterial = await materializeBuffer(parsed.pessoal, 'pessoal');
    if ('error' in pessoalMaterial) {
      return NextResponse.json(
        { sucesso: false, erro: pessoalMaterial.error },
        { status: pessoalMaterial.status }
      );
    }
    const habilidadeMaterial = await materializeBuffer(parsed.habilidade, 'habilidade');
    if ('error' in habilidadeMaterial) {
      return NextResponse.json(
        { sucesso: false, erro: habilidadeMaterial.error },
        { status: habilidadeMaterial.status }
      );
    }

    const pessoalForensic = inspectDocumentBuffer({
      body: pessoalMaterial.body,
      declaredMime: pessoalMaterial.declaredMime,
      fileName: pessoalMaterial.fileName,
      kind: 'pessoal',
    });
    const habilidadeForensic = inspectDocumentBuffer({
      body: habilidadeMaterial.body,
      declaredMime: habilidadeMaterial.declaredMime,
      fileName: habilidadeMaterial.fileName,
      kind: 'habilidade',
    });

    if (!ALLOWED_MIME.has(pessoalForensic.mimeType) || !pessoalForensic.ok) {
      await prisma.perfil.update({
        where: { id: perfil.id },
        data: { kyc_status: 'rejeitado' },
      });
      return NextResponse.json(
        {
          sucesso: false,
          isValid: false,
          status: 'rejeitado',
          statusLabel: 'REJEITADO',
          erro:
            pessoalForensic.reason ||
            'O documento pessoal foi rejeitado. Envie RG ou CNH nítido em JPG, PNG ou PDF.',
        },
        { status: 422 }
      );
    }

    if (!ALLOWED_MIME.has(habilidadeForensic.mimeType) || !habilidadeForensic.ok) {
      await prisma.perfil.update({
        where: { id: perfil.id },
        data: { kyc_status: 'rejeitado' },
      });
      return NextResponse.json(
        {
          sucesso: false,
          isValid: false,
          status: 'rejeitado',
          statusLabel: 'REJEITADO',
          erro:
            habilidadeForensic.reason ||
            'O comprovante profissional foi rejeitado. Envie diploma ou certificado nítido em JPG, PNG ou PDF.',
        },
        { status: 422 }
      );
    }

    await prisma.perfil.update({
      where: { id: perfil.id },
      data: { kyc_status: 'em_analise' },
    });

    const [personalAnalysis, professionalAnalysis] = await Promise.all([
      analyzeSlot(pessoalForensic, pessoalMaterial.body, 'pessoal'),
      analyzeSlot(habilidadeForensic, habilidadeMaterial.body, 'habilidade'),
    ]);

    const verdict = composeDualCredentialVerdict(
      personalAnalysis,
      professionalAnalysis,
      namesAlign(personalAnalysis.extractedName, professionalAnalysis.extractedName)
    );

    if (!verdict.approved) {
      await prisma.perfil.update({
        where: { id: perfil.id },
        data: { kyc_status: verdict.status },
      });
      return NextResponse.json(
        {
          sucesso: false,
          isValid: false,
          status: verdict.status,
          statusLabel: verdict.status === 'em_analise' ? 'EM_ANALISE' : 'REJEITADO',
          extractedName: verdict.extractedName,
          confidenceScore: verdict.confidenceScore,
          erro: verdict.reason || 'Os documentos não passaram na verificação automática.',
        },
        { status: 422 }
      );
    }

    await persistArtistPromotion({
      perfilId: perfil.id,
      clerkId: userId,
      extractedName: verdict.extractedName,
      currentName: perfil.nome,
      currentRole: perfil.role,
      publicMetadata: asRecord(user?.publicMetadata),
      unsafeMetadata: asRecord(user?.unsafeMetadata),
    });

    const promotedRole = perfil.role === 'estudio' ? 'estudio' : 'tatuador';

    return NextResponse.json({
      sucesso: true,
      isValid: true,
      status: 'aprovado',
      statusLabel: 'APROVADO',
      role: promotedRole,
      roleLabel: promotedRole === 'tatuador' ? 'TATUADOR' : 'ESTUDIO',
      extractedName: verdict.extractedName,
      confidenceScore: verdict.confidenceScore,
    });
  } catch (error) {
    console.error('[artist/verify-ai] falha inesperada', error);
    return NextResponse.json(
      {
        sucesso: false,
        erro: 'Erro interno na análise dos documentos.',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
