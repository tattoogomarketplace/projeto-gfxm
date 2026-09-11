'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const allowedRoles = ['cliente', 'tatuador', 'estudio'] as const;

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
      if (allowedRoles.includes(role)) {
        router.push(`/dashboard/${role}`);
        return;
      }

      router.push('/dashboard/cliente');
    }
    checkRole();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="text-amber-500 font-bold animate-pulse">Conectando ao seu painel...</div>
          </div>
  );
}

