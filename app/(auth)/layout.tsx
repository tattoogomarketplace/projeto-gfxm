import { AuthBrandHeader } from '@/components/layout/auth-brand-header';
import { AUTH_SHELL_CLASS } from '@/lib/clerk/appearance';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={AUTH_SHELL_CLASS} data-auth-shell style={{ colorScheme: 'dark' }}>
      <div className="my-auto flex w-full max-w-md flex-col items-center">
        <AuthBrandHeader />
        {children}
      </div>
    </div>
  );
}
