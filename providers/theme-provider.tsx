'use client';

import { useEffect } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';

const THEME_VALUES = { dark: 'dark', light: 'light' };

function ThemeSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (typeof document === 'undefined' || !resolvedTheme) return;

    const color = resolvedTheme === 'light' ? '#F6F3EE' : '#121212';
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
