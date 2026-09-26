const cors = require("cors");
const helmet = require("helmet");

function applySecurity(app) {
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: { action: "deny" },
      noSniff: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );
  app.use(cors({ origin: true, credentials: true }));
}

module.exports = { applySecurity };
