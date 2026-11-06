const crypto = require("node:crypto");
const express = require("express");
const path = require("path");
const hpp = require("hpp");
const compression = require("compression");
const pinoHttp = require("pino-http");
const { logger } = require("./config/logger.cjs");
const { applySecurity } = require("./middlewares/security.cjs");
const { sanitizeRequest } = require("./middlewares/sanitize.cjs");
const { globalLimiter } = require("./middlewares/rate-limit.cjs");
const { errorHandler } = require("./middlewares/error-handler.cjs");
const apiRoutes = require("./routes/index.cjs");

require("./config/env.cjs");

const app = express();

applySecurity(app);
app.use(compression());
app.use(compression());
app.get("/", (req, res) => res.status(200).send("TattooGo Backend Online"));
app.use(
  pinoHttp({
    logger,
    genReqId(req) {
      const incoming = req.headers["x-request-id"];
      if (typeof incoming === "string" && incoming.trim()) {
        return incoming.trim();
      }
      if (Array.isArray(incoming) && incoming[0]) {
        return String(incoming[0]).trim();
      }
      return crypto.randomUUID();
    },
  })
);
app.use(
  express.json({
    limit: "10mb",
    // Preserva os bytes originais para a verificação HMAC dos webhooks de
    // pagamento. O JSON parseado nunca é usado como fonte da assinatura.
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(hpp());
app.use(sanitizeRequest);
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/api/", globalLimiter);
app.use("/api", apiRoutes);
app.use(errorHandler);

module.exports = { app, logger };
