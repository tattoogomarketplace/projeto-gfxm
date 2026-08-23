'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/mock-services';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
        router.push('/login');
        return;
  }

      const { data: profile } = await supabase
        .from('perfis')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role) {
        router.push(`/dashboard/${profile.role}`);
      } else {
        router.push('/login');
      }
    }
    checkRole();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="text-amber-500 font-bold animate-pulse">Conectando ao seu painel...</div>
          </div>
  );
}

