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

export function resolveNome(source: ClerkProfileSource): string | null {
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

function isProfessionalRole(role: AppRole | null | undefined): boolean {
  return role === 'tatuador' || role === 'estudio';
}

/**
 * Transição de identidade permitida: cliente → tatuador/estúdio.
 * Conta soft-deleted pode assumir qualquer papel solicitado no novo cadastro.
 * Demais mudanças (ex.: tatuador → cliente em conta ativa) continuam bloqueadas.
 */
export function isIdentityRoleTransitionAllowed(
  current: AppRole | null | undefined,
  requested: AppRole | null | undefined,
  options?: { deleted?: boolean }
): boolean {
  if (!requested) return true;
  if (!current || current === requested) return true;
  if (options?.deleted) return true;
  return current === 'cliente' && isProfessionalRole(requested);
}

function identityRolePatch(
  current: AppRole,
  requested: AppRole | null | undefined,
  wasDeleted: boolean
): {
  role?: AppRole;
  kyc_status?: KycStatusValue;
  has_seen_welcome_notice?: boolean;
} {
  if (!requested || !isIdentityRoleTransitionAllowed(current, requested, { deleted: wasDeleted })) {
    return {};
  }

  const roleChanged = current !== requested;
  const reclaimingProfessional = wasDeleted && isProfessionalRole(requested);

  if (!roleChanged && !reclaimingProfessional) {
    return wasDeleted ? { role: requested } : {};
  }

  return {
    role: requested,
    kyc_status: resolveKycStatusForRole(requested),
    ...(roleChanged || wasDeleted ? { has_seen_welcome_notice: false } : {}),
  };
}

export async function findPerfilByClerkId(clerkId: string): Promise<LocalPerfil | null> {
  if (!clerkId) return null;
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
  | { status: 'transitioned'; perfil: LocalPerfil }
  | { status: 'active_conflict' }
  | { status: 'not_applicable' }
  | { status: 'error' };

export type ReconcileIdentityByCpfParams = {
  cpf: string;
  newClerkId: string;
  newEmail: string;
  requestedRole?: AppRole | null;
  nome?: string | null;
};

/**
 * Reconciliação de identidade via CPF.
 *
 * O CPF é globalmente único (`perfis_cpf_unique_idx`). Quando um novo login do
 * Clerk informa um CPF que já existe:
 * - conta soft-deleted: religa `clerk_id` + e-mail, reativa o registro e aplica
 *   transição de papel (ex.: cliente → tatuador) resetando KYC pendente;
 * - conta ativa com o mesmo e-mail: permite upgrade cliente → tatuador;
 * - conta ativa com e-mail divergente: `active_conflict` (CPF já em uso).
 *
 * Nunca cria um segundo `Perfil` para o mesmo CPF — evita P2002.
 */
export async function reconcileIdentityByCpf(
  params: ReconcileIdentityByCpfParams
): Promise<PerfilReactivationOutcome> {
  const cpfOwner = await findPerfilByCpf(params.cpf);
  if (!cpfOwner) return { status: 'not_applicable' };

  const email = String(params.newEmail || '').trim().toLowerCase();
  if (!email) return { status: 'error' };

  const sameClerk = cpfOwner.clerk_id === params.newClerkId;
  const sameEmail = String(cpfOwner.email || '').trim().toLowerCase() === email;
  const wasDeleted = cpfOwner.deleted_at !== null;

  if (!wasDeleted && !sameEmail && !sameClerk) {
    console.warn('[ensure-perfil] CPF ativo pertencente a outra conta; rejeitando', {
      newClerkId: params.newClerkId,
      cpfOwnerId: cpfOwner.id,
    });
    return { status: 'active_conflict' };
  }

  const requested = parseAppRole(params.requestedRole);
  if (
    requested &&
    !isIdentityRoleTransitionAllowed(cpfOwner.role, requested, { deleted: wasDeleted })
  ) {
    console.warn('[ensure-perfil] transição de papel via CPF não permitida', {
      current: cpfOwner.role,
      requested,
      cpfOwnerId: cpfOwner.id,
    });
    return { status: 'active_conflict' };
  }

  const rolePatch = identityRolePatch(cpfOwner.role, requested, wasDeleted);
  const roleChanged = Boolean(rolePatch.role && rolePatch.role !== cpfOwner.role);

  const updatePayload = {
    clerk_id: params.newClerkId,
    email,
    deleted_at: null,
    agenda_bloqueada: false,
    ...(params.nome ? { nome: params.nome } : {}),
    ...rolePatch,
  };

  try {
    const perfil = await applyCpfIdentityUpdate(cpfOwner.id, updatePayload);

    console.warn('[ensure-perfil] identidade reconciliada via CPF', {
      newClerkId: params.newClerkId,
      perfilId: perfil.id,
      previousRole: cpfOwner.role,
      nextRole: perfil.role,
      reactivated: wasDeleted,
      roleChanged,
    });

    return {
      status: roleChanged ? 'transitioned' : 'reactivated',
      perfil: { ...perfil, reactivated: wasDeleted },
    };
  } catch (error) {
    const uniqueError = asUniqueConstraintError(error);
    if (uniqueError && uniqueTargetIncludes(uniqueError, 'email')) {
      return { status: 'active_conflict' };
    }
    if (uniqueError && uniqueTargetIncludes(uniqueError, 'clerk_id')) {
      const released = await releaseClerkIdStub(params.newClerkId, cpfOwner.id);
      if (released) {
        try {
          const perfil = await applyCpfIdentityUpdate(cpfOwner.id, updatePayload);
          return {
            status: roleChanged ? 'transitioned' : 'reactivated',
            perfil: { ...perfil, reactivated: wasDeleted },
          };
        } catch {
          return { status: 'error' };
        }
      }
      return { status: 'active_conflict' };
    }
    console.error('[ensure-perfil] falha ao reconciliar identidade via CPF', {
      newClerkId: params.newClerkId,
      cpfOwnerId: cpfOwner.id,
      error,
    });
    return { status: 'error' };
  }
}

async function applyCpfIdentityUpdate(
  perfilId: string,
  data: {
    clerk_id: string;
    email: string;
    deleted_at: null;
    agenda_bloqueada: boolean;
    nome?: string;
    role?: AppRole;
    kyc_status?: KycStatusValue;
    has_seen_welcome_notice?: boolean;
  }
): Promise<LocalPerfil> {
  return prisma.perfil.update({
    where: { id: perfilId },
    data,
    select: PERFIL_SELECT,
  });
}

async function releaseClerkIdStub(clerkId: string, keepPerfilId: string): Promise<boolean> {
  const stub = await findPerfilByClerkId(clerkId);
  if (!stub || stub.id === keepPerfilId) return true;
  try {
    await prisma.perfil.update({
      where: { id: stub.id },
      data: {
        clerk_id: null,
        email: `reclaimed.${stub.id}.${Date.now()}@deleted.tattoogo.local`,
        deleted_at: stub.deleted_at ?? new Date(),
      },
    });
    return true;
  } catch (error) {
    console.error('[ensure-perfil] falha ao liberar clerk_id do stub', {
      stubId: stub.id,
      clerkId,
      error,
    });
    return false;
  }
}

/**
 * Compat: reativação de conta soft-deleted via CPF.
 * Delega para `reconcileIdentityByCpf` (mesma regra, com transição de papel).
 */
export async function reactivateSoftDeletedPerfilByCpf(params: {
  cpf: string;
  newClerkId: string;
  newEmail: string;
  requestedRole?: AppRole | null;
  nome?: string | null;
}): Promise<PerfilReactivationOutcome> {
  return reconcileIdentityByCpf(params);
}

/**
 * Adota o perfil dono do CPF, mesmo se um stub já existir para o clerk_id
 * atual. Evita P2002 (cpf/clerk_id) ao relinkar em vez de criar um segundo row.
 */
async function adoptCpfIdentity(params: {
  cpf: string;
  clerkId: string;
  email: string;
  nome: string | null;
  requestedRole: AppRole | null;
  existing: LocalPerfil | null;
}): Promise<PerfilReactivationOutcome> {
  const cpfOwner = await findPerfilByCpf(params.cpf);
  if (!cpfOwner) return { status: 'not_applicable' };
  if (params.existing && params.existing.id === cpfOwner.id) {
    return reconcileIdentityByCpf({
      cpf: params.cpf,
      newClerkId: params.clerkId,
      newEmail: params.email,
      requestedRole: params.requestedRole,
      nome: params.nome,
    });
  }

  const sameClerk = cpfOwner.clerk_id === params.clerkId;
  const sameEmail =
    Boolean(params.email) &&
    String(cpfOwner.email || '').trim().toLowerCase() === params.email;
  const wasDeleted = cpfOwner.deleted_at !== null;

  if (!wasDeleted && !sameEmail && !sameClerk) {
    return { status: 'active_conflict' };
  }

  if (params.existing && params.existing.id !== cpfOwner.id) {
    const released = await releaseClerkIdStub(params.clerkId, cpfOwner.id);
    if (!released) return { status: 'error' };
  }

  return reconcileIdentityByCpf({
    cpf: params.cpf,
    newClerkId: params.clerkId,
    newEmail: params.email,
    requestedRole: params.requestedRole,
    nome: params.nome,
  });
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
  const resolvedEmail = resolveEmail(source);
  const nome = resolveNome(source);
  const role = parseAppRole(roleOverride) ?? parseAppRole(metadata.role as string | undefined);

  const existing = await findPerfilByClerkId(clerkId);
  const cpf = resolveCpf(source);
  const email =
    resolvedEmail || existing?.email || `pending.${clerkId}@tattoogo.local`;

  // Identidade pelo CPF tem prioridade sobre um stub criado pelo clerk_id:
  // religa o registro dono do CPF e evita P2002 + papel travado em 'cliente'.
  if (cpf) {
    const reconciled = await adoptCpfIdentity({
      cpf,
      clerkId,
      email,
      nome,
      requestedRole: role,
      existing,
    });
    if (reconciled.status === 'active_conflict') return null;
    if (reconciled.status === 'error') return findPerfilByClerkId(clerkId);
    if (reconciled.status === 'reactivated' || reconciled.status === 'transitioned') {
      return reconciled.perfil;
    }
  }

  // O papel persistido é a fonte de verdade, salvo transição explícita
  // cliente → tatuador/estúdio (reconciliação de identidade).
  const transitionPatch = existing
    ? identityRolePatch(existing.role, role, existing.deleted_at !== null)
    : {};
  const effectiveRole: AppRole | null =
    (transitionPatch.role as AppRole | undefined) ?? existing?.role ?? role ?? null;

  const cnpj = effectiveRole ? resolveCnpj(source, effectiveRole) : null;
  const dataNascimento = optionalText(metadata.data_nascimento);
  const responsavelNome = optionalText(metadata.responsavel_nome);
  const responsavelCpf = resolveResponsavelCpf(source);
  const acceptedTerms = resolveAcceptedTerms(source);

  // Atualização não destrutiva: só sobrescreve um campo quando o payload traz
  // valor. Papel só muda via `identityRolePatch` (upgrade cliente → profissional).
  const sharedUpdate = {
    deleted_at: null,
    agenda_bloqueada: false,
    ...(resolvedEmail ? { email: resolvedEmail } : {}),
    ...(nome ? { nome } : {}),
    ...(!existing && role ? { role } : {}),
    ...transitionPatch,
    ...(cnpj ? { cnpj } : {}),
    ...(dataNascimento ? { data_nascimento: dataNascimento } : {}),
    ...(responsavelNome ? { responsavel_nome: responsavelNome } : {}),
    ...(responsavelCpf ? { responsavel_cpf: responsavelCpf } : {}),
    ...(acceptedTerms ? { accepted_terms: true } : {}),
    ...(effectiveRole === 'cliente' && !transitionPatch.kyc_status
      ? { kyc_status: 'nao_aplicavel' as const }
      : {}),
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

  // Sempre provisiona um registro básico quando o webhook do Clerk ainda não
  // disparou: papel cai em `cliente` e o e-mail usa placeholder único até a
  // sessão hidratar os metadados reais. Nunca devolve null por dados incompletos.

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

    if (uniqueTargetIncludes(uniqueError, 'cpf') && cpf) {
      const recovered = await adoptCpfIdentity({
        cpf,
        clerkId,
        email,
        nome,
        requestedRole: role,
        existing: await findPerfilByClerkId(clerkId),
      });
      if (recovered.status === 'reactivated' || recovered.status === 'transitioned') {
        return recovered.perfil;
      }
      if (recovered.status === 'active_conflict') return null;
      return findPerfilByClerkId(clerkId);
    }

    return findPerfilByClerkId(clerkId);
  }
}
