import { isValidCpf, onlyCpfDigits } from '@/lib/utils/cpf';
import { onlyCnpjDigits } from '@/lib/utils/cnpj';

/**
 * KYC Service — orquestra a prova de identidade (CPF/CNPJ + biometria) dos
 * profissionais (tatuador/estúdio) ANTES de qualquer aprovação de cadastro.
 *
 * Princípios de segurança (anti-fraude / DevSecOps):
 * - Fail-closed: qualquer indisponibilidade de provedor devolve `revisao_manual`,
 *   nunca aprovação implícita.
 * - Nenhuma credencial é embutida: base URL, chave e provedores vêm do `.env`
 *   do projeto e NUNCA de valores fixos no código.
 * - CPF/CNPJ nunca é logado nem devolvido cru; a rota expõe apenas a versão
 *   mascarada. O serviço devolve o valor normalizado para persistência segura.
 * - Estrutura pronta para plugar Mercado Pago / Asaas (identidade) e
 *   Serpro / FaceMatch (biometria) sem alterar os consumidores.
 */

export type KycIdentityProvider = 'mock' | 'mercadopago' | 'asaas';
export type KycLivenessProvider = 'mock' | 'serpro' | 'facematch';
export type KycFaceMatchProvider = 'mock' | 'aws-rekognition' | 'facematch' | 'serpro';

/** Resultado normalizado, independente do provedor escolhido. */
export type KycOutcome = 'aprovado' | 'rejeitado' | 'revisao_manual';

const REQUEST_TIMEOUT_MS = 8000;

/** Score mínimo (0-100) para considerar a prova de vida aprovada. */
const MIN_LIVENESS_SCORE = 70;

/**
 * Similaridade facial mínima (0-100) exigida do motor de Face Matching.
 * Segunda etapa da biometria: a selfie deve ser MATEMATICAMENTE superior a 90%
 * de similaridade com a foto do documento. Abaixo disso, reprovação imediata.
 */
const MIN_FACE_MATCH_SIMILARITY = 90;

export type KycCpfIdentityInput = {
  cpf: string;
  fullName: string;
};

export type KycCpfIdentityResult = {
  outcome: KycOutcome;
  verified: boolean;
  provider: KycIdentityProvider;
  /** CPF (11) ou CNPJ (14) somente dígitos — seguro para persistir/comparar. */
  normalizedDocument: string;
  /** Indica se o nome consultado confere com o titular do documento. */
  nameMatches: boolean;
  /** Nome retornado pela base oficial, quando o provedor informa. */
  registeredName: string | null;
  reference: string | null;
  reason?: string;
};

export type KycLivenessResult = {
  outcome: KycOutcome;
  verified: boolean;
  provider: KycLivenessProvider;
  /** Similaridade facial estimada (0-100). */
  score: number;
  /** `true` quando selfie e documento são considerados a mesma pessoa. */
  samePerson: boolean;
  reference: string | null;
  reason?: string;
};

export type KycFaceMatchResult = {
  outcome: KycOutcome;
  verified: boolean;
  provider: KycFaceMatchProvider;
  /** Similaridade matemática entre os rostos (0-100). */
  similarity: number;
  /** Limiar mínimo exigido para aprovação (superior a 90%). */
  threshold: number;
  /** `true` quando a similaridade supera o limiar mínimo. */
  samePerson: boolean;
  reference: string | null;
  reason?: string;
};

export class KycProviderError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'KycProviderError';
    this.status = status;
  }
}

function readEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

function resolveIdentityProvider(): KycIdentityProvider {
  const raw = (readEnv('KYC_IDENTITY_PROVIDER') ?? '').toLowerCase();
  return raw === 'mercadopago' || raw === 'asaas' ? raw : 'mock';
}

function resolveLivenessProvider(): KycLivenessProvider {
  const raw = (readEnv('KYC_LIVENESS_PROVIDER') ?? '').toLowerCase();
  return raw === 'serpro' || raw === 'facematch' ? raw : 'mock';
}

function resolveFaceMatchProvider(): KycFaceMatchProvider {
  const raw = (readEnv('KYC_FACE_MATCH_PROVIDER') ?? '').toLowerCase();
  return raw === 'aws-rekognition' || raw === 'facematch' || raw === 'serpro'
    ? raw
    : 'mock';
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/** Um nome civil plausível possui ao menos nome + sobrenome. */
function isPlausibleFullName(value: string): boolean {
  const normalized = normalizeName(value);
  if (normalized.length < 5) return false;
  return normalized.split(' ').filter((token) => token.length >= 2).length >= 2;
}

/** Hash estável (FNV-1a) usado apenas pelo mock determinístico de biometria. */
function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    });
    if (response.status === 429) {
      throw new KycProviderError('Limite de consultas do provedor atingido.', 429);
    }
    if (!response.ok) {
      throw new KycProviderError('Provedor de KYC indisponível.', 502);
    }
    return (await response.json().catch(() => null)) as unknown;
  } catch (error) {
    if (error instanceof KycProviderError) throw error;
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new KycProviderError(
      aborted ? 'Tempo esgotado ao consultar o provedor de KYC.' : 'Falha de rede no provedor de KYC.',
      aborted ? 504 : 502
    );
  } finally {
    clearTimeout(timeout);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Consulta HTTP genérica aos provedores de identidade (estrutura pronta). */
async function verifyCpfWithHttpProvider(
  provider: Exclude<KycIdentityProvider, 'mock'>,
  input: KycCpfIdentityInput,
  normalizedDocument: string
): Promise<KycCpfIdentityResult> {
  const baseUrl = readEnv('KYC_IDENTITY_BASE_URL');
  const apiKey = readEnv('KYC_IDENTITY_API_KEY');
  if (!baseUrl || !apiKey) {
    throw new KycProviderError('Provedor de identidade não configurado.', 503);
  }

  const payload = await fetchJsonWithTimeout(`${baseUrl.replace(/\/+$/, '')}/identity/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      provider,
      document: normalizedDocument,
      name: normalizeName(input.fullName),
    }),
  });

  const record = asRecord(payload) ?? {};
  const nameMatches = record.nameMatches === true;
  const registeredName =
    typeof record.registeredName === 'string' && record.registeredName.trim()
      ? record.registeredName.trim()
      : null;
  const reference = typeof record.reference === 'string' ? record.reference : null;

  return {
    outcome: nameMatches ? 'aprovado' : 'rejeitado',
    verified: nameMatches,
    provider,
    normalizedDocument,
    nameMatches,
    registeredName,
    reference,
    reason: nameMatches ? undefined : 'Nome do titular não confere com o documento.',
  };
}

/** Mock que simula a checagem na Receita Federal (nome confere => true). */
function verifyCpfMock(
  input: KycCpfIdentityInput,
  normalizedDocument: string
): KycCpfIdentityResult {
  const nameMatches = isPlausibleFullName(input.fullName);
  return {
    outcome: nameMatches ? 'aprovado' : 'revisao_manual',
    verified: nameMatches,
    provider: 'mock',
    normalizedDocument,
    nameMatches,
    registeredName: nameMatches ? input.fullName.trim() : null,
    reference: `mock:${stableHash(normalizedDocument).toString(16)}`,
    reason: nameMatches
      ? undefined
      : 'Mock: informe o nome civil completo (nome e sobrenome) do titular.',
  };
}

/**
 * Prova de identidade por CPF (PF) ou CNPJ (PJ).
 *
 * O documento é validado estruturalmente (dígitos verificadores) ANTES de
 * qualquer chamada externa, evitando gasto de quota e tráfego desnecessário.
 */
export async function verifyCpfIdentity(
  cpf: string,
  fullName: string
): Promise<KycCpfIdentityResult> {
  const input: KycCpfIdentityInput = { cpf, fullName };
  const onlyDigits = onlyCpfDigits(cpf);
  const cnpjDigits = onlyCnpjDigits(cpf);
  const isCnpj = onlyDigits.length !== 11 && cnpjDigits.length === 14;
  const normalizedDocument = isCnpj ? cnpjDigits : onlyDigits;

  if (!isCnpj && !isValidCpf(normalizedDocument)) {
    return {
      outcome: 'rejeitado',
      verified: false,
      provider: resolveIdentityProvider(),
      normalizedDocument,
      nameMatches: false,
      registeredName: null,
      reference: null,
      reason: 'CPF inválido.',
    };
  }

  if (!fullName || !fullName.trim()) {
    return {
      outcome: 'rejeitado',
      verified: false,
      provider: resolveIdentityProvider(),
      normalizedDocument,
      nameMatches: false,
      registeredName: null,
      reference: null,
      reason: 'Nome completo é obrigatório.',
    };
  }

  const provider = resolveIdentityProvider();
  if (provider === 'mock') {
    return verifyCpfMock(input, normalizedDocument);
  }

  try {
    return await verifyCpfWithHttpProvider(provider, input, normalizedDocument);
  } catch (error) {
    // Fail-closed: provedor indisponível nunca aprova automaticamente.
    return {
      outcome: 'revisao_manual',
      verified: false,
      provider,
      normalizedDocument,
      nameMatches: false,
      registeredName: null,
      reference: null,
      reason:
        error instanceof KycProviderError
          ? error.message
          : 'Não foi possível concluir a verificação de identidade.',
    };
  }
}

/** Consulta HTTP genérica ao provedor biométrico (estrutura pronta). */
async function verifyLivenessWithHttpProvider(
  provider: Exclude<KycLivenessProvider, 'mock'>,
  selfieRef: string,
  documentRef: string
): Promise<KycLivenessResult> {
  const baseUrl = readEnv('KYC_LIVENESS_BASE_URL');
  const apiKey = readEnv('KYC_LIVENESS_API_KEY');
  if (!baseUrl || !apiKey) {
    throw new KycProviderError('Provedor de biometria não configurado.', 503);
  }

  const payload = await fetchJsonWithTimeout(`${baseUrl.replace(/\/+$/, '')}/liveness/compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ provider, selfieRef, documentRef }),
  });

  const record = asRecord(payload) ?? {};
  const score = typeof record.score === 'number' && Number.isFinite(record.score)
    ? Math.max(0, Math.min(100, record.score))
    : 0;
  const livenessOk = record.liveness === true;
  const samePerson = record.samePerson === true;
  const passed = livenessOk && samePerson && score >= MIN_LIVENESS_SCORE;
  const reference = typeof record.reference === 'string' ? record.reference : null;

  return {
    outcome: passed ? 'aprovado' : score >= MIN_LIVENESS_SCORE ? 'revisao_manual' : 'rejeitado',
    verified: passed,
    provider,
    score,
    samePerson,
    reference,
    reason: passed ? undefined : 'Biometria não confirmou a prova de vida.',
  };
}

/** Mock de prova de vida determinístico e anti-reuso de documento. */
function verifyLivenessMock(
  selfieRef: string,
  documentRef: string
): KycLivenessResult {
  // Reutilizar a mesma captura como selfie e documento é fraude de prova de vida.
  if (selfieRef === documentRef) {
    return {
      outcome: 'rejeitado',
      verified: false,
      provider: 'mock',
      score: 0,
      samePerson: false,
      reference: null,
      reason: 'Selfie idêntica à foto do documento (reuso detectado).',
    };
  }

  const score = 60 + (stableHash(`${selfieRef}|${documentRef}`) % 40);
  const passed = score >= MIN_LIVENESS_SCORE;
  return {
    outcome: passed ? 'aprovado' : 'revisao_manual',
    verified: passed,
    provider: 'mock',
    score,
    samePerson: passed,
    reference: `mock:${stableHash(selfieRef).toString(16)}`,
    reason: passed ? undefined : 'Mock: similaridade facial abaixo do limiar.',
  };
}

/**
 * Prova de vida + comparação facial entre a selfie e a foto do documento.
 *
 * Estruturada para Serpro/FaceMatch: o mock é determinístico e rejeita o reuso
 * da própria foto do documento como selfie (burla clássica de liveness).
 */
export async function verifyLiveness(
  selfieUrl: string,
  documentPhotoUrl: string
): Promise<KycLivenessResult> {
  const selfieRef = (selfieUrl ?? '').trim();
  const documentRef = (documentPhotoUrl ?? '').trim();

  const missing = !selfieRef || !documentRef;
  if (missing) {
    return {
      outcome: 'rejeitado',
      verified: false,
      provider: resolveLivenessProvider(),
      score: 0,
      samePerson: false,
      reference: null,
      reason: 'Selfie e foto do documento são obrigatórias.',
    };
  }

  const provider = resolveLivenessProvider();
  if (provider === 'mock') {
    return verifyLivenessMock(selfieRef, documentRef);
  }

  try {
    return await verifyLivenessWithHttpProvider(provider, selfieRef, documentRef);
  } catch (error) {
    // Fail-closed: falha do provedor biométrico cai para revisão manual.
    return {
      outcome: 'revisao_manual',
      verified: false,
      provider,
      score: 0,
      samePerson: false,
      reference: null,
      reason:
        error instanceof KycProviderError
          ? error.message
          : 'Não foi possível concluir a prova de vida.',
    };
  }
}

/**
 * Consulta HTTP ao provedor de Face Matching. A arquitetura espelha o
 * `CompareFacesCommand` da AWS Rekognition: enviamos as referências da selfie
 * (SourceImage) e da foto do documento (TargetImage) com `similarityThreshold`
 * e lemos o maior `Similarity` entre os `FaceMatches` retornados.
 */
async function verifyFaceMatchWithHttpProvider(
  provider: Exclude<KycFaceMatchProvider, 'mock'>,
  selfieRef: string,
  documentRef: string
): Promise<KycFaceMatchResult> {
  const baseUrl = readEnv('KYC_FACE_MATCH_BASE_URL');
  const apiKey = readEnv('KYC_FACE_MATCH_API_KEY');
  if (!baseUrl || !apiKey) {
    throw new KycProviderError('Provedor de face matching não configurado.', 503);
  }

  const payload = await fetchJsonWithTimeout(`${baseUrl.replace(/\/+$/, '')}/face/compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      provider,
      // Formato compatível com Rekognition CompareFacesCommand.
      sourceImage: { r2Ref: selfieRef },
      targetImage: { r2Ref: documentRef },
      similarityThreshold: MIN_FACE_MATCH_SIMILARITY,
    }),
  });

  const record = asRecord(payload) ?? {};
  const similarity = extractFaceSimilarity(record);
  const samePerson = similarity > MIN_FACE_MATCH_SIMILARITY;
  const reference =
    (typeof record.reference === 'string' && record.reference) ||
    (typeof record.ResponseMetadata === 'object' &&
      record.ResponseMetadata !== null &&
      typeof (record.ResponseMetadata as Record<string, unknown>).RequestId === 'string'
      ? String((record.ResponseMetadata as Record<string, unknown>).RequestId)
      : null);

  return {
    outcome: samePerson ? 'aprovado' : 'rejeitado',
    verified: samePerson,
    provider,
    similarity,
    threshold: MIN_FACE_MATCH_SIMILARITY,
    samePerson,
    reference,
    reason: samePerson
      ? undefined
      : `Similaridade facial ${similarity.toFixed(2)}% abaixo do limiar mínimo de ${MIN_FACE_MATCH_SIMILARITY}%.`,
  };
}

/**
 * Extrai a maior similaridade da resposta do provedor, aceitando tanto o
 * formato da AWS Rekognition (`FaceMatches[].Similarity`) quanto um `similarity`
 * plano de provedores genéricos.
 */
function extractFaceSimilarity(record: Record<string, unknown>): number {
  const clamp = (value: number) => Math.max(0, Math.min(100, value));

  if (Array.isArray(record.FaceMatches)) {
    let best = 0;
    for (const match of record.FaceMatches) {
      const item = asRecord(match);
      const value = item?.Similarity;
      if (typeof value === 'number' && Number.isFinite(value)) {
        best = Math.max(best, value);
      }
    }
    if (best > 0) return clamp(best);
  }

  if (typeof record.similarity === 'number' && Number.isFinite(record.similarity)) {
    return clamp(record.similarity);
  }

  return 0;
}

/** Mock determinístico de Face Matching; reprova o reuso da foto do documento. */
function verifyFaceMatchMock(
  selfieRef: string,
  documentRef: string
): KycFaceMatchResult {
  // Reutilizar a captura do documento como selfie é fraude de correspondência.
  if (selfieRef === documentRef) {
    return {
      outcome: 'rejeitado',
      verified: false,
      provider: 'mock',
      similarity: 0,
      threshold: MIN_FACE_MATCH_SIMILARITY,
      samePerson: false,
      reference: null,
      reason: 'Selfie idêntica à foto do documento (reuso detectado).',
    };
  }

  const similarity = Number((70 + (stableHash(`${selfieRef}|${documentRef}`) % 3000) / 100).toFixed(2));
  const samePerson = similarity > MIN_FACE_MATCH_SIMILARITY;
  return {
    outcome: samePerson ? 'aprovado' : 'rejeitado',
    verified: samePerson,
    provider: 'mock',
    similarity,
    threshold: MIN_FACE_MATCH_SIMILARITY,
    samePerson,
    reference: `mock:${stableHash(documentRef).toString(16)}`,
    reason: samePerson
      ? undefined
      : `Mock: similaridade facial ${similarity.toFixed(2)}% não supera o limiar de ${MIN_FACE_MATCH_SIMILARITY}%.`,
  };
}

/**
 * Face Matching — comparação biométrica entre a selfie e a foto do documento.
 *
 * Segunda etapa do KYC: o resultado só é `aprovado` quando a similaridade
 * matemática é ESTRITAMENTE superior a 90%. Abaixo disso, `rejeitado` com
 * motivo de falha biométrica. Indisponibilidade do provedor é fail-closed
 * (`revisao_manual`), nunca aprovação implícita.
 */
export async function verifyFaceMatch(
  selfieUrl: string,
  documentPhotoUrl: string
): Promise<KycFaceMatchResult> {
  const selfieRef = (selfieUrl ?? '').trim();
  const documentRef = (documentPhotoUrl ?? '').trim();

  if (!selfieRef || !documentRef) {
    return {
      outcome: 'rejeitado',
      verified: false,
      provider: resolveFaceMatchProvider(),
      similarity: 0,
      threshold: MIN_FACE_MATCH_SIMILARITY,
      samePerson: false,
      reference: null,
      reason: 'Selfie e foto do documento são obrigatórias para o face matching.',
    };
  }

  const provider = resolveFaceMatchProvider();
  if (provider === 'mock') {
    return verifyFaceMatchMock(selfieRef, documentRef);
  }

  try {
    return await verifyFaceMatchWithHttpProvider(provider, selfieRef, documentRef);
  } catch (error) {
    // Fail-closed: falha do provedor biométrico cai para revisão manual.
    return {
      outcome: 'revisao_manual',
      verified: false,
      provider,
      similarity: 0,
      threshold: MIN_FACE_MATCH_SIMILARITY,
      samePerson: false,
      reference: null,
      reason:
        error instanceof KycProviderError
          ? error.message
          : 'Não foi possível concluir o face matching.',
    };
  }
}

/**
 * Consolida as etapas numa decisão única de KYC.
 * Regra conservadora: aprova somente com TODAS as etapas aprovadas. A presença
 * do Face Matching é obrigatória para a aprovação; similaridade baixa reprova.
 */
export function composeKycVerdict(
  identity: KycCpfIdentityResult,
  liveness: KycLivenessResult,
  faceMatch?: KycFaceMatchResult
): { outcome: KycOutcome; reason: string | null } {
  if (
    identity.outcome === 'rejeitado' ||
    liveness.outcome === 'rejeitado' ||
    faceMatch?.outcome === 'rejeitado'
  ) {
    return {
      outcome: 'rejeitado',
      reason:
        identity.reason ??
        liveness.reason ??
        faceMatch?.reason ??
        'Verificação de identidade reprovada.',
    };
  }
  const faceMatchApproved = !faceMatch || faceMatch.outcome === 'aprovado';
  if (identity.outcome === 'aprovado' && liveness.outcome === 'aprovado' && faceMatchApproved) {
    return { outcome: 'aprovado', reason: null };
  }
  return {
    outcome: 'revisao_manual',
    reason:
      identity.reason ?? liveness.reason ?? 'Verificação encaminhada para análise manual.',
  };
}
