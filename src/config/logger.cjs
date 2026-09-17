const pino = require("pino");
const { nodeEnv, logLevel } = require("./env.cjs");

const logger = pino({
  level: logLevel,
  redact: {
    paths: ["req.headers.authorization", "body.imagem_base64", "imagem_base64", "req.body.mensagem"],
    censor: "[REDACTED]",
  },
  transport: nodeEnv !== "production" ? { target: "pino-pretty" } : undefined,
});

module.exports = { logger };
