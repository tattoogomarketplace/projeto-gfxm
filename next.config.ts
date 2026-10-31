import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("./src/config/env.cjs");

const isDev = process.env.NODE_ENV === 'development';

const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';
const CLERK_FRONTEND_API = 'https://clerk.tattoogomk.com.br';
const CLERK_SCRIPT_ORIGINS = [
  CLERK_FRONTEND_API,
  'https://*.clerk.accounts.dev',
  'https://*.clerk.com',
  'https://clerk.com',
  'https://*.clerk.services',
].join(' ');

const contentSecurityPolicy = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline'",
    isDev ? "'unsafe-eval'" : null,
    TURNSTILE_ORIGIN,
    CLERK_SCRIPT_ORIGINS,
  ]
    .filter(Boolean)
    .join(' '),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self' data: blob: wss: https:",
    TURNSTILE_ORIGIN,
    CLERK_FRONTEND_API,
    'https://*.clerk.accounts.dev',
  ].join(' '),
  [
    "frame-src 'self'",
    TURNSTILE_ORIGIN,
    CLERK_SCRIPT_ORIGINS,
  ].join(' '),
  `child-src 'self' blob: ${TURNSTILE_ORIGIN}`,
  `worker-src 'self' blob: ${CLERK_FRONTEND_API}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
    turbopack: {},
    experimental: {
      staleTimes: {
        dynamic: 300,
        static: 180,
      },
    },
    allowedDevOrigins: ['*.monkeycode-ai.live', '**.monkeycode-ai.live'],
    images: {
      minimumCacheTTL: 86400,
      remotePatterns: [
        { protocol: 'https', hostname: 'images.unsplash.com' },
        { protocol: 'https', hostname: 'plus.unsplash.com' },
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
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
      {
        source: "/:file(apple-touch-icon.*|icon-.*|android-chrome-.*|opengraph-image.png|favicon-.*|manifest.json|site.webmanifest)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
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

