import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const LOGIN_PATH = '/login';
const SIGN_UP_PATH = '/register';

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

function isPlatformPath(pathname: string): boolean {
  if (pathname === '/api' || pathname.startsWith('/api/')) return true;
  if (pathname === '/trpc' || pathname.startsWith('/trpc/')) return true;
  if (pathname === '/_next' || pathname.startsWith('/_next/')) return true;
  if (pathname === '/__clerk' || pathname.startsWith('/__clerk/')) return true;
  return /\.(?:css|js|mjs|cjs|map|json|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|csv|zip|webmanifest|mp3)$/i.test(
    pathname
  );
}

export default clerkMiddleware(
  async (auth, req) => {
    const { pathname } = req.nextUrl;

    if (isPlatformPath(pathname)) {
      return NextResponse.next();
    }

    if (!isPublicRoute(req)) {
      await auth.protect({ unauthenticatedUrl: LOGIN_PATH });
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-pathname', pathname);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  },
  {
    signInUrl: LOGIN_PATH,
    signUpUrl: SIGN_UP_PATH,
  }
);

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|avif|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp3|json)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
