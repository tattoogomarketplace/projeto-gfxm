import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ErrorBoundary } from "@/components/shared/error-boundary";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "TattooGo MK | Marketplace de Elite",
  description: "A plataforma definitiva para tatuadores e entusiastas.",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "TattooGo MK",
  },
  other: {
    "theme-color": "#121212",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark h-full bg-[#121212]" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="theme-color" content="#121212" />
      </head>
      <body className={`${inter.variable} font-sans bg-[#121212] text-white antialiased h-full`}>
        <ErrorBoundary>
          <Providers>
            <ThemeProvider>
            <main className="h-full w-full overflow-y-auto env-safe-area">
              <div className="max-w-app mx-auto min-h-screen">
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

