const cors = require("cors");
const helmet = require("helmet");
const { isAllowedOrigin } = require("../config/env.cjs");

const corsOptions = {
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
  optionsSuccessStatus: 204,
};

function applySecurity(app) {
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: { action: "deny" },
      noSniff: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      hsts: {
        maxAge: 63072000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );
  app.use(cors(corsOptions));
}

module.exports = { applySecurity, corsOptions };
