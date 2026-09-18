'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useAuthStore } from '@/hooks/use-auth-store';
import { resolveDisplayName, resolveFullName } from '@/lib/utils/display-name';
import { normalizeAppRole } from '@/lib/utils/auth-redirect';

export function UserIdentity() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);

  useEffect(() => {
    if (user?.fullName) return;

    let cancelled = false;
    async function loadIdentity() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const sessionUser = data.user;
      if (!sessionUser || cancelled) return;

      const { data: profile } = await supabase
        .from('perfis')
        .select('role')
        .eq('id', sessionUser.id)
        .maybeSingle();

      setUser({
        id: sessionUser.id,
        email: sessionUser.email ?? '',
        fullName: resolveFullName(sessionUser.user_metadata),
      });
      setRole(normalizeAppRole(profile?.role || (sessionUser.user_metadata?.role as string)));
    }

    loadIdentity();
    return () => {
      cancelled = true;
    };
  }, [user?.fullName, setUser, setRole]);

  const displayName = resolveDisplayName(
    user?.fullName ? { full_name: user.fullName } : undefined
  );

  return (
    <Link
      href="/perfil"
      className="flex min-h-11 min-w-11 items-center gap-2 rounded-full px-2 text-right transition-colors hover:bg-white/5"
      aria-label="Abrir meu perfil"
    >
      <span className="max-w-28 truncate text-[13px] font-semibold text-orange-500">
        {displayName}
      </span>
    </Link>
  );
}
