const rateLimit = require("express-rate-limit");

const RATE_LIMIT_MESSAGE = {
  sucesso: false,
  erro: "Muitas tentativas. Aguarde um momento e tente novamente.",
};

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { sucesso: false, erro: "Muitas requisições originadas deste IP. Bloqueio preventivo." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { sucesso: false, erro: "Muitas tentativas. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

const swarmLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
});

const cnpjLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
});

module.exports = { globalLimiter, authLimiter, swarmLimiter, cnpjLimiter };
