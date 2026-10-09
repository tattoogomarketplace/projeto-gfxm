'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useI18n } from '@/hooks/use-i18n';
import { NeonButton } from '@/components/ui/neon-button';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { TermsContent } from '@/components/shared/terms-content';
import api from '@/lib/api';
import { formatAppError } from '@/lib/error-handler';

export default function TermsPage() {
  const [loading, setLoading] = useState(false);
  const [canAccept, setCanAccept] = useState(false);
  const { user, role } = useAuthStore();
  const router = useRouter();
  const { t } = useI18n();

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
      console.error('Falha ao aceitar termos:', error);
      toast.error(formatAppError(error, 'api'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-9999 flex h-[100dvh] w-full flex-col overflow-hidden bg-black/90 p-4 backdrop-blur-md">
      <div className="mx-auto my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] p-5 sm:p-8">
        <h2 className="mb-4 shrink-0 text-xl font-bold text-white sm:text-2xl">{t('terms.requiredTitle')}</h2>
        <div
          className="mb-5 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-white/10 p-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] text-sm leading-relaxed text-zinc-400 [-webkit-overflow-scrolling:touch]"
          onScroll={(e) => {
            const target = e.target as HTMLDivElement;
            if (target.scrollHeight - target.scrollTop <= target.clientHeight + 10) {
              setCanAccept(true);
            }
          }}
        >
          <TermsContent />
        </div>
        <NeonButton type="button" onClick={handleAccept} disabled={loading || !canAccept} className="w-full shrink-0">
          {loading ? <TattooMachineLoader compact label={t('common.loading')} /> : canAccept ? t('terms.confirmContinue') : t('terms.readToEnd')}
        </NeonButton>
      </div>
    </div>
  );
}
