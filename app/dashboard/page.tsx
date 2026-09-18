'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('perfis')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = profile?.role || user.user_metadata?.role || 'cliente';
      router.push(dashboardPathForRole(role));
    }
    checkRole();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <TattooMachineLoader label="Conectando ao seu painel" />
    </div>
  );
}

