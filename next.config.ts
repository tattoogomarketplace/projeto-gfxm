import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("./src/config/env.cjs");

const isDev = process.env.NODE_ENV === 'development';

const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';
const TURNSTILE_WSS_ORIGIN = 'wss://challenges.cloudflare.com';
const CLERK_FRONTEND_API = 'https://clerk.tattoogomk.com.br';
const CLERK_SCRIPT_ORIGINS = [
  CLERK_FRONTEND_API,
  'https://*.clerk.accounts.dev',
  'https://*.clerk.com',
  'https://clerk.com',
  'https://*.clerk.services',
];
// Clerk abre iframes/scripts de proteção contra abuso e fraude em
// `*.protect.clerk.com`. O `:*` no connect-src é obrigatório: esses hosts
// também respondem fora da porta 443 e um source sem porta casa só com 443.
const CLERK_PROTECT_ORIGINS = ['https://*.protect.clerk.com'];
const CLERK_CONNECT_ORIGINS = [
  ...CLERK_SCRIPT_ORIGINS,
  'https://*.protect.clerk.com:*',
  'https://clerk-telemetry.com',
  'https://*.clerk-telemetry.com',
  'https://img.clerk.com',
];
const TURNSTILE_SCRIPT_ORIGINS = [TURNSTILE_ORIGIN, 'https://*.challenges.cloudflare.com'];

function buildDirective(name: string, ...sources: Array<string | false | null | undefined>) {
  return [name, ...sources.filter(Boolean)].join(' ');
}

const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-eval' is required in production too: Clerk + Turnstile compile
  // challenge workers via eval/new Function. Trade-off: a successful XSS can
  // eval attacker code. Compensated by object-src 'none', strict form-action,
  // and Turnstile on auth surfaces. Do not gate this on isDev.
  buildDirective(
    'script-src',
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    ...TURNSTILE_SCRIPT_ORIGINS,
    ...CLERK_SCRIPT_ORIGINS,
    ...CLERK_PROTECT_ORIGINS
  ),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com https:",
  "font-src 'self' data:",
  "media-src 'self' blob: data:",
  buildDirective(
    'connect-src',
    "'self'",
    'data:',
    'blob:',
    ...TURNSTILE_SCRIPT_ORIGINS,
    'https://*.cloudflare.com',
    TURNSTILE_WSS_ORIGIN,
    'wss://*.challenges.cloudflare.com',
    'wss://*.cloudflare.com',
    ...CLERK_CONNECT_ORIGINS,
    'https:',
    'wss:',
    isDev ? 'ws:' : null
  ),
  buildDirective(
    'frame-src',
    "'self'",
    'data:',
    'blob:',
    ...TURNSTILE_SCRIPT_ORIGINS,
    ...CLERK_SCRIPT_ORIGINS,
    ...CLERK_PROTECT_ORIGINS
  ),
  buildDirective(
    'child-src',
    "'self'",
    'blob:',
    'data:',
    ...TURNSTILE_SCRIPT_ORIGINS,
    ...CLERK_SCRIPT_ORIGINS,
    ...CLERK_PROTECT_ORIGINS
  ),
  buildDirective(
    'worker-src',
    "'self'",
    'blob:',
    'data:',
    ...TURNSTILE_SCRIPT_ORIGINS,
    ...CLERK_SCRIPT_ORIGINS,
    ...CLERK_PROTECT_ORIGINS
  ),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  'upgrade-insecure-requests',
].join('; ');

const nextConfig: NextConfig = {
    reactStrictMode: false,
    // Cloud-agnostic Node runtime (Render/Docker/Fly/K8s). NOT static export:
    // Clerk middleware, RSC auth(), Server Actions, Prisma and /api routes
    // all require a Node server. `out/` is incompatible with this app.
    output: 'standalone',
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
    const expressOrigin = (process.env.EXPRESS_URL || 'http://localhost:3001').replace(
      /\/$/,
      ''
    );
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source: '/api/:path*',
          destination: `${expressOrigin}/api/:path*`,
        },
      ],
    };
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // SAMEORIGIN matches frame-ancestors 'self'. .cursorrules item 8 asked
          // for DENY; this task requires 'self'/SAMEORIGIN so Clerk/Turnstile
          // same-origin frames are not in conflict with XFO.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
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
  // Option A: next-pwa stays disabled so it cannot overwrite public/sw.js.
  // The custom SW in public/sw.js (CACHE_VERSION tattoogo-mk-v4) is the only
  // worker. cacheStartUrl/dynamicStartUrl false prevents Workbox from
  // precaching / with a stale CSP if this plugin is re-enabled.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withPWA = require('@ducanh2912/next-pwa').default({
    dest: 'public',
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: false,
    reloadOnOnline: true,
    disable: true,
    cacheStartUrl: false,
    dynamicStartUrl: false,
    fallbacks: { document: '/offline.html' },
    extendDefaultRuntimeCaching: true,
    workboxOptions: {
      skipWaiting: true,
      clientsClaim: true,
      cleanupOutdatedCaches: true,
      navigateFallbackDenylist: [
        /^\/register/,
        /^\/login/,
        /^\/forgot-password/,
        /^\/sign-in/,
        /^\/sign-up/,
        /^\/api\//,
        /^\/__clerk/,
        /clerk\.accounts\.dev/,
        /clerk\.services/,
        /clerk\.com/,
        /challenges\.cloudflare\.com/,
      ],
      runtimeCaching: [
        {
          urlPattern: /\/(login|register|forgot-password|sign-in|sign-up|__clerk)(\/.*)?$/,
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
        {
          urlPattern: /^https:\/\/challenges\.cloudflare\.com\/.*/i,
          handler: 'NetworkOnly',
        },
      ],
    },
  });
  module.exports = withPWA(nextConfig);
}

