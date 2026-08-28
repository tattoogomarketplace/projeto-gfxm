import type { NextConfig } from "next";

// Trava de segurança: impede build sem as variáveis críticas exigidas pelo protocolo de segurança
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.GEMINI_API_KEY) {
  throw new Error("❌ FATAL: Variáveis de infraestrutura ausentes. Build abortado.");
}

// Configuração PWA (Otimização para Offline)
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
    turbopack: {},
  allowedDevOrigins: ['localhost:3000', '192.168.0.203:3000', '192.168.0.203'],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);

