const { AccountStatus } = require("@prisma/client");
const { prisma } = require("../services/prisma.service.cjs");
const { verifyClerkSvix } = require("../middlewares/svix-webhook.cjs");
const {
  ensurePerfilForClerkIdentity,
  findPerfilByClerkId,
} = require("../services/ensure-perfil.service.cjs");

function parseAppRole(value) {
  if (value === "tatuador" || value === "estudio" || value === "cliente") return value;
  return null;
}

function resolveEmail(data) {
  const addresses = (data && data.email_addresses) || [];
  const primary = addresses.find((item) => item.id && item.id === data.primary_email_address_id);
  return String(primary?.email_address || addresses[0]?.email_address || "")
    .trim()
    .toLowerCase();
}

function resolveRole(data) {
  const publicMeta = (data && data.public_metadata) || {};
  const unsafeMeta = (data && data.unsafe_metadata) || {};
  return parseAppRole(publicMeta.role) || parseAppRole(unsafeMeta.role);
}

function resolveNome(data) {
  const publicMeta = (data && data.public_metadata) || {};
  const unsafeMeta = (data && data.unsafe_metadata) || {};
  const fromMeta = String(
    publicMeta.full_name || publicMeta.nome || unsafeMeta.full_name || unsafeMeta.nome || ""
  ).trim();
  if (fromMeta) return fromMeta;
  return [data?.first_name, data?.last_name]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ")
    .trim() || null;
}

async function clerk(req, res) {
  let event;
  try {
    event = verifyClerkSvix(req);
  } catch (error) {
    if (error && error.status === 500) {
      req.log?.error({ err: error }, "[clerk-webhook] CLERK_WEBHOOK_SIGNING_SECRET ausente.");
      return res.status(500).json({ error: "webhook_secret_missing" });
    }
    req.log?.error({ err: error }, "[clerk-webhook] assinatura Svix inválida.");
    return res.status(400).json({ error: "assinatura_svix_invalida" });
  }

  const type = event && event.type;
  const data = (event && event.data) || {};

  if (type === "user.deleted") {
    const clerkId = String(data.id || "").trim();
    if (clerkId) {
      prisma.perfil
        .updateMany({
          where: { clerk_id: clerkId },
          data: {
            deleted_at: new Date(),
            agenda_bloqueada: true,
            statusConta: AccountStatus.AGUARDANDO_EXCLUSAO,
          },
        })
        .catch((err) => {
          req.log?.error({ err, clerkId }, "[clerk-webhook] falha ao aplicar user.deleted");
        });
    }
    return res.status(202).json({ received: true });
  }

  if (type !== "user.created" && type !== "user.updated") {
    return res.status(200).json({ received: true });
  }

  const clerkId = String(data.id || "").trim();
  const email = resolveEmail(data);
  if (!clerkId) {
    return res.status(422).json({ error: "missing_clerk_id" });
  }

  try {
    const perfil = await ensurePerfilForClerkIdentity({
      clerkId,
      emailHint: email,
      nomeHint: resolveNome(data),
      roleHint: resolveRole(data),
    });
    if (!perfil) {
      return res.status(422).json({ error: "perfil_nao_persistido" });
    }
    return res.status(200).json({ received: true, perfilId: perfil.id });
  } catch (error) {
    try {
      const existing = await findPerfilByClerkId(clerkId);
      if (existing) {
        return res.status(200).json({ received: true, perfilId: existing.id, concurrent: true });
      }
    } catch {
      // reconciliação também falhou
    }
    req.log?.error({ err: error, clerkId }, "[clerk-webhook] falha ao sincronizar perfil");
    return res.status(500).json({ error: "sync_failed" });
  }
}

module.exports = { clerk };
