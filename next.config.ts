import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
    turbopack: {},
    allowedDevOrigins: ['*.monkeycode-ai.live', '**.monkeycode-ai.live'],
    images: {
      minimumCacheTTL: 86400,
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
    aggressiveFrontEndNavCaching: false,
    reloadOnOnline: true,
    disable: false,
    fallbacks: { document: '/offline.html' },
    extendDefaultRuntimeCaching: true,
    workboxOptions: {
      skipWaiting: true,
      clientsClaim: true,
      navigateFallbackDenylist: [
        /^\/register/,
        /^\/login/,
        /^\/forgot-password/,
        /^\/sign-in/,
        /^\/sign-up/,
        /^\/api\//,
        /clerk\.accounts\.dev/,
        /clerk\.services/,
        /clerk\.com/,
      ],
      runtimeCaching: [
        {
          urlPattern: /\/(login|register|forgot-password|sign-in|sign-up)(\/.*)?$/,
          handler: 'NetworkOnly',
        },
        {
          urlPattern: /\/api\/.*/,
          handler: 'NetworkOnly',
        },
        {
          urlPattern: /^https?:\/\/([^/]+\.)?(clerk\.accounts\.dev|clerk\.services|clerk\.com)(\/.*)?$/,
          handler: 'NetworkOnly',
        },
      ],
    },
  });
  module.exports = withPWA(nextConfig);
}

