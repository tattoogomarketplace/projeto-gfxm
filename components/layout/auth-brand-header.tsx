'use client';

import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brand/brand-logo';
import { useI18n } from '@/hooks/use-i18n';

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
      <BrandLogo size="lg" className="h-auto px-0" />
      {showLoginSubtitle ? (
        <p className="mt-2 text-sm text-zinc-500">{t('auth.loginSubtitle')}</p>
      ) : null}
    </header>
  );
}
