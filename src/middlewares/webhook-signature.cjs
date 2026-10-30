const crypto = require("crypto");

/**
 * Verificação criptográfica de webhooks de pagamento (Zero-Trust).
 *
 * Sem uma assinatura válida, qualquer agente externo poderia forjar um evento
 * `payment.created` + `approved` e confirmar um agendamento sem pagamento.
 * Esta camada roda ANTES do controller: nada toca o Prisma se a assinatura
 * não for provada.
 *
 * Contrato aceito (HMAC-SHA256 sobre o corpo BRUTO da requisição):
 *   1. `x-webhook-signature: <hex>` ou `sha256=<hex>`
 *   2. `x-signature: ts=<unix>,v1=<hex>` (formato Mercado Pago)
 *
 * Quando `x-webhook-timestamp` / `ts` está presente, aplicamos janela de
 * tolerância para impedir replay de um evento capturado.
 *
 * Comportamento fail-closed: se o segredo não estiver configurado, a rota
 * recusa a requisição (503) em vez de aceitá-la sem verificação.
 */

const SIGNATURE_HEADERS = ["x-webhook-signature", "x-signature"];
const TIMESTAMP_HEADERS = ["x-webhook-timestamp", "x-request-timestamp"];
const DEFAULT_MAX_SKEW_SECONDS = 300;

function readHeader(req, names) {
  for (const name of names) {
    const value = req.headers[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function resolveSecret() {
  const secret =
    process.env.PAYMENT_WEBHOOK_SECRET || process.env.MERCADOPAGO_WEBHOOK_SECRET;
  return typeof secret === "string" ? secret.trim() : "";
}

/** Extrai `{ signature, timestamp }` de qualquer um dos formatos suportados. */
function parseSignature(rawSignature, req) {
  const headerTs = readHeader(req, TIMESTAMP_HEADERS);

  if (rawSignature.includes("ts=") || rawSignature.includes("v1=")) {
    const parts = rawSignature.split(",").reduce((acc, chunk) => {
      const [key, value] = chunk.split("=");
      if (key && value) acc[key.trim()] = value.trim();
      return acc;
    }, {});
    return {
      signature: (parts.v1 || "").replace(/^sha256=/i, ""),
      timestamp: headerTs || parts.ts || "",
    };
  }

  return {
    signature: rawSignature.replace(/^sha256=/i, ""),
    timestamp: headerTs,
  };
}

function timingSafeEqualHex(expectedHex, receivedHex) {
  if (!expectedHex || !receivedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");
  if (expected.length === 0 || expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

function isTimestampFresh(timestamp, maxSkewSeconds) {
  if (!timestamp) return true;
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed) || parsed <= 0) return false;
  const skew = Math.abs(Date.now() / 1000 - parsed);
  return skew <= maxSkewSeconds;
}

function resolveRawBody(req) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  if (typeof req.rawBody === "string") return Buffer.from(req.rawBody, "utf8");
  // Último recurso: reserializa o corpo já parseado. Só é seguro quando os
  // bytes originais não estão disponíveis; preferimos sempre `req.rawBody`.
  return Buffer.from(JSON.stringify(req.body ?? {}), "utf8");
}

function requireWebhookSignature(req, res, next) {
  const secret = resolveSecret();
  if (!secret) {
    const log = req.log && typeof req.log.error === "function" ? req.log : console;
    log.error(
      "[webhook] PAYMENT_WEBHOOK_SECRET ausente: recusando webhook (fail-closed)."
    );
    return res.status(503).json({
      sucesso: false,
      erro: "Webhook não configurado.",
      codigo: "WEBHOOK_NOT_CONFIGURED",
    });
  }

  const rawSignature = readHeader(req, SIGNATURE_HEADERS);
  if (!rawSignature) {
    return res.status(401).json({
      sucesso: false,
      erro: "Assinatura de webhook ausente.",
      codigo: "WEBHOOK_SIGNATURE_MISSING",
    });
  }

  const { signature, timestamp } = parseSignature(rawSignature, req);

  const maxSkew = Number(process.env.PAYMENT_WEBHOOK_MAX_SKEW_SECONDS) ||
    DEFAULT_MAX_SKEW_SECONDS;
  if (!isTimestampFresh(timestamp, maxSkew)) {
    return res.status(403).json({
      sucesso: false,
      erro: "Assinatura de webhook expirada.",
      codigo: "WEBHOOK_SIGNATURE_EXPIRED",
    });
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(resolveRawBody(req))
    .digest("hex");

  if (!timingSafeEqualHex(expected, signature)) {
    return res.status(401).json({
      sucesso: false,
      erro: "Assinatura de webhook inválida.",
      codigo: "WEBHOOK_SIGNATURE_INVALID",
    });
  }

  return next();
}

module.exports = {
  requireWebhookSignature,
  parseSignature,
  resolveRawBody,
  resolveSecret,
};
