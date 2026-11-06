function requireSvixHeaders(req, res, next) {
  const id = req.headers["svix-id"];
  const timestamp = req.headers["svix-timestamp"];
  const signature = req.headers["svix-signature"];
  if (!id || !timestamp || !signature) {
    return res.status(400).json({ error: "assinatura_svix_ausente" });
  }
  return next();
}

function resolveRawBody(req) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  if (typeof req.rawBody === "string") return Buffer.from(req.rawBody, "utf8");
  return Buffer.from(JSON.stringify(req.body ?? {}), "utf8");
}

function verifyClerkSvix(req) {
  const signingSecret = (process.env.CLERK_WEBHOOK_SIGNING_SECRET || "").trim();
  if (!signingSecret) {
    const error = new Error("webhook_secret_missing");
    error.status = 500;
    throw error;
  }

  const { Webhook } = require("svix");
  const wh = new Webhook(signingSecret);
  return wh.verify(resolveRawBody(req).toString("utf8"), {
    "svix-id": String(req.headers["svix-id"] || ""),
    "svix-timestamp": String(req.headers["svix-timestamp"] || ""),
    "svix-signature": String(req.headers["svix-signature"] || ""),
  });
}

module.exports = { requireSvixHeaders, resolveRawBody, verifyClerkSvix };
