/**
 * =========================================================================
 * TATTOOGO MK - NÚCLEO SUPREMO DE BACK-END E COMPLIANCE
 * Etapa 3: bootstrap HTTP + Socket.io (chat Enviado/Entregue/Lido)
 * A lógica de rotas, middlewares e serviços vive em src/.
 * =========================================================================
 */

const http = require("http");
const { port } = require("./src/config/env.cjs");
const { app, logger } = require("./src/app.cjs");
const { attachRealtime } = require("./src/services/realtime.service.cjs");
const { expirarMutexVencidos } = require("./src/services/agendamento.service.cjs");

const PORT = port || 3001;
const server = http.createServer(app);

attachRealtime(server);

const MUTEX_SWEEP_MS = 60 * 1000;
const mutexSweep = setInterval(() => {
  expirarMutexVencidos().catch((err) => {
    logger.error({ err }, "Falha ao liberar slots com mutex expirado");
  });
}, MUTEX_SWEEP_MS);
if (typeof mutexSweep.unref === "function") mutexSweep.unref();

server.listen(PORT, () => {
  logger.info(`TATTOOGO MK - NÚCLEO DE PRODUÇÃO RODANDO NA PORTA ${PORT}`);
});

module.exports = { app, server };
