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
  deleted_at: Date | null;
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

function resolveEmail(source: ClerkProfileSource): string {
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

function resolveCpf(source: ClerkProfileSource): string | null {
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

export async function findPerfilByClerkId(clerkId: string): Promise<LocalPerfil | null> {
  return prisma.perfil.findUnique({
    where: { clerk_id: clerkId },
    select: PERFIL_SELECT,
  });
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

  const cpf = resolveCpf(source);
  const cnpj = role ? resolveCnpj(source, role) : null;
  const dataNascimento = optionalText(metadata.data_nascimento);
  const responsavelNome = optionalText(metadata.responsavel_nome);
  const responsavelCpf = resolveResponsavelCpf(source);
  const acceptedTerms = resolveAcceptedTerms(source);

  // Atualização não destrutiva: só sobrescreve um campo quando o payload traz
  // valor, preservando dados já persistidos em divergências de webhook.
  const sharedUpdate = {
    deleted_at: null,
    ...(email ? { email } : {}),
    ...(nome ? { nome } : {}),
    ...(role ? { role } : {}),
    ...(cnpj ? { cnpj } : {}),
    ...(dataNascimento ? { data_nascimento: dataNascimento } : {}),
    ...(responsavelNome ? { responsavel_nome: responsavelNome } : {}),
    ...(responsavelCpf ? { responsavel_cpf: responsavelCpf } : {}),
    ...(acceptedTerms ? { accepted_terms: true } : {}),
  };
  const updateData = cpf ? { ...sharedUpdate, cpf } : sharedUpdate;

  const createData = (cpfValue: string | null) => ({
    id: randomUUID(),
    clerk_id: clerkId,
    email,
    nome,
    role: role ?? 'cliente',
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
