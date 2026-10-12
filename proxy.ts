import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { USERNAME_SETUP_PATH } from '@/lib/utils/auth-redirect';

const CLERK_WEBHOOK_PATH = '/api/webhooks/clerk';
const AUTH_PAGES = ['/login', '/register', '/forgot-password'];

/**
 * Superfícies de ESCRITA do @username (Fase 12 — Etapa 1).
 *
 * O degrau de identidade é circular por natureza: o gatilho do handle exige um
 * `@username` para liberar a navegação, mas a própria tela que o grava ainda
 * não o possui. Estas rotas precisam permanecer acessíveis a um usuário
 * AUTENTICADO nesse estado — o Server Action (POST para a rota de setup) e a
 * Route Handler de identidade (`GET/POST/PUT /api/user/username`).
 */
const USERNAME_WRITE_PATHS = [USERNAME_SETUP_PATH, '/api/user/username'] as const;

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // O webhook do Clerk é autenticado por assinatura Svix na própria Route
  // Handler, portanto não participa do fluxo de sessão do middleware.
  if (pathname === CLERK_WEBHOOK_PATH) return;

  // Bypass explícito do gatekeeper para a escrita do @username. Reafirma o
  // `x-pathname` (consumido pelo `UsernameGate` do layout) e segue sem
  // qualquer proteção/redirect que intercepte a gravação antes do handler.
  const isUsernameWritePath = USERNAME_WRITE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  if (isUsernameWritePath) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-pathname', pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Clerk hosted paths flash during post-OTP limbo; catch-all to app routes.
  const isSignInPath = pathname === '/sign-in' || pathname.startsWith('/sign-in/');
  const isSignUpPath = pathname === '/sign-up' || pathname.startsWith('/sign-up/');
  if (isSignInPath) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  if (isSignUpPath) {
    return NextResponse.redirect(new URL('/dashboard/onboarding', req.url));
  }

  // Usuário autenticado nunca renderiza a raiz pública ("Acessar Plataforma")
  // nem login/cadastro: o edge decide antes do render do servidor e entrega o
  // painel diretamente, erradicando o flash da CTA no boot do app.
  const isRootPath = pathname === '/';
  const isAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );
  if (isRootPath || isAuthPage) {
    const { userId } = await auth();
    if (userId) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Expoe o pathname para Server Components (layouts) que precisam dele para
  // decidir redirecionamentos de rota, já que layouts não recebem `pathname`.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|avif|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp3|json)).*)',
    '/(api|trpc)(.*)',
  ],
};
