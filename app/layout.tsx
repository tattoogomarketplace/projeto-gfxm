import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import "./globals.css";
import Providers from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { PwaRegister } from "@/components/pwa-register";
import { Eruda } from "@/components/Eruda";
import { StrictSessionGuard } from "@/components/layout/strict-session-guard";
import { SingleSessionEnforcer } from "@/components/layout/single-session-enforcer";
import { SessionTaskGuard } from "@/components/layout/session-task-guard";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CLERK_TASK_URLS } from "@/lib/utils/session-tasks";

const BRAND_ASSET_VERSION = "20261005";
const brandAsset = (path: string) => `${path}?v=${BRAND_ASSET_VERSION}`;
const SITE_URL = "https://tattoogomk.com.br";
const BRAND_OG_IMAGE = brandAsset("/opengraph-image.png");
const APPLE_TOUCH_ICON = brandAsset("/apple-touch-icon.png");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "TattooGo MK | O Marketplace da Tatuagem",
  description:
    "Encontre os melhores artistas e estúdios da sua região. Agende a sua sessão com segurança, gerencie a sua agenda e impulsione a sua arte.",
  applicationName: "TattooGo MK",
  manifest: brandAsset("/manifest.json"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TattooGo MK",
  },
  twitter: {
    card: "summary_large_image",
    title: "TattooGo MK | O Marketplace da Tatuagem",
    description:
      "Encontre os melhores artistas e estúdios da sua região. Agende a sua sessão com segurança, gerencie a sua agenda e impulsione a sua arte.",
    images: [BRAND_OG_IMAGE],
  },
  openGraph: {
    title: "TattooGo MK | O Marketplace da Tatuagem",
    description:
      "Encontre os melhores artistas e estúdios da sua região. Agende a sua sessão com segurança, gerencie a sua agenda e impulsione a sua arte.",
    url: SITE_URL,
    siteName: "TattooGo MK",
    images: [
      {
        url: BRAND_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "TattooGo MK — Dark Luxury",
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
    "apple-mobile-web-app-title": "TattooGo MK",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-navbutton-color": "#121212",
    "msapplication-TileColor": "#121212",
    "msapplication-TileImage": APPLE_TOUCH_ICON,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F3EE" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      localization={ptBR}
      signInUrl="/login"
      signUpUrl="/register"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/"
      taskUrls={CLERK_TASK_URLS}
    >
      <html lang="pt-BR" className="h-[100dvh] min-h-[100dvh] dark" suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem("tattoogo-theme")||"dark";var d=t==="system"?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):t;var r=document.documentElement;r.classList.remove("light","dark");r.classList.add(d==="light"?"light":"dark");r.style.colorScheme=d==="light"?"light":"dark";}catch(e){}})();`,
            }}
          />
          <meta name="theme-color" content="#121212" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-title" content="TattooGo MK" />
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
        <body className="luxury-canvas relative flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden font-sans antialiased text-neutral-900 dark:text-white">
          <Providers>
            <ThemeProvider>
              <PwaRegister />
              <Eruda />
              <StrictSessionGuard />
              <SingleSessionEnforcer />
              <SessionTaskGuard />
              <main className="min-h-0 w-full flex-1 overflow-y-auto overscroll-y-contain">
                <div className="mx-auto flex min-h-full w-full max-w-app flex-col">
                  {children}
                </div>
              </main>
              <BottomNav />
            </ThemeProvider>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
