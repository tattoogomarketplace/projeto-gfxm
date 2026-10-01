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

export async function ensurePerfilFromClerk(
  source: ClerkProfileSource,
  roleOverride?: string | null
): Promise<LocalPerfil | null> {
  const clerkId = String(source.id || '').trim();
  if (!clerkId) return null;

  const existing = await findPerfilByClerkId(clerkId);
  if (existing) return existing;

  const email = resolveEmail(source);
  if (!email) return null;

  const metadata = metadataOf(source);
  const role = parseAppRole(roleOverride || (metadata.role as string | undefined));
  if (!role) return null;

  const payload = {
    clerk_id: clerkId,
    email,
    nome: resolveNome(source),
    role,
    cpf: resolveCpf(source),
    cnpj: resolveCnpj(source, role),
    data_nascimento: optionalText(metadata.data_nascimento),
    responsavel_nome: optionalText(metadata.responsavel_nome),
    responsavel_cpf: resolveResponsavelCpf(source),
    accepted_terms: resolveAcceptedTerms(source),
  };

  const byEmail = await prisma.perfil.findFirst({
    where: { email, deleted_at: null },
    select: PERFIL_SELECT,
  });

  if (byEmail && !byEmail.clerk_id) {
    return prisma.perfil.update({
      where: { id: byEmail.id },
      data: {
        clerk_id: clerkId,
        nome: payload.nome ?? byEmail.nome,
        role,
      },
      select: PERFIL_SELECT,
    });
  }

  if (byEmail?.clerk_id && byEmail.clerk_id !== clerkId) {
    return null;
  }

  try {
    return await prisma.perfil.create({
      data: {
        id: randomUUID(),
        ...payload,
      },
      select: PERFIL_SELECT,
    });
  } catch {
    const byClerk = await findPerfilByClerkId(clerkId);
    if (byClerk) return byClerk;
    return prisma.perfil.findFirst({
      where: { email, deleted_at: null },
      select: PERFIL_SELECT,
    });
  }
}
