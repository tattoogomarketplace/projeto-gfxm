const { prisma } = require("./prisma.service.cjs");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SESSION_SELECT = {
  id: true,
  cliente_id: true,
  tatuador_id: true,
  data_hora: true,
  status: true,
  valor_total: true,
  valor_sinal: true,
  sinal_pago: true,
  waiver_signed: true,
  session_status: true,
  cliente: { select: { id: true, nome: true, role: true } },
  tatuador: { select: { id: true, nome: true, role: true } },
};

function toMoney(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Number(value.toFixed(2));
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
}

function displayName(nome, fallback) {
  const trimmed = (nome ?? "").trim();
  return trimmed || fallback;
}

function toPeerRole(role) {
  if (role === "tatuador" || role === "estudio" || role === "cliente") return role;
  return "cliente";
}

function toPeer(row, fallbackId, fallbackRole) {
  return {
    id: row?.id || fallbackId,
    name: displayName(row?.nome, ""),
    role: toPeerRole(row?.role) || fallbackRole,
  };
}

function deriveSessionStatus(lifecycle, stored) {
  if (stored) return stored;
  if (lifecycle === "rascunho") return "ACTION_NEEDED";
  if (lifecycle === "aguardando_sinal") return "AWAITING_PAYMENT";
  if (lifecycle === "confirmado") return "CONFIRMED";
  if (lifecycle === "concluido") return "COMPLETED";
  return null;
}

function toUserSession(row) {
  const sessionStatus = deriveSessionStatus(row.status, row.session_status);
  if (!sessionStatus) return null;
  const totalValue = toMoney(row.valor_total);
  const depositValue = toMoney(row.valor_sinal) || Number((totalValue * 0.25).toFixed(2));
  return {
    id: row.id,
    clientId: row.cliente_id,
    artistId: row.tatuador_id,
    date: row.data_hora.toISOString(),
    totalValue,
    depositValue,
    depositPaid: Boolean(row.sinal_pago),
    waiverSigned: Boolean(row.waiver_signed),
    sessionStatus,
    lifecycleStatus: row.status,
    client: toPeer(row.cliente, row.cliente_id, "cliente"),
    artist: toPeer(row.tatuador, row.tatuador_id, "tatuador"),
  };
}

async function getUserSessions(userId) {
  const id = String(userId || "").trim();
  if (!id) return { userId: id, sessions: [] };
  if (!UUID_RE.test(id)) return { userId: id, sessions: [] };

  try {
    const rows = await prisma.agendamento.findMany({
      where: {
        deleted_at: null,
        status: { not: "cancelado" },
        OR: [{ cliente_id: id }, { tatuador_id: id }],
      },
      select: SESSION_SELECT,
      orderBy: { data_hora: "asc" },
    });
    const sessions = rows.map(toUserSession).filter(Boolean);
    sessions.sort((a, b) => a.date.localeCompare(b.date));
    return { userId: id, sessions };
  } catch {
    return { userId: id, sessions: [] };
  }
}

module.exports = { getUserSessions };
