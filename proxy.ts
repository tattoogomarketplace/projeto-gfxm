import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { enforceApiRateLimit } from '@/lib/security/rate-limit';

const LOGIN_PATH = '/login';
const SIGN_UP_PATH = '/register';
const POST_AUTH_PATH = '/dashboard';

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/register(.*)',
  '/forgot-password(.*)',
  '/termos(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/session-tasks(.*)',
  '/__clerk(.*)',
]);

const isAuthSurface = createRouteMatcher([
  '/',
  '/login(.*)',
  '/register(.*)',
  '/forgot-password(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

const isIgnoredStaticAsset = createRouteMatcher([
  '/manifest.json',
  '/manifest.webmanifest',
  '/site.webmanifest',
  '/sw.js',
  '/workbox-(.*)',
  '/worker-(.*)',
  '/fallback-(.*)',
  '/favicon.ico',
  '/favicon-(.*)',
  '/icons/(.*)',
  '/apple-touch-icon.png',
  '/apple-touch-icon(.*)',
  '/android-chrome-(.*)',
  '/icon-(.*)',
  '/icon.svg',
  '/offline.html',
  '/robots.txt',
  '/sitemap.xml',
  '/opengraph-image.png',
  '/twitter-image.png',
]);

function isPlatformPath(pathname: string): boolean {
  if (pathname === '/api' || pathname.startsWith('/api/')) return true;
  if (pathname === '/trpc' || pathname.startsWith('/trpc/')) return true;
  if (pathname === '/_next' || pathname.startsWith('/_next/')) return true;
  if (pathname === '/__clerk' || pathname.startsWith('/__clerk/')) return true;
  if (
    pathname === '/manifest.json' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/site.webmanifest' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico' ||
    pathname === '/apple-touch-icon.png' ||
    pathname === '/icon.svg' ||
    pathname === '/offline.html' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/opengraph-image.png' ||
    pathname === '/twitter-image.png'
  ) {
    return true;
  }
  if (
    pathname.startsWith('/workbox-') ||
    pathname.startsWith('/worker-') ||
    pathname.startsWith('/fallback-') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/apple-touch-icon') ||
    pathname.startsWith('/android-chrome-') ||
    pathname.startsWith('/favicon-') ||
    pathname.startsWith('/icon-')
  ) {
    return true;
  }
  return /\.(?:css|js|mjs|cjs|map|json|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|csv|zip|webmanifest|mp3)$/i.test(
    pathname
  );
}

function nextWithPathname(req: Request, pathname: string) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

const clerkHandler = clerkMiddleware(
  async (auth, req) => {
    const { pathname } = req.nextUrl;

    if (isIgnoredStaticAsset(req)) {
      return nextWithPathname(req, pathname);
    }

    const limited = await enforceApiRateLimit(req);
    if (limited) return limited;

    if (isPlatformPath(pathname)) {
      return nextWithPathname(req, pathname);
    }

    const { userId } = await auth({ treatPendingAsSignedOut: false });

    if (userId && isAuthSurface(req)) {
      return NextResponse.redirect(new URL(POST_AUTH_PATH, req.url));
    }

    if (!isPublicRoute(req) && !userId) {
      return NextResponse.redirect(new URL(LOGIN_PATH, req.url));
    }

    return nextWithPathname(req, pathname);
  },
  {
    signInUrl: LOGIN_PATH,
    signUpUrl: SIGN_UP_PATH,
  }
);

const TURNSTILE_CONNECT_SOURCES = ['data:', 'blob:'] as const;
const TURNSTILE_WORKER_SOURCES = ["'self'", 'blob:', 'data:'] as const;

function cspDirectiveName(part: string): string {
  return part.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? '';
}

function ensureCspSources(policy: string, directive: string, sources: readonly string[]): string {
  const parts = policy
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  let found = false;
  const next = parts.map((part) => {
    if (cspDirectiveName(part) !== directive) return part;
    found = true;
    const tokens = part.split(/\s+/);
    const existing = new Set(tokens);
    const missing = sources.filter((source) => !existing.has(source));
    if (missing.length === 0) return part;
    return [tokens[0], ...missing, ...tokens.slice(1)].join(' ');
  });
  if (!found) {
    next.push([directive, ...sources].join(' '));
  }
  return next.join('; ');
}

function patchTurnstileCsp(policy: string): string {
  return ensureCspSources(
    ensureCspSources(policy, 'connect-src', TURNSTILE_CONNECT_SOURCES),
    'worker-src',
    TURNSTILE_WORKER_SOURCES
  );
}

function stripForeignCsp(res: Response) {
  const policies: string[] = [];
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'content-security-policy') {
      policies.push(value);
    }
  });
  res.headers.delete('Content-Security-Policy');
  res.headers.delete('Content-Security-Policy-Report-Only');
  for (const value of policies) {
    res.headers.append('Content-Security-Policy', patchTurnstileCsp(value));
  }
}

function neutralizeCrossOriginIsolation(res: Response) {
  res.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
}

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const result = clerkHandler(req, event);
  return Promise.resolve(result).then((res) => {
    if (res) {
      stripForeignCsp(res);
      neutralizeCrossOriginIsolation(res);
    }
    return res;
  });
}

export const config = {
  matcher: [
    '/((?!_next|favicon\\.ico|manifest\\.json|manifest\\.webmanifest|site\\.webmanifest|sw\\.js|workbox-|worker-|fallback-|icons/|apple-touch-icon|android-chrome-|robots\\.txt|sitemap\\.xml|opengraph-image|twitter-image|[^?]*\\.(?:html?|css|js|jpe?g|webp|avif|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp3|json|txt|xml)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
