import { z } from 'zod';
import { LOCALES } from '@/lib/i18n/types';
import { isValidCpf, onlyCpfDigits } from '@/lib/utils/cpf';
import { isValidCnpj, onlyCnpjDigits } from '@/lib/utils/cnpj';

/**
 * Sanitização impiedosa de payloads (Input Validation / DevSecOps).
 *
 * Princípios:
 * - Nenhuma rota de submissão toca no banco ou em provedores externos antes de
 *   o corpo passar por um schema Zod. Payload malformado = HTTP 400 imediato.
 * - Os schemas aqui são a fonte única de verdade para formatos sensíveis
 *   (CPF/CNPJ, nome civil, referências de storage R2, identificadores UUID).
 * - Toda string é aparada (`.trim()`) e delimitada por tamanho máximo, o que
 *   elimina payloads gigantes, injeção de controle e poluição de objetos
 *   (o Zod descarta chaves desconhecidas por padrão).
 */

/** Chaves R2 nunca ultrapassam este tamanho na convenção do projeto. */
export const STORAGE_REF_MAX_LENGTH = 1024;

/** Dígitos + separadores usuais de CPF/CNPJ (ponto, hífen, barra, espaço). */
const DOCUMENT_ALLOWED_CHARS = /^[\d.\-/\s]+$/;

/**
 * Nome civil: começa com letra e aceita somente letras (com acentos), marcas
 * diacríticas, espaços e os separadores `.'-`. Bloqueia dígitos e símbolos
 * usados em injeção de payload.
 */
const NAME_ALLOWED_CHARS = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u;

function hasPathTraversal(value: string): boolean {
  return value.includes('..');
}

/**
 * CPF (11 dígitos) ou CNPJ (14 dígitos), com ou sem máscara. Além do formato,
 * exige os dígitos verificadores válidos — barra documentos fabricados antes de
 * qualquer consulta externa.
 */
export const cpfOrCnpjSchema = z
  .string()
  .trim()
  .min(11, 'CPF/CNPJ inválido.')
  .max(20, 'CPF/CNPJ inválido.')
  .regex(DOCUMENT_ALLOWED_CHARS, 'CPF/CNPJ contém caracteres inválidos.')
  .refine(
    (value) => isValidCpf(onlyCpfDigits(value)) || isValidCnpj(onlyCnpjDigits(value)),
    'CPF/CNPJ inválido.'
  );

/** CNPJ (14 dígitos), com ou sem máscara, com dígitos verificadores válidos. */
export const cnpjSchema = z
  .string()
  .trim()
  .min(14, 'CNPJ inválido. Informe 14 dígitos válidos.')
  .max(20, 'CNPJ inválido. Informe 14 dígitos válidos.')
  .regex(DOCUMENT_ALLOWED_CHARS, 'CNPJ contém caracteres inválidos.')
  .refine(
    (value) => isValidCnpj(onlyCnpjDigits(value)),
    'CNPJ inválido. Informe 14 dígitos válidos.'
  );

/** Nome completo civil (nome + sobrenome) do titular do documento. */
export const fullNameSchema = z
  .string()
  .trim()
  .min(5, 'Informe o nome completo do titular.')
  .max(160, 'Nome do titular excede o limite permitido.')
  .regex(NAME_ALLOWED_CHARS, 'Nome do titular contém caracteres inválidos.');

/** `publicUrl` do R2: URL absoluta e sem path traversal. */
export const storageUrlSchema = z
  .string()
  .trim()
  .max(STORAGE_REF_MAX_LENGTH, 'URL de arquivo excede o tamanho máximo.')
  .url('URL de arquivo inválida.')
  .refine((value) => !hasPathTraversal(value), 'URL de arquivo inválida.');

/** Chave crua do bucket R2: relativa, sem esquema e sem path traversal. */
export const storageKeySchema = z
  .string()
  .trim()
  .min(1, 'Referência de arquivo é obrigatória.')
  .max(STORAGE_REF_MAX_LENGTH, 'Referência de arquivo excede o tamanho máximo.')
  .refine((value) => !value.includes('://'), 'Referência de arquivo inválida.')
  .refine((value) => !hasPathTraversal(value), 'Referência de arquivo inválida.');

/**
 * Referência de documento: chave crua do bucket OU `publicUrl` do R2. O host
 * público é revalidado na rota contra `R2_PUBLIC_URL`, o que elimina SSRF.
 */
export const storageRefSchema = z.union([storageUrlSchema, storageKeySchema]);

/** Identificador UUID (chaves de `Perfil`, `EstudioConvite`, etc.). */
export const uuidSchema = z.string().trim().uuid('Identificador inválido.');

/** Papel de conta aceito no produto. */
export const appRoleSchema = z.enum(['cliente', 'tatuador', 'estudio']);

/** Locale suportado pela plataforma. */
export const localeSchema = z.enum(LOCALES);

/** Token do Cloudflare Turnstile (opcional nos fluxos; formato estrito). */
export const turnstileTokenSchema = z.string().trim().min(1).max(2048);

/** Mensagem legível do primeiro problema encontrado pelo schema. */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Payload inválido.';
}

/** Corpo padrão devolvido quando o payload não passa na validação. */
export function invalidPayloadBody(error: z.ZodError): {
  sucesso: false;
  erro: string;
  codigo: 'INVALID_PAYLOAD';
} {
  return { sucesso: false, erro: firstIssueMessage(error), codigo: 'INVALID_PAYLOAD' };
}
