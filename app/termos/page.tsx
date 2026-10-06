'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/hooks/use-auth-store';
import { NeonButton } from '@/components/ui/neon-button';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { TermsContent } from '@/components/shared/terms-content';
import api from '@/lib/api';

export default function TermsPage() {
  const [loading, setLoading] = useState(false);
  const [canAccept, setCanAccept] = useState(false);
  const { user, role } = useAuthStore();
  const router = useRouter();

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
    <div className="fixed inset-0 z-9999 flex h-[100dvh] w-full flex-col overflow-hidden bg-black/90 p-4 backdrop-blur-md">
      <div className="mx-auto my-auto flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121212] p-8">
        <h2 className="text-2xl font-bold text-white mb-4">Termos de Uso Obrigatórios</h2>
        <div
          className="mb-8 h-72 min-h-0 overflow-y-auto overscroll-none rounded-xl border border-white/10 p-4 text-sm leading-relaxed text-zinc-400 [-webkit-overflow-scrolling:touch]"
          onScroll={(e) => {
            const target = e.target as HTMLDivElement;
            if (target.scrollHeight - target.scrollTop <= target.clientHeight + 10) {
              setCanAccept(true);
            }
          }}
        >
          <TermsContent />
        </div>
        <NeonButton type="button" onClick={handleAccept} disabled={loading || !canAccept} className="w-full">
          {loading ? <TattooMachineLoader compact label="Processando" /> : canAccept ? 'Confirmar e Prosseguir' : 'Leia até o final para aceitar'}
        </NeonButton>
      </div>
    </div>
  );
}
