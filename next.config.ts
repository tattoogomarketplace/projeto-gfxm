import type { NextConfig } from "next";

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
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3001/api/:path*',
        },
      ],
    };
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
    fallbacks: { document: '/offline.html' },
    workboxOptions: {
      skipWaiting: true,
      clientsClaim: true,
    },
  });
  module.exports = withPWA(nextConfig);
}

