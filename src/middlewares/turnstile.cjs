const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 8000;

const TOKEN_BODY_FIELDS = ["turnstileToken", "cf-turnstile-response"];
const TOKEN_HEADER_FIELDS = ["x-turnstile-token", "cf-turnstile-response"];

function isTurnstileConfigured() {
  return Boolean((process.env.TURNSTILE_SECRET_KEY || "").trim());
}

function resolveClientIp(req) {
  const direct = req.headers["cf-connecting-ip"] || req.headers["x-real-ip"];
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const forwarded = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof value === "string" && value.trim()) {
    return value.split(",")[0].trim();
  }

  return typeof req.ip === "string" && req.ip ? req.ip : undefined;
}

function extractTurnstileToken(req) {
  for (const field of TOKEN_HEADER_FIELDS) {
    const header = req.headers[field];
    const value = Array.isArray(header) ? header[0] : header;
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  for (const field of TOKEN_BODY_FIELDS) {
    const value = body[field];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

async function verifyTurnstileToken(token, remoteIp) {
  const secret = (process.env.TURNSTILE_SECRET_KEY || "").trim();
  if (!secret) {
    return { configured: false, success: true, errorCodes: [] };
  }

  const response = typeof token === "string" ? token.trim() : "";
  if (!response) {
    return { configured: true, success: false, errorCodes: ["missing-input-response"] };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const payload = new URLSearchParams({ secret, response });
    if (remoteIp) payload.set("remoteip", remoteIp);

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.toString(),
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) || {};
    return {
      configured: true,
      success: Boolean(data.success),
      errorCodes: Array.isArray(data["error-codes"]) ? data["error-codes"] : [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { configured: true, success: false, errorCodes: ["internal-error"], message };
  } finally {
    clearTimeout(timeout);
  }
}

async function requireTurnstile(req, res, next) {
  const remoteIp = resolveClientIp(req);
  const result = await verifyTurnstileToken(extractTurnstileToken(req), remoteIp);

  if (result.configured && !result.success) {
    const context = { errorCodes: result.errorCodes, ip: remoteIp };
    if (req.log && typeof req.log.warn === "function") {
      req.log.warn(context, "Turnstile bloqueou requisição anti-bot");
    } else {
      console.warn("[turnstile] requisição bloqueada", context);
    }

    return res.status(403).json({
      sucesso: false,
      erro: "Verificação anti-bot falhou. Atualize a página e tente novamente.",
      codigo: "TURNSTILE_REQUIRED",
    });
  }

  return next();
}

module.exports = {
  requireTurnstile,
  verifyTurnstileToken,
  isTurnstileConfigured,
  extractTurnstileToken,
  resolveClientIp,
};
