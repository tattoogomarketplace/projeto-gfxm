const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const requiredEnvVars = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "GEMINI_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "DATABASE_URL",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`[FATAL] Variável de ambiente obrigatória não encontrada: ${envVar}`);
    process.exit(1);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3001,
  logLevel: process.env.LOG_LEVEL || "info",
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  receitaWsToken: process.env.RECEITA_WS_TOKEN,
  useMockCnpj: process.env.USE_MOCK_CNPJ === "true",
  databaseUrl: process.env.DATABASE_URL,
};
