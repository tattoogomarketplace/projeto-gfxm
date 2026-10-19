import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import Providers from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { I18nProvider } from "@/providers/i18n-provider";
import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { LocalizedClerkProvider } from "@/providers/clerk-provider";
import { PwaRegister } from "@/components/pwa-register";
import { Eruda } from "@/components/Eruda";
import { BootCanvasOverlay } from "@/components/layout/boot-continuation";
import { StrictSessionGuard } from "@/components/layout/strict-session-guard";
import { SingleSessionEnforcer } from "@/components/layout/single-session-enforcer";
import { SessionTaskGuard } from "@/components/layout/session-task-guard";
import { BottomNav, BottomNavFallback } from "@/components/layout/bottom-nav";
import { PersistentAppChrome } from "@/components/layout/persistent-app-chrome";
import { SplashGate } from "@/components/ui/splash-gate";
import { BootShellSkeleton } from "@/components/layout/boot-shell-skeleton";
import { BRAND_NAME } from "@/lib/i18n/brands";

const BRAND_ASSET_VERSION = "20261005";
const brandAsset = (path: string) => `${path}?v=${BRAND_ASSET_VERSION}`;
const SITE_URL = "https://tattoogomk.com.br";
const BRAND_OG_IMAGE = brandAsset("/opengraph-image.png");
const APPLE_TOUCH_ICON = brandAsset("/apple-touch-icon.png");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${BRAND_NAME} | O Marketplace da Tatuagem`,
  description:
    "Encontre os melhores artistas e estúdios da sua região. Agende a sua sessão com segurança, gerencie a sua agenda e impulsione a sua arte.",
  applicationName: BRAND_NAME,
  manifest: brandAsset("/manifest.json"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: BRAND_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} | O Marketplace da Tatuagem`,
    description:
      "Encontre os melhores artistas e estúdios da sua região. Agende a sua sessão com segurança, gerencie a sua agenda e impulsione a sua arte.",
    images: [BRAND_OG_IMAGE],
  },
  openGraph: {
    title: `${BRAND_NAME} | O Marketplace da Tatuagem`,
    description:
      "Encontre os melhores artistas e estúdios da sua região. Agende a sua sessão com segurança, gerencie a sua agenda e impulsione a sua arte.",
    url: SITE_URL,
    siteName: BRAND_NAME,
    images: [
      {
        url: BRAND_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${BRAND_NAME} — Dark Luxury`,
        type: "image/png",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  icons: {
    icon: [
      { url: brandAsset("/favicon-32x32.png"), sizes: "32x32", type: "image/png" },
      { url: brandAsset("/favicon-16x16.png"), sizes: "16x16", type: "image/png" },
      { url: brandAsset("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: brandAsset("/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
    shortcut: brandAsset("/favicon-32x32.png"),
    apple: [
      { url: APPLE_TOUCH_ICON, sizes: "180x180", type: "image/png" },
      { url: brandAsset("/apple-touch-icon-180x180.png"), sizes: "180x180", type: "image/png" },
      { url: brandAsset("/apple-touch-icon-167x167.png"), sizes: "167x167", type: "image/png" },
      { url: brandAsset("/apple-touch-icon-152x152.png"), sizes: "152x152", type: "image/png" },
      { url: brandAsset("/apple-touch-icon-120x120.png"), sizes: "120x120", type: "image/png" },
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: brandAsset("/apple-touch-icon-precomposed.png"),
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": BRAND_NAME,
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-navbutton-color": "#0a0a0a",
    "msapplication-TileColor": "#0a0a0a",
    "msapplication-TileImage": APPLE_TOUCH_ICON,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  // Deep Graphite hardcoded (canvas da marca, `--background` dark e splash):
  // o boot e SEMPRE escuro, entao o WebKit nunca pinta um frame branco antes
  // do CSS — inclusive em aparelhos configurados em Light Mode.
  themeColor: "#0a0a0a",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <html lang="pt-BR" className="fixed inset-0 flex h-[100dvh] min-h-[100dvh] w-full flex-col overflow-hidden bg-black select-none" suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem("tattoogo-theme")||"dark";var d=t==="system"?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):t;var r=document.documentElement;if(sessionStorage.getItem("hasSeenSplash")){r.classList.add("splash-seen");}r.classList.remove("light","dark");r.classList.add(d==="light"?"light":"dark");r.style.colorScheme=d==="light"?"light":"dark";var bg=d==="light"?"#FAFAFA":"#0a0a0a";r.style.backgroundColor=bg;r.setAttribute("data-theme",d);var paint=function(){var b=document.body;if(b){b.style.backgroundColor=bg;}};paint();document.addEventListener("DOMContentLoaded",paint);var l=localStorage.getItem("tattoogo-locale")||"pt-BR";var a={pt:"pt-BR","pt-br":"pt-BR","pt-pt":"pt-PT",en:"en","en-us":"en",es:"es",fr:"fr",de:"de",it:"it",ja:"ja",zh:"zh","zh-cn":"zh",ko:"ko",ar:"ar",ru:"ru",hi:"hi",nl:"nl",tr:"tr",pl:"pl"};var n=String(l).replace("_","-");var k=n.toLowerCase();var loc=a[k]||a[k.split("-")[0]]||( /^(pt-BR|pt-PT|en|es|fr|de|it|ja|zh|ko|ar|ru|hi|nl|tr|pl)$/.test(n)?n:"pt-BR");var h={ "pt-BR":"pt-BR","pt-PT":"pt-PT",en:"en",es:"es",fr:"fr",de:"de",it:"it",ja:"ja",zh:"zh-CN",ko:"ko",ar:"ar",ru:"ru",hi:"hi",nl:"nl",tr:"tr",pl:"pl"};r.lang=h[loc]||loc;r.dir=loc==="ar"?"rtl":"ltr";}catch(e){}})();`,
            }}
          />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />
          <meta name="theme-color" content="#0a0a0a" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-title" content={BRAND_NAME} />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <link rel="manifest" href="/manifest.json?v=20261005" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=20261005" />
          <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167x167.png?v=20261005" />
          <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png?v=20261005" />
          <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.png?v=20261005" />
          <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png?v=20261005" />
          <meta property="og:image" content="https://tattoogomk.com.br/opengraph-image.png?v=20261005" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:type" content="image/png" />
          <meta name="twitter:image" content="https://tattoogomk.com.br/opengraph-image.png?v=20261005" />
        </head>
        <body className="luxury-canvas app-frame fixed inset-0 mb-0 flex h-[100dvh] min-h-[100dvh] w-full flex-col overflow-hidden bg-background pb-0 font-sans antialiased text-neutral-900 select-none dark:text-white">
          <LocalizedClerkProvider>
          <SplashGate />
          <Providers>
            <ThemeProvider>
              <I18nProvider>
              <PwaRegister />
              <Eruda />
              <StrictSessionGuard />
              <SingleSessionEnforcer />
              <SessionTaskGuard />
              <main className="app-scroll relative z-0 mb-0 flex min-h-0 h-full w-full flex-1 flex-col overflow-hidden overscroll-none">
                {/* Fase 25.6 — Zero CLS no handoff de autenticação:
                    o `<ClerkLoading>` NÃO retorna `null` (Fase 25.5) e agora
                    também NÃO pinta um esqueleto genérico. Ele renderiza o
                    `BootShellSkeleton`, que replica classe por classe o casco
                    real (`data-viewport-root` + header + viewport de conteúdo
                    com `px-4 sm:px-6` e `nav-safe-pad`) e injeta o MESMO
                    esqueleto que a rota de destino usa em `loading.tsx`
                    (Feed de Descoberta na Home / Início, hub no painel do
                    tatuador, overview no do estúdio). Sem header, padding ou
                    geometria divergentes, os cards de shimmer ficam travados
                    nas mesmas coordenadas do boot até o conteúdo hidratar —
                    nenhuma "esticada"/layout shift.

                    Rotas fora da Home autenticada caem no fallback genérico
                    (`AppRouteSkeleton`), nunca num canvas vazio. Como
                    `<ClerkLoaded>` só renderiza os filhos quando o Clerk
                    resolve, os dois nunca se sobrepõem. */}
                <ClerkLoading>
                  <BootShellSkeleton />
                </ClerkLoading>
                <ClerkLoaded>
                  <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
                    {children}
                  </div>
                </ClerkLoaded>
              </main>
              {/* Chrome persistente do casco (gatilho de configurações + FAB
                  do Atelier IA). Montado UMA vez no root layout, fora do
                  `<ClerkLoading>`/`<ClerkLoaded>` e de qualquer fronteira de
                  rota: os ícones atravessam o handoff de hidratação sem
                  desmontar, eliminando o flicker de 1 frame. */}
              <PersistentAppChrome />
              <Suspense fallback={<BottomNavFallback />}>
                <BottomNav />
              </Suspense>
              {/* BLINDAGEM DE BOOT (Fase 25.3): camada opaca de tela cheia no
                  nível raiz do <body>, FORA do stacking context do <main>
                  (relative z-0). Ela só pinta enquanto existir um
                  `BootContinuation` montado. AUDITORIA: o único produtor desse
                  canvas era o `<ClerkLoading>` acima e foi removido, então
                  navegações internas (e o próprio boot) nunca mais ativam esta
                  camada — ela permanece inerte e os skeletons de `loading.tsx`
                  são a única UI de carregamento. A splash inicial (`SplashGate`,
                  z-[9999]) segue intacta. */}
              <BootCanvasOverlay />
              </I18nProvider>
            </ThemeProvider>
          </Providers>
          </LocalizedClerkProvider>
        </body>
      </html>
  );
}
