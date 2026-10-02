import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import "./globals.css";
import Providers from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  metadataBase: new URL("https://tattoogomk.com.br"),
  title: "TattooGo MK | O Marketplace da Tatuagem",
  description:
    "Encontre os melhores artistas e estúdios da sua região. Agende a sua sessão com segurança, gerencie a sua agenda e impulsione a sua arte.",
  applicationName: "TattooGo MK",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TattooGo MK",
  },
  twitter: {
    card: "summary_large_image",
  },
  openGraph: {
    title: "TattooGo MK | O Marketplace da Tatuagem",
    description:
      "Encontre os melhores artistas e estúdios da sua região. Agende a sua sessão com segurança, gerencie a sua agenda e impulsione a sua arte.",
    url: "https://tattoogomk.com.br",
    siteName: "TattooGo MK",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Capa TattooGo MK",
      },
    ],
    locale: "pt_BR",
    type: "website",
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
  themeColor: "#121212",
  colorScheme: "dark",
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
    >
      <html lang="pt-BR" className="h-full dark" suppressHydrationWarning>
        <head>
          <meta name="theme-color" content="#121212" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <link rel="manifest" href="/manifest.json" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        </head>
        <body className="font-sans antialiased h-full overflow-hidden">
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
        </body>
      </html>
    </ClerkProvider>
  );
}
