'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TattooOTPInput } from '@/components/ui/tattoo-otp-input';
import { toast } from '@/lib/toast';
import { GlassContainer } from '@/components/ui/glass-container';
import { useI18n } from '@/hooks/use-i18n';
import { formatAppError } from '@/lib/error-handler';

export default function CancelarAgendamentoPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState<'validate' | 'verify'>('validate');

  const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tattoogo_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const iniciarCancelamento = async () => {
    const res = await fetch('/api/agendamentos/cancelar-solicitacao', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ agendamento_id: id }),
    });

    if (res.ok) {
      setStep('verify');
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(formatAppError({ message: data.erro, response: { status: res.status, data } }, 'api'));
    }
  };

  const handleVerify = async (code: string) => {
    try {
      const response = await fetch('/api/agendamentos/cancelar-executar', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ agendamento_id: id, otp: code }),
      });

      if (!response.ok) return false;
      toast.success(t('toast.cancelled'));
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-graphite text-white">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-none p-4 pb-36 pt-[max(2rem,env(safe-area-inset-top))] [-webkit-overflow-scrolling:touch] sm:p-8">
      <GlassContainer className="p-8 w-full max-w-md">
        {step === 'validate' ? (
          <>
            <h1 className="text-2xl font-bold mb-4">{t('cancel.title')}</h1>
            <p className="text-zinc-400 mb-8">{t('cancel.hint')}</p>
            <button 
              onClick={iniciarCancelamento}
              className="flex min-h-[44px] w-full items-center justify-center bg-orange-500 text-black font-bold py-3 rounded-lg"
            >
              {t('cancel.start')}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4 text-center">{t('cancel.confirmTitle')}</h2>
            <TattooOTPInput
              onComplete={handleVerify}
              onSuccess={() => {
                router.push('/dashboard');
              }}
              length={6}
            />
          </>
        )}
      </GlassContainer>
      </div>
    </div>
  );
}

