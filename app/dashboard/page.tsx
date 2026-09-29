'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { dashboardPathForRole, normalizeAppRole } from '@/lib/utils/auth-redirect';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { useAuthStore } from '@/hooks/use-auth-store';

export default function DashboardPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const storedRole = useAuthStore((s) => s.role);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) {
      router.push('/login');
      return;
    }

    const metadata = (user.unsafeMetadata || user.publicMetadata || {}) as Record<string, unknown>;
    const role = normalizeAppRole((metadata.role as string) || storedRole);
    router.push(dashboardPathForRole(role));
  }, [isLoaded, isSignedIn, user, storedRole, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <TattooMachineLoader label="Conectando ao seu painel" />
    </div>
  );
}
