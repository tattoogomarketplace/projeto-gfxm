import { clerkMiddleware } from '@clerk/nextjs/server';

const CLERK_WEBHOOK_PATH = '/api/webhooks/clerk';

export default clerkMiddleware(async (_auth, req) => {
  // O webhook do Clerk é autenticado por assinatura Svix na própria Route
  // Handler, portanto não participa do fluxo de sessão do middleware.
  if (req.nextUrl.pathname === CLERK_WEBHOOK_PATH) return;
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|avif|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp3|json)).*)',
    '/(api|trpc)(.*)',
  ],
};
