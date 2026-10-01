import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isClerkWebhook = createRouteMatcher(['/api/webhooks/clerk']);

export default clerkMiddleware(async (_auth, req) => {
  if (isClerkWebhook(req)) return;
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|avif|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp3|json)).*)',
    '/(api|trpc)(.*)',
  ],
};
