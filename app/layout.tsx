import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { PwaRegister } from "@/components/pwa-register";
import { PwaSplashLinks } from "@/components/pwa-splash-links";

export const metadata: Metadata = {
  title: "TattooGo MK | Marketplace de Elite",
  description: "A plataforma definitiva para tatuadores e entusiastas.",
  applicationName: "TattooGo MK",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TattooGo MK",
    startupImage: [
      {
        url: "/splash/apple-splash-1290-2796.png",
        media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-1179-2556.png",
        media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-1284-2778.png",
        media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-1170-2532.png",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-1125-2436.png",
        media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-750-1334.png",
        media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-640-1136.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-navbutton-color": "#121212",
    "msapplication-TileColor": "#121212",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F5F5" },
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
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#121212" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <PwaSplashLinks />
      </head>
      <body className="font-sans bg-[var(--background)] text-[var(--foreground)] antialiased h-full overflow-hidden">
        <ErrorBoundary>
          <Providers>
            <ThemeProvider>
              <PwaRegister />
              <main className="h-full w-full overflow-y-auto env-safe-area">
                <div className="max-w-app mx-auto min-h-full">
                  {children}
                </div>
              </main>
            </ThemeProvider>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
