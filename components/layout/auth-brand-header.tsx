'use client';

import { usePathname } from 'next/navigation';
import { useI18n } from '@/hooks/use-i18n';
import { BRAND_WORDMARK } from '@/lib/i18n/brands';

function isLoginPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/login' || pathname.startsWith('/login/');
}

export function AuthBrandHeader() {
  const pathname = usePathname();
  const { t } = useI18n();
  const showLoginSubtitle = isLoginPath(pathname);

  return (
    <header className="mb-8 w-full text-center">
      <h1 className="text-3xl font-extrabold text-white">
        {BRAND_WORDMARK.main}
        <span className="text-orange-500"> {BRAND_WORDMARK.mark}</span>
      </h1>
      {showLoginSubtitle ? (
        <p className="mt-2 text-sm text-zinc-500">{t('auth.loginSubtitle')}</p>
      ) : null}
    </header>
  );
}
