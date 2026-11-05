const { randomUUID } = require("crypto");
const { Prisma } = require("@prisma/client");
const { prisma } = require("./prisma.service.cjs");

const PERFIL_SELECT = {
  id: true,
  email: true,
  role: true,
  deleted_at: true,
};

function parseAppRole(value) {
  if (value === "tatuador" || value === "estudio" || value === "cliente") return value;
  return null;
}

function resolveKycStatusForRole(role) {
  return role === "cliente" ? "nao_aplicavel" : "pendente";
}

function emailFromClerkUser(user) {
  if (!user) return "";
  const primary = user.primaryEmailAddress && user.primaryEmailAddress.emailAddress;
  const first = user.emailAddresses && user.emailAddresses[0] && user.emailAddresses[0].emailAddress;
  return String(primary || first || "")
    .trim()
    .toLowerCase();
}

function nomeFromClerkUser(user) {
  if (!user) return null;
  const publicMeta = user.publicMetadata || {};
  const unsafeMeta = user.unsafeMetadata || {};
  const fromMeta = String(publicMeta.full_name || publicMeta.nome || unsafeMeta.full_name || unsafeMeta.nome || "").trim();
  if (fromMeta) return fromMeta;
  const joined = [user.firstName, user.lastName]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
  return joined || String(user.fullName || "").trim() || null;
}

function roleFromClerkUser(user) {
  if (!user) return null;
  const publicMeta = user.publicMetadata || {};
  const unsafeMeta = user.unsafeMetadata || {};
  return parseAppRole(publicMeta.role) || parseAppRole(unsafeMeta.role);
}

async function fetchClerkUser(clerkId) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;
  try {
    const { createClerkClient } = require("@clerk/backend");
    const client = createClerkClient({ secretKey });
    return await client.users.getUser(clerkId);
  } catch {
    return null;
  }
}

async function findPerfilByClerkId(clerkId) {
  if (!clerkId) return null;
  return prisma.perfil.findUnique({
    where: { clerk_id: clerkId },
    select: PERFIL_SELECT,
  });
}

async function upsertPerfilAtomic({ clerkId, create, update }) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${clerkId}::text))`;
      const current = await tx.perfil.findUnique({
        where: { clerk_id: clerkId },
        select: { id: true },
      });
      if (current) {
        return tx.perfil.update({
          where: { clerk_id: clerkId },
          data: update,
          select: PERFIL_SELECT,
        });
      }
      return tx.perfil.create({
        data: create,
        select: PERFIL_SELECT,
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 15000,
    }
  );
}

function uniqueTargetIncludes(error, field) {
  const target = error && error.meta && error.meta.target;
  if (Array.isArray(target)) {
    return target.some((item) => String(item).toLowerCase().includes(field));
  }
  if (typeof target === "string") {
    return target.toLowerCase().includes(field);
  }
  return false;
}

/**
 * Cria o perfil local quando o JWT Clerk e valido e ainda nao ha linha em `perfis`.
 * Equivalente compacto do `ensurePerfilFromClerk` do Next (idempotente, P2002-safe).
 */
async function ensurePerfilForClerkIdentity({ clerkId, emailHint, nomeHint, roleHint }) {
  const id = String(clerkId || "").trim();
  if (!id) return null;

  const existing = await findPerfilByClerkId(id);
  if (existing) return existing;

  const clerkUser = await fetchClerkUser(id);
  const role = roleFromClerkUser(clerkUser) || parseAppRole(roleHint) || "cliente";
  const nome = nomeFromClerkUser(clerkUser) || (nomeHint ? String(nomeHint).trim() : null);
  const resolvedEmail = emailFromClerkUser(clerkUser) || String(emailHint || "").trim().toLowerCase();
  const email = resolvedEmail || `pending.${id}@tattoogo.local`;

  const create = {
    id: randomUUID(),
    clerk_id: id,
    email,
    nome,
    role,
    kyc_status: resolveKycStatusForRole(role),
  };
  const update = {
    deleted_at: null,
    agenda_bloqueada: false,
    ...(resolvedEmail ? { email: resolvedEmail } : {}),
    ...(nome ? { nome } : {}),
  };

  try {
    return await upsertPerfilAtomic({ clerkId: id, create, update });
  } catch (error) {
    if (!error || error.code !== "P2002") {
      console.error("[ensure-perfil] falha ao provisionar perfil", {
        clerkId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      return findPerfilByClerkId(id);
    }

    if (uniqueTargetIncludes(error, "clerk_id")) {
      return findPerfilByClerkId(id);
    }

    if (uniqueTargetIncludes(error, "email")) {
      const byEmail = await prisma.perfil.findUnique({
        where: { email },
        select: { ...PERFIL_SELECT, clerk_id: true },
      });
      if (!byEmail) return findPerfilByClerkId(id);
      const reclaimable = byEmail.deleted_at !== null || !byEmail.clerk_id || byEmail.clerk_id === id;
      if (!reclaimable) return findPerfilByClerkId(id);
      return prisma.perfil.update({
        where: { id: byEmail.id },
        data: { ...update, clerk_id: id },
        select: PERFIL_SELECT,
      });
    }

    return findPerfilByClerkId(id);
  }
}

module.exports = {
  ensurePerfilForClerkIdentity,
  findPerfilByClerkId,
};
