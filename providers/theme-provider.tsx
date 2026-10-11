'use client';

import { useEffect } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';

const THEME_VALUES = { dark: 'dark', light: 'light' };

function ThemeSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (typeof document === 'undefined' || !resolvedTheme) return;

    const color = resolvedTheme === 'light' ? '#FAFAFA' : '#0a0a0a';

    // Root background sync: reafirma a cor do canvas raiz (html + body) de
    // forma síncrona com a classe de tema. Isso garante que o fundo correto já
    // esteja pintado na raiz antes de qualquer transição de rota, eliminando o
    // flash branco/cinza quando a aba muda. As cores são idênticas às do
    // `.dark`/`.light` em globals.css, então não há salto visual.
    const root = document.documentElement;
    root.style.backgroundColor = color;
    root.setAttribute('data-theme', resolvedTheme);
    if (document.body) document.body.style.backgroundColor = color;

    document.querySelectorAll('meta[name="theme-color"]').forEach((node) => {
      node.setAttribute('content', color);
    });
  }, [resolvedTheme]);

  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      enableColorScheme
      themes={['dark', 'light']}
      value={THEME_VALUES}
      storageKey="tattoogo-theme"
      disableTransitionOnChange
    >
      <ThemeSync />
      {children}
    </NextThemesProvider>
  );
}
