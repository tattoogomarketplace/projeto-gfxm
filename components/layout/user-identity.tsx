'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useAuthStore } from '@/hooks/use-auth-store';
import { resolveDisplayName, resolveFullName } from '@/lib/utils/display-name';
import { normalizeAppRole } from '@/lib/utils/auth-redirect';
import { useI18n } from '@/hooks/use-i18n';

export function UserIdentity() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { t } = useI18n();

  useEffect(() => {
    if (user?.fullName) return;
    if (!isLoaded || !isSignedIn || !clerkUser) return;

    const metadata = (clerkUser.unsafeMetadata || clerkUser.publicMetadata || {}) as Record<string, unknown>;
    setUser({
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
      fullName: resolveFullName({
        full_name: metadata.full_name as string | undefined,
        nome: metadata.nome as string | undefined,
        name: clerkUser.fullName || undefined,
      }),
    });
    setRole(normalizeAppRole(metadata.role as string));
  }, [user?.fullName, isLoaded, isSignedIn, clerkUser, setUser, setRole]);

  const displayName = resolveDisplayName(
    user?.fullName ? { full_name: user.fullName } : undefined
  );

  return (
    <Link
      href="/dashboard/perfil"
      className="flex min-h-11 min-w-11 items-center gap-2 rounded-full px-2 text-right transition-colors hover:bg-white/5"
      aria-label={t('aria.profileOpen')}
    >
      <span className="max-w-28 truncate text-[13px] font-semibold text-orange-500">
        {displayName}
      </span>
    </Link>
  );
}
