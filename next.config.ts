import type { NextConfig } from "next";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.GEMINI_API_KEY) {
  throw new Error("FATAL: Variáveis de infraestrutura ausentes. Build abortado.");
}

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  turbopack: {},
  allowedDevOrigins: ["*.monkeycode-ai.live", "**.monkeycode-ai.live"],
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
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
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

const pwaOptions = {
  dest: "public",
  disable: isDev,
  register: false,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  fallbacks: { document: "/offline.html" },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /\/api\/catalogo\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "tattoogo-catalogo-etapa3",
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 },
        },
      },
      {
        urlPattern: /\/api\/chat\/(historico|lido)/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "tattoogo-chat-etapa3",
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 48, maxAgeSeconds: 60 * 30 },
        },
      },
      {
        urlPattern: /\/api\/portfolio\/like\/.*/i,
        handler: "NetworkOnly",
        options: { cacheName: "tattoogo-likes" },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|webp|avif|svg)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "tattoogo-images",
          expiration: { maxEntries: 160, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
      {
        urlPattern: /\/splash\/.*\.png$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "tattoogo-splash",
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
    ],
  },
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("@ducanh2912/next-pwa").default(pwaOptions);

export default withPWA(nextConfig);
