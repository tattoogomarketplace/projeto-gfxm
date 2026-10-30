const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

function isBlank(value) {
  return typeof value !== "string" || value.trim() === "";
}

const requiredEnvVars = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SIGNING_SECRET",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
];

const missingEnvVars = requiredEnvVars.filter((envVar) => isBlank(process.env[envVar]));

if (missingEnvVars.length > 0) {
  for (const envVar of missingEnvVars) {
    console.error(`[FATAL] Variável de ambiente obrigatória não encontrada: ${envVar}`);
  }
  process.exit(1);
}

function collectAllowedOrigins() {
  const origins = [
    "https://www.tattoogomk.com.br",
    "https://tattoogomk.com.br",
    "https://projeto-gfxm.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ];

  const extra = [process.env.FRONTEND_URL, process.env.CORS_ORIGIN, process.env.ALLOWED_ORIGINS]
    .filter(Boolean)
    .join(",");

  for (const item of extra.split(",")) {
    const origin = item.trim().replace(/\/$/, "");
    if (origin && !origins.includes(origin)) {
      origins.push(origin);
    }
  }

  return origins;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3001,
  logLevel: process.env.LOG_LEVEL || "info",
  geminiApiKey: process.env.GEMINI_API_KEY,
  receitaWsToken: process.env.RECEITA_WS_TOKEN,
  useMockCnpj: process.env.USE_MOCK_CNPJ === "true",
  databaseUrl: process.env.DATABASE_URL,
  allowedOrigins: collectAllowedOrigins(),
};
