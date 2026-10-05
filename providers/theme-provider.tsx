'use client';

import { useEffect } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';

function ThemeSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (typeof document === 'undefined' || !resolvedTheme) return;

    const root = document.documentElement;
    const isLight = resolvedTheme === 'light';

    root.classList.toggle('dark', !isLight);
    root.classList.toggle('light', isLight);
    root.style.colorScheme = isLight ? 'light' : 'dark';

    const color = isLight ? '#F6F3EE' : '#121212';
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
      value={{ dark: 'dark', light: 'light' }}
      storageKey="tattoogo-theme"
      disableTransitionOnChange
    >
      <ThemeSync />
      {children}
    </NextThemesProvider>
  );
}
