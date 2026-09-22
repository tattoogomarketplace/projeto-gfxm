'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/hooks/use-auth-store';
import { NeonButton } from '@/components/ui/neon-button';
import { createClient } from '@/lib/supabase';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { TERMS_TEXT } from '@/lib/terms';
import api from '@/lib/api';

export default function TermsPage() {
  const [loading, setLoading] = useState(false);
  const [canAccept, setCanAccept] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

  const persistAceite = async (userId: string) => {
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('aceitar_termos');
    if (!rpcError) return;

    const { error: updateError } = await supabase
      .from('perfis')
      .update({ has_seen_welcome_notice: true })
      .eq('id', userId);

    if (!updateError) return;

    try {
      await api.post('/api/auth/aceite-termos');
    } catch {
      throw new Error(rpcError.message || updateError.message || 'Falha ao persistir aceite.');
    }
  };

  const handleAccept = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
      const userId = sessionData.user?.id || user?.id;
      if (sessionError || !userId) {
        throw new Error('Sessao expirada. Faca login novamente.');
      }

      await persistAceite(userId);

      const { data: perfil } = await supabase
        .from('perfis')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      const role = perfil?.role || (sessionData.user?.user_metadata?.role as string) || 'cliente';
      router.push(dashboardPathForRole(role));
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao aceitar termos.';
      console.error('Falha ao aceitar termos:', error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-[#121212] border border-white/10 p-8 rounded-2xl max-w-lg w-full">
        <h2 className="text-2xl font-bold text-white mb-4">Termos de Uso Obrigatórios</h2>
        <div
          className="text-zinc-400 mb-8 text-sm leading-relaxed h-64 overflow-y-auto border border-white/10 rounded-xl p-4"
          onScroll={(e) => {
            const target = e.target as HTMLDivElement;
            if (target.scrollHeight - target.scrollTop <= target.clientHeight + 10) {
              setCanAccept(true);
            }
          }}
        >
          {TERMS_TEXT}
        </div>
        <NeonButton onClick={handleAccept} disabled={loading || !canAccept} className="w-full">
          {loading ? <TattooMachineLoader compact label="Processando" /> : canAccept ? 'Confirmar e Prosseguir' : 'Leia até o final para aceitar'}
        </NeonButton>
      </div>
    </div>
  );
}

