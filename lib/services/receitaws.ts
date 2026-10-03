import { isValidCnpj, onlyCnpjDigits } from '@/lib/utils/cnpj';

const RECEITA_WS_BASE_URL = 'https://www.receitaws.com.br/v1/cnpj';
const REQUEST_TIMEOUT_MS = 8000;

export type ReceitaWsSocio = {
  nome: string;
  qualificacao: string | null;
};

export type CnpjValidation = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacao: string;
  ativa: boolean;
  tipo: string | null;
  porte: string | null;
  naturezaJuridica: string | null;
  dataAbertura: string | null;
  endereco: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  email: string | null;
  telefone: string | null;
  atividadePrincipal: string | null;
  socios: ReceitaWsSocio[];
};

export class ReceitaWsError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ReceitaWsError';
    this.status = status;
  }
}

function asString(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseSocios(value: unknown): ReceitaWsSocio[] {
  if (!Array.isArray(value)) return [];
  const socios: ReceitaWsSocio[] = [];
  for (const item of value) {
    const record = asRecord(item);
    const nome = record ? asString(record.nome) : null;
    if (!nome) continue;
    socios.push({ nome, qualificacao: record ? asString(record.qual) : null });
  }
  return socios;
}

function buildEndereco(record: Record<string, unknown>): string | null {
  const logradouro = asString(record.logradouro);
  const numero = asString(record.numero);
  const bairro = asString(record.bairro);
  const municipio = asString(record.municipio);
  const uf = asString(record.uf);

  const linha1 = [logradouro, numero].filter(Boolean).join(', ');
  const linha2 = [bairro, [municipio, uf].filter(Boolean).join('/')].filter(Boolean).join(' - ');
  const endereco = [linha1, linha2].filter(Boolean).join(', ');
  return endereco || null;
}

function isRateLimitMessage(message: string | null): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes('too many') ||
    normalized.includes('rate limit') ||
    normalized.includes('limite de consultas') ||
    normalized.includes('excedeu')
  );
}

function mapResponse(cnpj: string, raw: Record<string, unknown>): CnpjValidation {
  const situacao = asString(raw.situacao) ?? 'DESCONHECIDA';
  const atividadePrincipalRaw = Array.isArray(raw.atividade_principal)
    ? raw.atividade_principal[0]
    : undefined;
  const atividadePrincipalRecord = asRecord(atividadePrincipalRaw);

  return {
    cnpj,
    razaoSocial: asString(raw.nome) ?? '',
    nomeFantasia: asString(raw.fantasia),
    situacao,
    ativa: situacao.toUpperCase() === 'ATIVA',
    tipo: asString(raw.tipo),
    porte: asString(raw.porte),
    naturezaJuridica: asString(raw.natureza_juridica),
    dataAbertura: asString(raw.abertura),
    endereco: buildEndereco(raw),
    municipio: asString(raw.municipio),
    uf: asString(raw.uf),
    cep: asString(raw.cep),
    email: asString(raw.email),
    telefone: asString(raw.telefone),
    atividadePrincipal: atividadePrincipalRecord
      ? asString(atividadePrincipalRecord.text)
      : null,
    socios: parseSocios(raw.qsa),
  };
}

function buildMockValidation(cnpj: string): CnpjValidation {
  return {
    cnpj,
    razaoSocial: 'Estudio Mock LTDA',
    nomeFantasia: 'Estudio Mock',
    situacao: 'ATIVA',
    ativa: true,
    tipo: 'MATRIZ',
    porte: 'ME',
    naturezaJuridica: '206-2 - Sociedade Empresária Limitada',
    dataAbertura: '01/01/2020',
    endereco: 'Rua Mock, 100, Centro, São Paulo/SP',
    municipio: 'São Paulo',
    uf: 'SP',
    cep: '01000-000',
    email: null,
    telefone: null,
    atividadePrincipal: 'Atividades de atenção à saúde humana',
    socios: [],
  };
}

/**
 * Consulta a ReceitaWS e normaliza o retorno em um contrato estável.
 *
 * Regras:
 * - Sanitiza/valida o CNPJ antes de sair para a rede (nunca confia no input).
 * - Timeout explícito via AbortController (a API pública é lenta/instável).
 * - Traduz erro/rate-limit da ReceitaWS em `ReceitaWsError` com status HTTP.
 *
 * Não decide aprovação de cadastro — devolve `ativa` para que a rota aplique
 * a regra de negócio.
 */
export async function validateCnpj(cnpj: string): Promise<CnpjValidation> {
  const cleanCnpj = onlyCnpjDigits(cnpj);
  if (cleanCnpj.length !== 14) {
    throw new ReceitaWsError('CNPJ deve conter 14 dígitos.', 400);
  }
  if (!isValidCnpj(cleanCnpj)) {
    throw new ReceitaWsError('CNPJ inválido.', 400);
  }

  if (process.env.USE_MOCK_CNPJ === 'true') {
    return buildMockValidation(cleanCnpj);
  }

  const token = process.env.RECEITA_WS_TOKEN;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${RECEITA_WS_BASE_URL}/${cleanCnpj}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new ReceitaWsError(
      aborted
        ? 'Tempo esgotado ao consultar a ReceitaWS.'
        : 'Falha de rede ao consultar a ReceitaWS.',
      aborted ? 504 : 502
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 429) {
    throw new ReceitaWsError(
      'Limite de consultas da ReceitaWS atingido. Tente novamente em instantes.',
      429
    );
  }

  if (!response.ok) {
    throw new ReceitaWsError('Serviço da ReceitaWS indisponível.', 502);
  }

  const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw) {
    throw new ReceitaWsError('Resposta inválida da ReceitaWS.', 502);
  }

  const status = asString(raw.status)?.toUpperCase();
  const message = asString(raw.message);

  if (status === 'ERROR') {
    if (isRateLimitMessage(message)) {
      throw new ReceitaWsError(
        'Limite de consultas da ReceitaWS atingido. Tente novamente em instantes.',
        429
      );
    }
    throw new ReceitaWsError(message ?? 'CNPJ não encontrado ou indisponível.', 400);
  }

  if (!asString(raw.situacao)) {
    throw new ReceitaWsError('Não foi possível obter os dados do CNPJ.', 502);
  }

  return mapResponse(cleanCnpj, raw);
}
