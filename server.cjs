/**
 * =========================================================================
 * TATTOOGO MK - NÚCLEO SUPREMO DE BACK-END E COMPLIANCE
 * Etapa 2: bootstrap Clean Architecture (Prisma + módulos em /src)
 * A lógica de rotas, middlewares e serviços vive em src/.
 * =========================================================================
 */

const { port } = require("./src/config/env.cjs");
const { app, logger } = require("./src/app.cjs");

const PORT = port || 3001;

app.listen(PORT, () => {
  logger.info(`TATTOOGO MK - NÚCLEO DE PRODUÇÃO RODANDO NA PORTA ${PORT}`);
});

module.exports = { app };
