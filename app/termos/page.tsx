'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/hooks/use-auth-store';
import { NeonButton } from '@/components/ui/neon-button';
import { createClient } from '@/lib/supabase';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';

export default function TermsPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

  const handleAccept = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getUser();
      const userId = sessionData.user?.id || user?.id;
      if (sessionError || !userId) {
        throw new Error('Sessao expirada. Faca login novamente.');
      }

      const { error } = await supabase.rpc('aceitar_termos');

      if (error) {
        throw new Error(error.message);
      }

      const role = (sessionData.user?.user_metadata?.role as string) || 'cliente';
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
        <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
          Para utilizar o TattooGo MK, você deve aceitar nossas políticas de segurança, 
          compliance de moderação de conteúdo e as diretrizes de dados. 
          Ao prosseguir, você confirma que leu e concorda com todos os termos.
        </p>
        <NeonButton onClick={handleAccept} disabled={loading} className="w-full">
          {loading ? <TattooMachineLoader compact label="Processando" /> : 'Confirmar e Prosseguir'}
        </NeonButton>
      </div>
    </div>
  );
}

