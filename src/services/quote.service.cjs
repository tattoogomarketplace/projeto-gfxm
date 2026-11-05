const { Prisma } = require("@prisma/client");
const { prisma } = require("./prisma.service.cjs");

const MAX_ESTIMATED_SIZE_LENGTH = 40;
const MAX_QUOTE_TOTAL = 999999.99;
const TENTATIVE_SLOT_MS = 14 * 24 * 60 * 60 * 1000;
const BODY_PARTS = new Set([
  "Braco",
  "Antebraco",
  "Ombro",
  "Peito",
  "Costas",
  "Costela",
  "Perna",
  "Coxa",
  "Panturrilha",
  "Pulso",
  "Mao",
  "Pescoco",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isUuid(value) {
  return UUID_RE.test(String(value || ""));
}

function parseChatId(value, field) {
  const id = String(value || "").trim();
  if (!isUuid(id)) throw httpError(400, `${field} inválido.`);
  return id;
}

function depositAmount(valorTotal) {
  const amount = typeof valorTotal === "number" && Number.isFinite(valorTotal) ? valorTotal : 0;
  return Number((amount * 0.25).toFixed(2));
}

function parseMoney(raw) {
  const trimmed = String(raw || "").trim().replace(/\s/g, "");
  if (!trimmed) return Number.NaN;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed.replace(/[^\d.]/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : Number.NaN;
}

function formatPriceRange(total) {
  return `R$ ${total.toFixed(2)}`;
}

function tentativeSlot(seed) {
  const slot = new Date(Date.now() + TENTATIVE_SLOT_MS);
  const offset = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 3600;
  slot.setSeconds(offset, 0);
  return slot;
}

function displayName(nome) {
  const trimmed = (nome ?? "").trim();
  return trimmed || "Cliente";
}

function composeQuoteMessage(bodyPart, estimatedSize) {
  return `Pedido de orçamento\nLocal: ${bodyPart}\nTamanho estimado: ${estimatedSize}`;
}

async function createQuoteRequest({ actorId, artistId: artistIdRaw, bodyPart, estimatedSize }) {
  const artistId = parseChatId(artistIdRaw, "artistId");
  if (!BODY_PARTS.has(bodyPart)) throw httpError(400, "Informe uma região válida.");
  if (!estimatedSize) throw httpError(400, "Informe o tamanho estimado.");
  if (String(estimatedSize).length > MAX_ESTIMATED_SIZE_LENGTH) {
    throw httpError(400, "Tamanho estimado inválido.");
  }
  if (actorId === artistId) {
    throw httpError(400, "Não é possível solicitar orçamento para si mesmo.");
  }

  const artist = await prisma.perfil.findFirst({
    where: { id: artistId, deleted_at: null, statusConta: "ATIVO", role: "tatuador" },
    select: { id: true },
  });
  if (!artist) throw httpError(404, "Artista não encontrado.");

  const created = await prisma.mensagemChat.create({
    data: {
      remetente_id: actorId,
      destinatario_id: artist.id,
      mensagem: composeQuoteMessage(bodyPart, estimatedSize),
      bloqueada: false,
      status: "enviado",
      categoria: "ORCAMENTO",
      body_part: bodyPart,
      estimated_size: estimatedSize,
      quote_status: "solicitado",
    },
    select: { id: true },
  });

  return { quoteId: created.id, chatId: created.id, artistId: artist.id };
}

async function getPendingArtistQuotes({ actorId, actorRole }) {
  if (actorRole !== "tatuador" && actorRole !== "estudio") {
    throw httpError(403, "Apenas artistas podem revisar orçamentos.");
  }

  const rows = await prisma.mensagemChat.findMany({
    where: {
      destinatario_id: actorId,
      deleted_at: null,
      bloqueada: false,
      categoria: { in: ["ORCAMENTO", "BUDGET"] },
      quote_status: "solicitado",
    },
    orderBy: { created_at: "desc" },
    take: 50,
    select: {
      id: true,
      remetente_id: true,
      mensagem: true,
      body_part: true,
      estimated_size: true,
      reference_image: true,
      price_range: true,
      quote_status: true,
      created_at: true,
      remetente: { select: { id: true, nome: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    clientId: row.remetente.id,
    clientName: displayName(row.remetente.nome),
    bodyPart: row.body_part,
    estimatedSize: row.estimated_size,
    referenceImage: row.reference_image,
    priceRange: row.price_range,
    message: row.mensagem,
    createdAt: row.created_at.toISOString(),
    quoteStatus: row.quote_status ?? "solicitado",
  }));
}

async function approveArtistQuote({ actorId, actorRole, quoteId: quoteIdRaw, totalValue: totalValueRaw }) {
  if (actorRole !== "tatuador" && actorRole !== "estudio") {
    throw httpError(403, "Apenas artistas podem aprovar orçamentos.");
  }

  const quoteId = parseChatId(quoteIdRaw, "quoteId");
  const totalValue =
    typeof totalValueRaw === "number"
      ? Number(totalValueRaw.toFixed(2))
      : parseMoney(String(totalValueRaw));

  if (!Number.isFinite(totalValue) || totalValue <= 0 || totalValue > MAX_QUOTE_TOTAL) {
    throw httpError(400, "Informe um valor total válido.");
  }

  const depositValue = depositAmount(totalValue);
  const priceRange = formatPriceRange(totalValue);

  const result = await prisma.$transaction(async (tx) => {
    const quote = await tx.mensagemChat.findFirst({
      where: {
        id: quoteId,
        destinatario_id: actorId,
        deleted_at: null,
        bloqueada: false,
        categoria: { in: ["ORCAMENTO", "BUDGET"] },
      },
      select: {
        id: true,
        remetente_id: true,
        body_part: true,
        estimated_size: true,
        reference_image: true,
        quote_status: true,
      },
    });
    if (!quote) throw httpError(404, "Orçamento não encontrado.");
    if (quote.quote_status !== "solicitado") {
      throw httpError(409, "Este orçamento já foi processado.");
    }

    const client = await tx.perfil.findFirst({
      where: { id: quote.remetente_id, deleted_at: null, statusConta: "ATIVO" },
      select: { id: true },
    });
    if (!client) throw httpError(404, "Cliente não encontrado.");

    const agendamento = await tx.agendamento.create({
      data: {
        cliente_id: client.id,
        tatuador_id: actorId,
        data_hora: tentativeSlot(quote.id),
        status: "aguardando_sinal",
        session_status: "AWAITING_PAYMENT",
        valor_total: new Prisma.Decimal(totalValue.toFixed(2)),
        valor_sinal: new Prisma.Decimal(depositValue.toFixed(2)),
        sinal_pago: false,
        extras: {
          create: [{ descricao: `Orçamento ${quote.id}`, valor: new Prisma.Decimal("0.00") }],
        },
      },
      select: { id: true },
    });

    await tx.mensagemChat.update({
      where: { id: quote.id },
      data: { quote_status: "enviado", price_range: priceRange },
    });

    const reply = [
      "Orçamento enviado",
      `Valor total: ${priceRange}`,
      `Sinal (25%): ${formatPriceRange(depositValue)}`,
    ].join("\n");

    await tx.mensagemChat.create({
      data: {
        remetente_id: actorId,
        destinatario_id: client.id,
        mensagem: reply,
        bloqueada: false,
        status: "enviado",
        categoria: "ORCAMENTO",
        body_part: quote.body_part,
        estimated_size: quote.estimated_size,
        reference_image: quote.reference_image,
        price_range: priceRange,
        quote_status: "enviado",
      },
    });

    return agendamento;
  });

  return { quoteId, agendamentoId: result.id, totalValue, depositValue };
}

async function createBudgetQuoteRequest({
  actorId,
  artistId: artistIdRaw,
  artworkId: artworkIdRaw,
  style,
  estimateRange,
  imageUrl,
}) {
  const artistId = parseChatId(artistIdRaw, "artistId");
  if (actorId === artistId) {
    throw httpError(400, "Não é possível solicitar orçamento para si mesmo.");
  }

  const artworkId = isUuid(String(artworkIdRaw || "").trim()) ? String(artworkIdRaw).trim() : "";
  const styleLabel = String(style || "").trim() || "arte";
  const range = String(estimateRange || "").trim();
  const image = String(imageUrl || "").trim();

  const lines = ["Pedido de orçamento via Estimativa Inteligente IA", `Estilo: ${styleLabel}`];
  if (range) lines.push(`Estimativa de mercado: ${range}`);
  if (artworkId) lines.push(`Referência: post ${artworkId}`);
  const mensagem = lines.join("\n");

  const artist = await prisma.perfil.findFirst({
    where: { id: artistId, deleted_at: null, statusConta: "ATIVO", role: "tatuador" },
    select: { id: true },
  });
  if (!artist) throw httpError(404, "Artista não encontrado.");

  let referenceImage = image || null;
  let bodyPart = null;
  if (artworkId) {
    const artwork = await prisma.portfolio.findFirst({
      where: { id: artworkId, deleted_at: null },
      select: { url_imagem: true, body_part: true },
    });
    if (artwork) {
      referenceImage = artwork.url_imagem || referenceImage;
      bodyPart = artwork.body_part || null;
    }
  }

  const created = await prisma.mensagemChat.create({
    data: {
      remetente_id: actorId,
      destinatario_id: artist.id,
      mensagem,
      bloqueada: false,
      status: "enviado",
      categoria: "ORCAMENTO",
      reference_image: referenceImage,
      body_part: bodyPart,
      price_range: range || null,
      quote_status: "solicitado",
    },
    select: { id: true },
  });

  return { quoteId: created.id, chatId: created.id, artistId: artist.id };
}

module.exports = {
  createQuoteRequest,
  getPendingArtistQuotes,
  approveArtistQuote,
  createBudgetQuoteRequest,
};
