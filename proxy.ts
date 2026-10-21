import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isNonNavigablePath, LOGIN_PATH, USERNAME_SETUP_PATH } from '@/lib/utils/auth-redirect';

const AUTH_PAGES = ['/login', '/register', '/forgot-password'] as const;

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/register(.*)',
  '/forgot-password(.*)',
  '/termos(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

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

  // BYPASS ESTRITO DE PLATAFORMA (Fase 13.5).
  //
  // Bundles do framework (`/_next`), Route Handlers/API (`/api`, `/trpc`) e
  // assets estáticos (imagens, fontes, manifests, JSON, etc.) NUNCA participam
  // dos gatekeepers de sessão deste middleware. Interceptá-los — e, pior,
  // redirecioná-los — faz o cliente tratar a resposta como uma navegação e
  // reescrever o histórico em ciclo, originando o erro fatal
  // `SecurityError: Attempt to use history.replaceState() more than 100 times
  // per 10 seconds`. O webhook do Clerk (`/api/webhooks/clerk`) também é
  // autenticado por assinatura Svix na própria Route Handler, logo cai aqui.
  if (isNonNavigablePath(pathname)) {
    return NextResponse.next();
  }

  // Bypass explícito do gatekeeper de identidade para a escrita do @username.
  // Sessão continua obrigatória: anônimos não podem abrir o degrau de handle.
  const isUsernameWritePath = USERNAME_WRITE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  if (isUsernameWritePath) {
    await auth.protect({ unauthenticatedUrl: LOGIN_PATH });
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-pathname', pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const { userId } = await auth();

  // Clerk hosted paths flash during post-OTP limbo; catch-all to app routes.
  const isSignInPath = pathname === '/sign-in' || pathname.startsWith('/sign-in/');
  const isSignUpPath = pathname === '/sign-up' || pathname.startsWith('/sign-up/');
  if (isSignInPath) {
    return NextResponse.redirect(new URL(userId ? '/dashboard' : LOGIN_PATH, req.url));
  }
  if (isSignUpPath) {
    return NextResponse.redirect(
      new URL(userId ? '/dashboard/onboarding' : '/register', req.url)
    );
  }

  // Usuário autenticado nunca renderiza a raiz pública ("Acessar Plataforma")
  // nem login/cadastro: o edge decide antes do render do servidor e entrega o
  // painel diretamente, erradicando o flash da CTA no boot do app.
  const isRootPath = pathname === '/';
  const isAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );
  if ((isRootPath || isAuthPage) && userId) {
    // O cliente deve navegar para o próximo degrau obrigatório (onboarding,
    // documentos ou @username) a partir do `/dashboard`, nunca daqui.
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (!isPublicRoute(req)) {
    await auth.protect({ unauthenticatedUrl: LOGIN_PATH });
  }

  // Expoe o pathname para Server Components (layouts) que precisam dele para
  // decidir redirecionamentos de rota, já que layouts não recebem `pathname`.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    // Exclui TODO o namespace `/_next` (bundles, HMR, dados RSC) e arquivos
    // estáticos por extensão — nenhum deles deve disparar redirect de sessão.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|avif|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp3|json)).*)',
    '/(api|trpc)(.*)',
  ],
};
