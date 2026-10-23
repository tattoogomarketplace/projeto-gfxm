'use client';

import { usePathname } from 'next/navigation';
import { AuthBrandHeader } from '@/components/layout/auth-brand-header';
import { AUTH_SHELL_CLASS } from '@/lib/clerk/appearance';
import { cn } from '@/lib/utils';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isRegister = pathname === '/register' || Boolean(pathname?.startsWith('/register/'));

  return (
    <div
      className={cn(
        AUTH_SHELL_CLASS,
        isRegister && 'h-[100dvh] max-h-[100dvh] min-h-0 overflow-y-hidden'
      )}
      data-auth-shell
      style={{
        colorScheme: 'dark',
        paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)',
      }}
    >
      <div
        className={cn(
          'flex w-full max-w-md flex-col items-center',
          isRegister ? 'h-full min-h-0 flex-1' : 'my-auto'
        )}
      >
        <div className="w-full shrink-0">
          <AuthBrandHeader />
        </div>
        {children}
      </div>
    </div>
  );
}
