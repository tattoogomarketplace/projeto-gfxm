import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { parseAppRole, type AppRole } from '@/lib/utils/auth-redirect';

export type LocalPerfil = {
  id: string;
  clerk_id: string | null;
  email: string;
  nome: string | null;
  role: AppRole;
  kyc_status: string;
  has_seen_welcome_notice: boolean;
  deleted_at: Date | null;
  /**
   * Campo calculado (não persistido): sinaliza que o perfil retornado foi
   * reativado a partir de uma conta soft-deleted dona do CPF informado.
   */
  reactivated?: boolean;
};

type ClerkMetadata = {
  role?: unknown;
  full_name?: unknown;
  nome?: unknown;
  cpf?: unknown;
  cnpj?: unknown;
  data_nascimento?: unknown;
  responsavel_nome?: unknown;
  responsavel_cpf?: unknown;
  accepted_terms?: unknown;
};

export type ClerkProfileSource = {
  id?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  emailAddresses?: Array<{ emailAddress?: string | null }>;
  unsafeMetadata?: ClerkMetadata | Record<string, unknown> | null;
  publicMetadata?: ClerkMetadata | Record<string, unknown> | null;
};

const PERFIL_SELECT = {
  id: true,
  clerk_id: true,
  email: true,
  nome: true,
  role: true,
  kyc_status: true,
  has_seen_welcome_notice: true,
  deleted_at: true,
} as const;

function onlyDigits(value: unknown): string {
  return String(value || '').replace(/\D/g, '');
}

function optionalText(value: unknown): string | null {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

function metadataOf(source: ClerkProfileSource): ClerkMetadata {
  return (source.unsafeMetadata || source.publicMetadata || {}) as ClerkMetadata;
}

export function resolveEmail(source: ClerkProfileSource): string {
  return String(
    source.primaryEmailAddress?.emailAddress ||
      source.emailAddresses?.[0]?.emailAddress ||
      ''
  )
    .trim()
    .toLowerCase();
}

function resolveNome(source: ClerkProfileSource): string | null {
  const metadata = metadataOf(source);
  const fromMetadata = optionalText(metadata.full_name || metadata.nome);
  if (fromMetadata) return fromMetadata;
  const fromClerk = [source.firstName, source.lastName, source.fullName]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  return fromClerk || null;
}

export function resolveCpf(source: ClerkProfileSource): string | null {
  const digits = onlyDigits(metadataOf(source).cpf);
  return digits.length === 11 ? digits : null;
}

function resolveCnpj(source: ClerkProfileSource, role: AppRole): string | null {
  if (role !== 'estudio') return null;
  const digits = onlyDigits(metadataOf(source).cnpj);
  return digits.length === 14 ? digits : null;
}

function resolveResponsavelCpf(source: ClerkProfileSource): string | null {
  const digits = onlyDigits(metadataOf(source).responsavel_cpf);
  return digits.length === 11 ? digits : null;
}

function resolveAcceptedTerms(source: ClerkProfileSource): boolean {
  const value = metadataOf(source).accepted_terms;
  if (value === true) return true;
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'true' || normalized === 't' || normalized === '1';
}

type KycStatusValue = 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado' | 'nao_aplicavel';

/**
 * O KYC é exigência exclusiva de profissionais (tatuador/estúdio). Clientes não
 * passam por verificação documental e recebem um status não bloqueante, evitando
 * que fiquem presos em 'pendente'.
 */
function resolveKycStatusForRole(role: AppRole | null): KycStatusValue {
  return role === 'cliente' ? 'nao_aplicavel' : 'pendente';
}

export async function findPerfilByClerkId(clerkId: string): Promise<LocalPerfil | null> {
  return prisma.perfil.findUnique({
    where: { clerk_id: clerkId },
    select: PERFIL_SELECT,
  });
}

/**
 * Localiza o perfil dono de um CPF, INCLUINDO contas soft-deleted
 * (`deleted_at != null`). É a base da reativação inteligente: um CPF é
 * globalmente único (constraint `perfis_cpf_unique_idx`), então precisamos
 * recuperar o registro original antes de tentar inseri-lo novamente.
 */
export async function findPerfilByCpf(cpf: string): Promise<LocalPerfil | null> {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11) return null;
  return prisma.perfil.findUnique({
    where: { cpf: digits },
    select: PERFIL_SELECT,
  });
}

export type PerfilReactivationOutcome =
  | { status: 'reactivated'; perfil: LocalPerfil }
  | { status: 'active_conflict' }
  | { status: 'not_applicable' }
  | { status: 'error' };

/**
 * Reativação inteligente de conta soft-deleted via CPF.
 *
 * O CPF é globalmente único (`perfis_cpf_unique_idx`). Quando um novo login do
 * Clerk informa um CPF que pertence a uma conta com `deleted_at != null`,
 * reaproveitamos o MESMO registro (preservando `id`, papel, KYC e histórico)
 * em vez de inserir um novo e colidir com a constraint. Se o CPF já estiver
 * ATIVO em outra conta e o e-mail divergir, devolvemos `active_conflict`
 * (rejeição padrão: CPF já em uso).
 *
 * É idempotente e centraliza a regra para uso tanto no funil
 * `ensurePerfilFromClerk` quanto na rota de onboarding.
 */
export async function reactivateSoftDeletedPerfilByCpf(params: {
  cpf: string;
  newClerkId: string;
  newEmail: string;
}): Promise<PerfilReactivationOutcome> {
  const cpfOwner = await findPerfilByCpf(params.cpf);
  if (!cpfOwner) return { status: 'not_applicable' };

  const email = String(params.newEmail || '').trim().toLowerCase();
  const sameEmail = String(cpfOwner.email || '').trim().toLowerCase() === email;
  if (cpfOwner.deleted_at === null && !sameEmail) {
    console.warn('[ensure-perfil] CPF ativo pertencente a outra conta; rejeitando', {
      newClerkId: params.newClerkId,
      cpfOwnerId: cpfOwner.id,
    });
    return { status: 'active_conflict' };
  }

  try {
    const perfil = await prisma.perfil.update({
      where: { id: cpfOwner.id },
      data: {
        // Reativação não destrutiva: preserva papel, KYC, nome e histórico do
        // dono original do CPF. Apenas religa o registro ao novo login do Clerk
        // e restaura o estado ativo com o novo e-mail.
        clerk_id: params.newClerkId,
        email,
        deleted_at: null,
        agenda_bloqueada: false,
      },
      select: PERFIL_SELECT,
    });

    console.warn('[ensure-perfil] perfil reativado a partir de conta soft-deleted', {
      newClerkId: params.newClerkId,
      perfilId: perfil.id,
    });

    return {
      status: 'reactivated',
      perfil: { ...perfil, reactivated: cpfOwner.deleted_at !== null },
    };
  } catch (error) {
    // E-mail novo já em uso por outro perfil ativo: rejeição padrão.
    const uniqueError = asUniqueConstraintError(error);
    if (uniqueError && uniqueTargetIncludes(uniqueError, 'email')) {
      return { status: 'active_conflict' };
    }
    console.error('[ensure-perfil] falha ao reativar perfil soft-deleted', {
      newClerkId: params.newClerkId,
      cpfOwnerId: cpfOwner.id,
      error,
    });
    return { status: 'error' };
  }
}

/**
 * Marca o onboarding como concluído de forma idempotente.
 *
 * O schema não possui uma coluna dedicada `onboarding_completed`; o marco
 * durável já existente é `has_seen_welcome_notice` (boolean NOT NULL). Ele é
 * exposto na API como `onboarding_completed`, evitando uma migração arriscada
 * no Neon. Se o perfil já estiver marcado, nenhuma escrita extra é feita.
 */
export async function markOnboardingCompleted(clerkId: string): Promise<LocalPerfil | null> {
  try {
    return await prisma.perfil.update({
      where: { clerk_id: clerkId },
      data: { has_seen_welcome_notice: true },
      select: PERFIL_SELECT,
    });
  } catch (error) {
    console.error('[ensure-perfil] falha ao marcar onboarding como concluído', {
      clerkId,
      error,
    });
    return findPerfilByClerkId(clerkId);
  }
}

type PrismaUniqueError = { code?: string; meta?: { target?: unknown } };

function asUniqueConstraintError(error: unknown): PrismaUniqueError | null {
  if (error && typeof error === 'object' && (error as PrismaUniqueError).code === 'P2002') {
    return error as PrismaUniqueError;
  }
  return null;
}

function uniqueTargetIncludes(error: PrismaUniqueError, field: string): boolean {
  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.some((item) => String(item).toLowerCase().includes(field));
  }
  if (typeof target === 'string') {
    return target.toLowerCase().includes(field);
  }
  return false;
}

/**
 * Persiste (cria ou atualiza) o perfil local a partir dos dados do Clerk.
 *
 * A gravação usa `upsert` pela chave única `clerk_id`, tornando a operação
 * idempotente: entregas duplicadas de webhook ou pequenas divergências de
 * campos nunca lançam erro fatal. Conflitos de unicidade em `email`/`cpf`
 * (colunas opcionais) são reconciliados sem estourar a rota com HTTP 500.
 */
export async function ensurePerfilFromClerk(
  source: ClerkProfileSource,
  roleOverride?: string | null
): Promise<LocalPerfil | null> {
  const clerkId = String(source.id || '').trim();
  if (!clerkId) return null;

  const metadata = metadataOf(source);
  const email = resolveEmail(source);
  const nome = resolveNome(source);
  const role = parseAppRole(roleOverride) ?? parseAppRole(metadata.role as string | undefined);

  const existing = await findPerfilByClerkId(clerkId);
  // O papel persistido é a fonte de verdade; metadados só definem o papel na
  // criação. Isso impede que um metadado divergente normalize o KYC errado.
  const effectiveRole: AppRole | null = existing?.role ?? role ?? null;

  const cpf = resolveCpf(source);
  const cnpj = effectiveRole ? resolveCnpj(source, effectiveRole) : null;
  const dataNascimento = optionalText(metadata.data_nascimento);
  const responsavelNome = optionalText(metadata.responsavel_nome);
  const responsavelCpf = resolveResponsavelCpf(source);
  const acceptedTerms = resolveAcceptedTerms(source);

  // Atualização não destrutiva: só sobrescreve um campo quando o payload traz
  // valor, preservando dados já persistidos em divergências de webhook. O papel
  // é imutável após a criação (evita "role flapping" e loops de redirecionamento
  // entre painéis). O único ajuste proativo é normalizar o KYC de clientes.
  const sharedUpdate = {
    deleted_at: null,
    ...(email ? { email } : {}),
    ...(nome ? { nome } : {}),
    ...(!existing && role ? { role } : {}),
    ...(cnpj ? { cnpj } : {}),
    ...(dataNascimento ? { data_nascimento: dataNascimento } : {}),
    ...(responsavelNome ? { responsavel_nome: responsavelNome } : {}),
    ...(responsavelCpf ? { responsavel_cpf: responsavelCpf } : {}),
    ...(acceptedTerms ? { accepted_terms: true } : {}),
    ...(effectiveRole === 'cliente' ? { kyc_status: 'nao_aplicavel' as const } : {}),
  };
  const updateData = cpf ? { ...sharedUpdate, cpf } : sharedUpdate;

  const createData = (cpfValue: string | null) => ({
    id: randomUUID(),
    clerk_id: clerkId,
    email,
    nome,
    role: role ?? 'cliente',
    kyc_status: resolveKycStatusForRole(role ?? 'cliente'),
    cpf: cpfValue,
    cnpj,
    data_nascimento: dataNascimento,
    responsavel_nome: responsavelNome,
    responsavel_cpf: responsavelCpf,
    accepted_terms: acceptedTerms,
  });

  // Um perfil novo exige papel e e-mail definidos (preserva o onboarding). Um
  // registro já existente pode ser reativado/atualizado mesmo sem um deles.
  if (!existing && (!role || !email)) {
    return null;
  }

  // Sem e-mail não é possível criar (coluna NOT NULL + única); nesse caso só
  // atualizamos o registro já vinculado ao clerk_id.
  if (!email) {
    return prisma.perfil.update({
      where: { id: existing!.id },
      data: updateData,
      select: PERFIL_SELECT,
    });
  }

  // Reativação inteligente (soft-delete): o CPF é único globalmente, então um
  // cadastro novo cujo CPF pertence a uma conta excluída NÃO deve colidir com
  // a constraint `perfis_cpf_unique_idx`. A regra vive em
  // `reactivateSoftDeletedPerfilByCpf` (reaproveitada pela rota de onboarding).
  if (!existing && cpf) {
    const outcome = await reactivateSoftDeletedPerfilByCpf({
      cpf,
      newClerkId: clerkId,
      newEmail: email,
    });
    if (outcome.status === 'active_conflict') {
      return null;
    }
    if (outcome.status === 'reactivated') {
      return outcome.perfil;
    }
  }

  try {
    return await prisma.perfil.upsert({
      where: { clerk_id: clerkId },
      create: createData(cpf),
      update: updateData,
      select: PERFIL_SELECT,
    });
  } catch (error) {
    const uniqueError = asUniqueConstraintError(error);
    if (!uniqueError) {
      console.error('[ensure-perfil] falha inesperada ao persistir perfil', {
        clerkId,
        email,
        role,
        error,
      });
      return findPerfilByClerkId(clerkId);
    }

    console.warn('[ensure-perfil] conflito de unicidade; reconciliando perfil', {
      clerkId,
      email,
      target: uniqueError.meta?.target,
    });

    if (uniqueTargetIncludes(uniqueError, 'email')) {
      const byEmail = await prisma.perfil.findUnique({
        where: { email },
        select: PERFIL_SELECT,
      });

      if (!byEmail) return findPerfilByClerkId(clerkId);
      if (byEmail.clerk_id && byEmail.clerk_id !== clerkId) return null;

      return prisma.perfil.update({
        where: { id: byEmail.id },
        data: { ...updateData, clerk_id: clerkId },
        select: PERFIL_SELECT,
      });
    }

    if (uniqueTargetIncludes(uniqueError, 'cpf')) {
      // CPF já pertence a outro perfil: persistimos o restante sem o campo
      // conflitante para não violar a constraint única opcional.
      try {
        return await prisma.perfil.upsert({
          where: { clerk_id: clerkId },
          create: createData(null),
          update: sharedUpdate,
          select: PERFIL_SELECT,
        });
      } catch (retryError) {
        console.error('[ensure-perfil] falha ao reconciliar conflito de cpf', {
          clerkId,
          email,
          role,
          retryError,
        });
        return findPerfilByClerkId(clerkId);
      }
    }

    return findPerfilByClerkId(clerkId);
  }
}
