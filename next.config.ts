import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== 'production';

// Adicione aqui todos os domínios necessários para o seu app
const allowedConnectSrc = [
  "'self'",
  "https://jvtvscutqskmyzgczrew.supabase.co", // Seu Supabase
  "https://*.supabase.co",                    // Genérico para garantir
  "ws://localhost:*",                         // Necessário para o HMR do Next.js
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { 
            key: "Content-Security-Policy", 
            value: isDev 
              ? `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src ${allowedConnectSrc.join(' ')};` 
              : `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://jvtvscutqskmyzgczrew.supabase.co;` 
          },
        ],
      },
    ];
  },
};

export default nextConfig;
