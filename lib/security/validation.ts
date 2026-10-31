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

/** Token do Cloudflare Turnstile (obrigatório nos fluxos críticos; formato estrito). */
export const turnstileTokenSchema = z.string().trim().min(1).max(2048);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, 'E-mail inválido.')
  .max(254, 'E-mail inválido.')
  .email('E-mail inválido.');

export const cpfSchema = z
  .string()
  .trim()
  .min(11, 'CPF inválido.')
  .max(14, 'CPF inválido.')
  .regex(DOCUMENT_ALLOWED_CHARS, 'CPF contém caracteres inválidos.')
  .refine((value) => isValidCpf(onlyCpfDigits(value)), 'CPF inválido.');

export const isoDateTimeSchema = z
  .string()
  .trim()
  .min(10, 'Data inválida.')
  .max(40, 'Data inválida.')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Data inválida.');

export const moneySchema = z.coerce
  .number()
  .finite('Valor inválido.')
  .gt(0, 'Valor inválido.')
  .lte(999999.99, 'Valor excede o limite permitido.');

export const nonNegativeMoneySchema = z.coerce
  .number()
  .finite('Valor inválido.')
  .gte(0, 'Valor inválido.')
  .lte(999999.99, 'Valor excede o limite permitido.');

export const latitudeSchema = z.coerce
  .number()
  .finite('Latitude inválida.')
  .gte(-90, 'Latitude inválida.')
  .lte(90, 'Latitude inválida.');

export const longitudeSchema = z.coerce
  .number()
  .finite('Longitude inválida.')
  .gte(-180, 'Longitude inválida.')
  .lte(180, 'Longitude inválida.');

export const radiusKmSchema = z.coerce
  .number()
  .finite('Raio inválido.')
  .gte(1, 'Raio inválido.')
  .lte(80, 'Raio inválido.');

export const chatMessageSchema = z
  .string()
  .trim()
  .min(1, 'A mensagem não pode estar vazia.')
  .max(1000, 'Mensagem muito longa.');

export const chatCategoriaSchema = z
  .string()
  .trim()
  .max(32)
  .transform((value) => value.toUpperCase())
  .pipe(z.enum(['DIRECT', 'BUDGET', 'ORCAMENTO']));

export const optionalTrimmedString = (max: number, message = 'Campo inválido.') =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .nullable()
    .transform((value) => (value ? value : undefined));

export const usernamePayloadSchema = z
  .object({
    username: z.string().trim().min(1, 'Username inválido.').max(64, 'Username inválido.'),
  })
  .strict();

export const resetCredentialsSchema = z
  .object({
    email: emailSchema,
    cpf: cpfSchema,
  })
  .strict();

export const PRESIGN_MAX_BYTES = 10 * 1024 * 1024;

export const PRESIGN_CONTEXTS = ['portfolio', 'kyc', 'flash-notes'] as const;

export type PresignContext = (typeof PRESIGN_CONTEXTS)[number];

export const PRESIGN_CONTENT_TYPE_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'application/pdf': '.pdf',
} as const;

export const PRESIGN_ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
] as const;

export const presignUploadSchema = z
  .object({
    fileName: z
      .string()
      .trim()
      .min(1, 'fileName e contentType são obrigatórios.')
      .max(255, 'Nome de arquivo inválido.')
      .refine((value) => !value.includes('..') && !value.includes('/') && !value.includes('\\'), {
        message: 'Nome de arquivo inválido.',
      }),
    contentType: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(
        z.enum(PRESIGN_ALLOWED_CONTENT_TYPES, {
          message: 'Tipo de arquivo não permitido.',
        })
      ),
    contentLength: z
      .number()
      .int()
      .positive()
      .max(PRESIGN_MAX_BYTES, 'Arquivo excede o limite de 10 MB.'),
    context: z.enum(PRESIGN_CONTEXTS),
    turnstileToken: turnstileTokenSchema,
  })
  .strict();

export const chatEnviarSchema = z
  .object({
    destinatario_id: uuidSchema,
    mensagem: chatMessageSchema,
    artworkId: uuidSchema.optional(),
    artwork_id: uuidSchema.optional(),
    categoria: chatCategoriaSchema.optional(),
  })
  .strict();

export const assistantChatSchema = z
  .object({
    message: z.string().trim().max(4000).optional(),
    locale: localeSchema.optional(),
    messages: z
      .array(
        z
          .object({
            role: z.enum(['user', 'assistant', 'model']).optional(),
            content: z.string().trim().max(4000).optional(),
          })
          .strict()
      )
      .max(40)
      .optional(),
  })
  .strict();

const httpsStorageUrlSchema = storageUrlSchema.refine(
  (value) => value.toLowerCase().startsWith('https://'),
  'URL de arquivo inválida.'
);

const flashNoteDiscountSchema = z
  .union([z.number().int().gte(0).lte(99), z.null()])
  .optional();

export const flashNoteCreateSchema = z
  .object({
    content: z.string().trim().min(1, 'Conteúdo obrigatório.').max(80, 'Conteúdo excede o limite.'),
    expiresAt: isoDateTimeSchema.optional(),
    expires_at: isoDateTimeSchema.optional(),
    backgroundId: z.string().trim().max(32).optional(),
    fontClass: z.string().trim().max(64).optional(),
    alignClass: z.string().trim().max(64).optional(),
    price: nonNegativeMoneySchema.optional(),
    discountPercentage: flashNoteDiscountSchema,
    imageUrl: httpsStorageUrlSchema.optional(),
  })
  .strict();

export const flashNoteUpdateSchema = z
  .object({
    content: z.string().trim().min(1).max(80).optional(),
    backgroundId: z.string().trim().max(32).optional(),
    fontClass: z.string().trim().max(64).optional(),
    alignClass: z.string().trim().max(64).optional(),
    price: nonNegativeMoneySchema.optional(),
    discountPercentage: flashNoteDiscountSchema,
    imageUrl: httpsStorageUrlSchema.optional(),
  })
  .strict();

export const reviewReplySchema = z
  .object({
    reply: z.string().trim().min(1, 'A resposta não pode ficar vazia.').max(1000).optional(),
    artistReply: z.string().trim().min(1, 'A resposta não pode ficar vazia.').max(1000).optional(),
  })
  .strict()
  .refine((data) => Boolean(data.reply ?? data.artistReply), {
    message: 'A resposta não pode ficar vazia.',
  });

export const agendamentoCreateSchema = z
  .object({
    tatuador_id: uuidSchema,
    data_hora: isoDateTimeSchema,
    valor_total: moneySchema,
    cliente_id: uuidSchema.optional(),
    extras: z
      .array(
        z
          .object({
            descricao: z.string().trim().max(160).optional(),
            valor: nonNegativeMoneySchema.optional(),
          })
          .strict()
      )
      .max(20)
      .optional(),
  })
  .strict();

export const agendamentoCancelSchema = z
  .object({
    agendamento_id: uuidSchema,
  })
  .strict();

export const agendamentoCancelExecutarSchema = z
  .object({
    agendamento_id: uuidSchema,
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Código OTP obrigatório.'),
  })
  .strict();

const WEEKDAY_ENUM = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

const workingHoursBreakSchema = z
  .object({
    id: z.string().trim().min(1).max(80).optional(),
    start: z.string().trim().regex(HH_MM, 'Horário inválido.'),
    end: z.string().trim().regex(HH_MM, 'Horário inválido.'),
  })
  .strict();

const workingHoursDaySchema = z
  .object({
    day: z.enum(WEEKDAY_ENUM),
    active: z.boolean(),
    start: z.string().trim().regex(HH_MM, 'Horário inválido.'),
    end: z.string().trim().regex(HH_MM, 'Horário inválido.'),
    breaks: z.array(workingHoursBreakSchema).max(3, 'Máximo de 3 intervalos por dia.'),
  })
  .strict();

export const workingHoursScheduleSchema = z
  .object({
    schemaVersion: z.number().int().positive().max(10),
    timezone: z.string().trim().min(1).max(80),
    days: z.array(workingHoursDaySchema).min(1).max(7),
    updatedAt: z.string().trim().max(40).optional(),
  })
  .strict();

export const artistScheduleSchema = z
  .object({
    schedule: workingHoursScheduleSchema.optional(),
    scheduleJson: workingHoursScheduleSchema.optional(),
  })
  .strict()
  .refine((data) => data.schedule !== undefined || data.scheduleJson !== undefined, {
    message: 'Informe o expediente em schedule.',
  });

export const catalogIdSchema = z.string().trim().min(1).max(80);

export const budgetEstimateQuerySchema = z.object({
  style: optionalTrimmedString(80),
  location: optionalTrimmedString(80),
  artistId: catalogIdSchema.optional(),
  tatuadorId: catalogIdSchema.optional(),
  artworkId: catalogIdSchema.optional(),
  portfolioId: catalogIdSchema.optional(),
  artistName: optionalTrimmedString(160),
});

export const budgetCheaperQuerySchema = z.object({
  style: optionalTrimmedString(80),
  styleId: optionalTrimmedString(80),
  currentArtistId: catalogIdSchema.optional(),
  artistId: catalogIdSchema.optional(),
  maxPriceLimit: moneySchema.optional(),
  maxPrice: moneySchema.optional(),
  location: optionalTrimmedString(80),
});

export const nearbyArtistsQuerySchema = z.object({
  lat: latitudeSchema.optional(),
  latitude: latitudeSchema.optional(),
  lng: longitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  radius: radiusKmSchema.optional(),
  radiusKm: radiusKmSchema.optional(),
});

export const recoveryDocumentSchema = z
  .object({
    fileKey: storageKeySchema.optional(),
    publicUrl: storageUrlSchema.optional(),
    contentType: z.string().trim().max(120).optional(),
  })
  .strict()
  .refine((data) => Boolean(data.fileKey || data.publicUrl), {
    message: 'Informe um fileKey ou publicUrl válido do R2.',
  });

export const kycValidateDocumentSchema = z
  .object({
    fileKey: storageKeySchema.optional(),
    publicUrl: storageUrlSchema.optional(),
    contentType: z.string().trim().max(120).optional(),
    turnstileToken: turnstileTokenSchema,
  })
  .strict()
  .refine((data) => Boolean(data.fileKey || data.publicUrl), {
    message: 'Informe um fileKey ou publicUrl válido do R2.',
  });

export const kycVerifySchema = z
  .object({
    cpf: cpfOrCnpjSchema,
    fullName: fullNameSchema,
    selfieUrl: storageRefSchema,
    documentFrontUrl: storageRefSchema,
    documentBackUrl: storageRefSchema.optional(),
    turnstileToken: turnstileTokenSchema.optional(),
  })
  .strict();

export const onboardingPayloadSchema = z
  .object({
    role: appRoleSchema.optional(),
    turnstileToken: turnstileTokenSchema,
  })
  .strict();

export const ensurePayloadSchema = z
  .object({
    role: appRoleSchema.optional(),
  })
  .strict();

export const languagePayloadSchema = z
  .object({
    language: localeSchema.optional(),
    locale: localeSchema.optional(),
  })
  .strict()
  .refine((data) => Boolean(data.language ?? data.locale), {
    message: 'Idioma inválido.',
  });

export const affiliationRequestSchema = z
  .object({
    estudio_id: uuidSchema,
  })
  .strict();

export const affiliationDecisionSchema = z
  .object({
    convite_id: uuidSchema,
    action: z.enum(['accept', 'reject', 'cancel']),
  })
  .strict();

export const studioCnpjPayloadSchema = z
  .object({
    cnpj: cnpjSchema,
  })
  .strict();

export const quoteApproveSchema = z.object({
  quoteId: uuidSchema,
  totalValue: z.union([moneySchema, z.string().trim().min(1).max(24)]),
});

export const budgetQuoteRequestSchema = z.object({
  artistId: uuidSchema,
  artworkId: catalogIdSchema.optional().nullable(),
  style: optionalTrimmedString(80),
  estimateRange: optionalTrimmedString(80),
  imageUrl: z.string().trim().max(STORAGE_REF_MAX_LENGTH).optional().nullable(),
});

export const migrateRoleSchema = z.object({
  userId: z.string().trim().min(1, 'Identificador inválido.').max(128),
  newRole: appRoleSchema,
  extraData: z
    .object({
      cnpj: cnpjSchema.optional().nullable(),
      nome: optionalTrimmedString(160),
    })
    .optional(),
});

export const clerkUserIdSchema = z
  .string()
  .trim()
  .min(1, 'Identificador inválido.')
  .max(128, 'Identificador inválido.');

export const persistStudioMetadataSchema = z.object({
  sessionId: z.string().trim().max(128).optional(),
  cnpj: z.string().trim().max(20),
  razaoSocial: z.string().trim().max(160),
});

const portfolioNotesField = z.string().trim().max(500).optional();
const portfolioStyleField = z.string().trim().max(80).optional();
const portfolioBodyPartField = z.string().trim().max(80).optional();
const portfolioDurationField = z.string().trim().max(80).optional();
const portfolioHealedField = z.union([z.boolean(), z.string().trim().max(8)]).optional();

export const portfolioPublishSchema = z
  .object({
    imageUrl: z.string().trim().max(STORAGE_REF_MAX_LENGTH).optional(),
    url_imagem: z.string().trim().max(STORAGE_REF_MAX_LENGTH).optional(),
    image_url: z.string().trim().max(STORAGE_REF_MAX_LENGTH).optional(),
    style: portfolioStyleField,
    estilo: portfolioStyleField,
    bodyPart: portfolioBodyPartField,
    body_part: portfolioBodyPartField,
    sessionDuration: portfolioDurationField,
    session_duration: portfolioDurationField,
    isHealed: portfolioHealedField,
    is_healed: portfolioHealedField,
    notes: portfolioNotesField,
    caption: portfolioNotesField,
    descricao: portfolioNotesField,
    description: portfolioNotesField,
  })
  .strict();

export const portfolioUpdateSchema = z
  .object({
    style: portfolioStyleField,
    estilo: portfolioStyleField,
    bodyPart: portfolioBodyPartField,
    body_part: portfolioBodyPartField,
    sessionDuration: portfolioDurationField,
    session_duration: portfolioDurationField,
    isHealed: portfolioHealedField,
    is_healed: portfolioHealedField,
    notes: portfolioNotesField,
    caption: portfolioNotesField,
    descricao: portfolioNotesField,
    description: portfolioNotesField,
  })
  .strict();

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
