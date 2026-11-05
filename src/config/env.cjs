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

function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function hostnameOf(origin) {
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return "";
  }
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

  const extra = [
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
    process.env.ALLOWED_ORIGINS,
    process.env.CLOUDFLARE_PAGES_DOMAIN,
  ]
    .filter(Boolean)
    .join(",");

  for (const item of extra.split(",")) {
    const origin = normalizeOrigin(item);
    if (!origin) continue;
    if (origin.includes("://")) {
      if (!origins.includes(origin)) origins.push(origin);
      continue;
    }
    const asHttps = `https://${origin.replace(/^\./, "")}`;
    if (!origins.includes(asHttps)) origins.push(asHttps);
  }

  return origins;
}

const allowedOrigins = collectAllowedOrigins();

function isCloudflarePagesOrigin(origin) {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    return hostname === "pages.dev" || hostname.endsWith(".pages.dev");
  } catch {
    return false;
  }
}

function matchesConfiguredCloudflareDomain(origin) {
  const configured = normalizeOrigin(process.env.CLOUDFLARE_PAGES_DOMAIN || "");
  if (!configured) return false;

  let configuredHost = configured;
  try {
    configuredHost = configured.includes("://")
      ? new URL(configured).hostname
      : configured.replace(/^\./, "");
  } catch {
    configuredHost = configured.replace(/^https?:\/\//i, "").replace(/^\./, "");
  }
  configuredHost = String(configuredHost || "").toLowerCase();
  if (!configuredHost) return false;

  const hostname = hostnameOf(origin);
  if (!hostname) return false;
  return hostname === configuredHost || hostname.endsWith(`.${configuredHost}`);
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (allowedOrigins.includes(normalized)) return true;
  if (isCloudflarePagesOrigin(normalized)) return true;
  if (matchesConfiguredCloudflareDomain(normalized)) return true;
  return false;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3001,
  logLevel: process.env.LOG_LEVEL || "info",
  geminiApiKey: process.env.GEMINI_API_KEY,
  receitaWsToken: process.env.RECEITA_WS_TOKEN,
  databaseUrl: process.env.DATABASE_URL,
  allowedOrigins,
  isAllowedOrigin,
};
