const { Prisma } = require("@prisma/client");
const { prisma } = require("./prisma.service.cjs");
const { redis } = require("./cache.service.cjs");
const { listUpcomingSlots, normalizeWorkingHours } = require("../utils/working-hours.cjs");

const MUTEX_MINUTES = 10;
const MUTEX_TTL_SECONDS = MUTEX_MINUTES * 60;
const MAX_SERIALIZATION_RETRIES = 3;
const ACTIVE_BOOKING_STATUSES = ["aguardando_sinal", "confirmado"];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function httpError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function extraLabel(noteId) {
  return `Flash Note ${noteId}`;
}

function formatPriceRange(total) {
  return `R$ ${total.toFixed(2)}`;
}

function depositAmount(valorTotal) {
  const amount = typeof valorTotal === "number" && Number.isFinite(valorTotal) ? valorTotal : 0;
  return Number((amount * 0.25).toFixed(2));
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value && typeof value === "object" && typeof value.toNumber === "function") {
    const parsed = Number(value.toNumber());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function resolveSalePrice(price, discountPercentage) {
  const original = toNumber(price);
  if (original == null || original <= 0 || original > 999999.99) return null;
  const originalPrice = Number(original.toFixed(2));
  const discountRaw = toNumber(discountPercentage);
  const discountPercent =
    discountRaw != null && Number.isInteger(discountRaw) && discountRaw > 0 && discountRaw < 100
      ? discountRaw
      : null;
  const salePrice =
    discountPercent != null
      ? Number((originalPrice * (1 - discountPercent / 100)).toFixed(2))
      : originalPrice;
  if (!(salePrice > 0)) return null;
  return { originalPrice, discountPercent, salePrice };
}

function normalizeSlot(value) {
  const slot = new Date(value);
  slot.setSeconds(0, 0);
  return slot;
}

function fallbackSlot() {
  const slot = new Date(Date.now() + 24 * 60 * 60 * 1000);
  slot.setMinutes(0, 0, 0);
  slot.setHours(slot.getHours() + 1);
  return slot;
}

async function acquireNoteLock(noteId) {
  if (!redis) return null;
  try {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const acquired = await redis.set(`mutex:flash-note:${noteId}`, token, {
      nx: true,
      ex: MUTEX_TTL_SECONDS,
    });
    if (acquired === "OK") return token;
    return "busy";
  } catch {
    return null;
  }
}

async function releaseNoteLock(noteId, token) {
  if (!token) return;
  try {
    const key = `mutex:flash-note:${noteId}`;
    const current = await redis.get(key);
    if (current === token) await redis.del(key);
  } catch {
    return;
  }
}

async function pickArtistSlot(tx, artistId) {
  const scheduleRow = await tx.artistSchedule.findUnique({
    where: { tatuadorId: artistId },
    select: { scheduleJson: true },
  });

  const candidates = scheduleRow?.scheduleJson
    ? listUpcomingSlots(normalizeWorkingHours(scheduleRow.scheduleJson), {
        days: 14,
        intervalMinutes: 60,
        limit: 24,
      }).map((iso) => normalizeSlot(new Date(iso)))
    : [];

  for (const slot of candidates) {
    const taken = await tx.agendamento.findFirst({
      where: {
        tatuador_id: artistId,
        data_hora: slot,
        deleted_at: null,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
      select: { id: true },
    });
    if (!taken) return slot;
  }

  const fallback = fallbackSlot();
  const takenFallback = await tx.agendamento.findFirst({
    where: {
      tatuador_id: artistId,
      data_hora: fallback,
      deleted_at: null,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
    },
    select: { id: true },
  });
  if (takenFallback) {
    throw httpError(409, "Nenhum horario disponivel para esta oferta.", "NO_SLOT");
  }
  return fallback;
}

async function bookFlashNoteOnce({ noteId, actor }) {
  if (actor.role !== "cliente") {
    throw httpError(403, "Apenas clientes podem garantir este horario.", "FORBIDDEN");
  }

  const priced = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${noteId}::text))
      `;

      const noteRows = await tx.$queryRaw`
        SELECT id, user_id, content, ativa, expires_at, price, discount_percentage
        FROM flash_notes
        WHERE id = ${noteId}::uuid
        FOR UPDATE
      `;
      const note = noteRows[0];
      if (!note) throw httpError(404, "Flash Note nao encontrada.", "NOT_FOUND");

      const client = await tx.perfil.findFirst({
        where: { id: actor.id, deleted_at: null, statusConta: "ATIVO" },
        select: { id: true },
      });
      if (!client) throw httpError(403, "Perfil indisponivel.", "FORBIDDEN");

      const existing = await tx.agendamento.findFirst({
        where: { flashNoteId: note.id, deleted_at: null },
        select: {
          id: true,
          tatuador_id: true,
          data_hora: true,
          valor_total: true,
          valor_sinal: true,
          cliente_id: true,
        },
      });
      if (existing) {
        if (existing.cliente_id !== client.id) {
          throw httpError(409, "Esta Flash Note ja foi garantida ou expirou.", "CONSUMED");
        }
        return {
          alreadyProcessed: true,
          bookingId: existing.id,
          artistId: existing.tatuador_id,
          slot: existing.data_hora,
          totalAmount: Number(existing.valor_total),
          depositValue: Number(existing.valor_sinal),
          quoteId: existing.id,
        };
      }

      const now = new Date();
      if (!note.ativa || new Date(note.expires_at).getTime() <= now.getTime()) {
        throw httpError(409, "Esta Flash Note ja foi garantida ou expirou.", "CONSUMED");
      }
      if (note.user_id === actor.id) {
        throw httpError(403, "Nao e possivel garantir o proprio horario.", "SELF");
      }

      const artist = await tx.perfil.findFirst({
        where: {
          id: note.user_id,
          deleted_at: null,
          statusConta: "ATIVO",
          role: "tatuador",
          kyc_status: "aprovado",
          agenda_bloqueada: false,
        },
        select: { id: true },
      });
      if (!artist) {
        throw httpError(403, "Artista indisponivel para agendamento.", "FORBIDDEN");
      }

      const pricing = resolveSalePrice(note.price, note.discount_percentage);
      if (!pricing) {
        throw httpError(400, "Esta oferta nao possui valor valido para reserva.", "INVALID_PRICE");
      }

      const consumed = await tx.flashNote.updateMany({
        where: { id: note.id, ativa: true, expiresAt: { gt: now } },
        data: { ativa: false },
      });
      if (consumed.count !== 1) {
        throw httpError(409, "Esta Flash Note ja foi garantida ou expirou.", "CONSUMED");
      }

      const slot = await pickArtistSlot(tx, artist.id);
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${artist.id}::text),
          hashtext(${slot.toISOString()}::text)
        )
      `;

      const conflito = await tx.agendamento.findFirst({
        where: {
          tatuador_id: artist.id,
          data_hora: slot,
          deleted_at: null,
          status: { in: [...ACTIVE_BOOKING_STATUSES] },
        },
        select: { id: true },
      });
      if (conflito) {
        throw httpError(409, "Horario em mutex. Tente novamente.", "CONFLICT");
      }

      const totalAmount = pricing.salePrice;
      const depositValue = depositAmount(totalAmount);
      const mutexExpiraEm = new Date(Date.now() + MUTEX_MINUTES * 60 * 1000);
      const priceRange = formatPriceRange(totalAmount);

      const agendamento = await tx.agendamento.create({
        data: {
          cliente_id: client.id,
          tatuador_id: artist.id,
          data_hora: slot,
          status: "aguardando_sinal",
          session_status: "AWAITING_PAYMENT",
          valor_total: new Prisma.Decimal(totalAmount.toFixed(2)),
          valor_sinal: new Prisma.Decimal(depositValue.toFixed(2)),
          sinal_pago: false,
          mutex_expira_em: mutexExpiraEm,
          flashNoteId: note.id,
          extras: {
            create: [
              {
                descricao: extraLabel(note.id),
                valor: new Prisma.Decimal(totalAmount.toFixed(2)),
              },
            ],
          },
        },
        select: { id: true },
      });

      const quote = await tx.mensagemChat.create({
        data: {
          remetente_id: client.id,
          destinatario_id: artist.id,
          mensagem: [
            "Flash Note reservada",
            String(note.content || "").trim(),
            `Valor total: ${priceRange}`,
            `Sinal (25%): ${formatPriceRange(depositValue)}`,
          ].join("\n"),
          bloqueada: false,
          status: "enviado",
          categoria: "ORCAMENTO",
          price_range: priceRange,
          quote_status: "agendado",
        },
        select: { id: true },
      });

      return {
        alreadyProcessed: false,
        bookingId: agendamento.id,
        artistId: artist.id,
        slot,
        totalAmount,
        depositValue,
        quoteId: quote.id,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 15000,
    }
  );

  return {
    success: true,
    data: {
      bookingId: priced.bookingId,
      quoteId: priced.quoteId,
      artistId: priced.artistId,
      totalAmount: priced.totalAmount,
      depositAmount: priced.depositValue,
      slot: priced.slot instanceof Date ? priced.slot.toISOString() : new Date(priced.slot).toISOString(),
      alreadyProcessed: priced.alreadyProcessed,
    },
  };
}

async function bookFlashNote({ actor, noteId: noteIdRaw }) {
  const noteId = String(noteIdRaw || "").trim();
  if (!UUID_RE.test(noteId)) {
    throw httpError(404, "Flash Note invalida.", "NOT_FOUND");
  }

  let lockToken = null;
  try {
    const lock = await acquireNoteLock(noteId);
    if (lock === "busy") {
      throw httpError(409, "Esta oferta ja esta sendo garantida. Aguarde um instante.", "CONFLICT");
    }
    lockToken = lock;

    let lastError;
    for (let attempt = 0; attempt < MAX_SERIALIZATION_RETRIES; attempt += 1) {
      try {
        return await bookFlashNoteOnce({ noteId, actor });
      } catch (error) {
        lastError = error;
        if (error && error.code && error.status) throw error;
        const retryable = error && (error.code === "P2034" || error.code === "P2028");
        if (retryable && attempt < MAX_SERIALIZATION_RETRIES - 1) continue;
        if (error && (error.code === "P2002" || error.code === "P2034" || error.code === "P2028")) {
          throw httpError(409, error.message || "Esta oferta ja foi garantida por outro cliente.", "CONFLICT");
        }
        throw error;
      }
    }
    throw lastError;
  } finally {
    await releaseNoteLock(noteId, lockToken);
  }
}

module.exports = { bookFlashNote };
