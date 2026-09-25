'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/hooks/use-auth-store';
import { NeonButton } from '@/components/ui/neon-button';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { TERMS_TEXT } from '@/lib/terms';
import api from '@/lib/api';

export default function TermsPage() {
  const [loading, setLoading] = useState(false);
  const [canAccept, setCanAccept] = useState(false);
  const router = useRouter();
  const { user, role } = useAuthStore();

  const persistAceite = async () => {
    localStorage.setItem('termsAccepted', 'true');
    if (!user?.id) return;
    try {
      await api.post('/api/auth/aceite-termos');
    } catch {
      return;
    }
  };

  const handleAccept = async () => {
    setLoading(true);
    try {
      await persistAceite();
      if (user?.id) {
        router.push(dashboardPathForRole(role));
      } else {
        router.push('/login');
      }
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
        <NeonButton type="button" onClick={handleAccept} disabled={loading || !canAccept} className="w-full">
          {loading ? <TattooMachineLoader compact label="Processando" /> : canAccept ? 'Confirmar e Prosseguir' : 'Leia até o final para aceitar'}
        </NeonButton>
      </div>
    </div>
  );
}
