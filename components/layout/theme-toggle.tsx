'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Settings } from 'lucide-react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = !mounted || resolvedTheme === 'dark';

  return (
    <button
      type="button"
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-11 w-11 items-center justify-center rounded-full text-orange-500 transition-colors hover:bg-white/10 dark:hover:bg-white/10"
    >
      <Settings className="h-5 w-5 transition-transform duration-200 hover:rotate-90" />
    </button>
  );
}
