import type { NextConfig } from "next";

// Trava de segurança: impede build sem as variáveis críticas exigidas pelo protocolo de segurança
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.GEMINI_API_KEY) {
  throw new Error("❌ FATAL: Variáveis de infraestrutura ausentes. Build abortado.");
}

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
    turbopack: {},
    allowedDevOrigins: ['*.monkeycode-ai.live', '**.monkeycode-ai.live'],
    images: {
      minimumCacheTTL: 86400,
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '*.supabase.co',
          pathname: '/storage/v1/object/public/**',
        },
        {
          protocol: 'https',
          hostname: '*.supabase.in',
          pathname: '/storage/v1/object/public/**',
        },
      ],
    },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
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

if (isDev) {
  module.exports = nextConfig;
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withPWA = require('@ducanh2912/next-pwa').default({
    dest: 'public',
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    disable: false,
  });
  module.exports = withPWA(nextConfig);
}

