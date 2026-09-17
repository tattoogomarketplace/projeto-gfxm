const express = require("express");
const path = require("path");
const hpp = require("hpp");
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
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: "10mb" }));
app.use(hpp());
app.use(sanitizeRequest);
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/api/", globalLimiter);
app.use("/api", apiRoutes);
app.use(errorHandler);

module.exports = { app, logger };
