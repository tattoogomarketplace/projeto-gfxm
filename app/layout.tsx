import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "TattooGo MK | Marketplace de Elite",
  description: "A plataforma definitiva para tatuadores e entusiastas.",
};

import Providers from "@/providers/query-provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} font-sans bg-graphite text-foreground antialiased`}>
        <Providers>
          <main className="min-h-screen max-w-app mx-auto border-x border-graphite-200">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
