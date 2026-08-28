'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { TattooOTPInput } from '@/components/ui/tattoo-otp-input';
import { toast } from 'sonner';
import { GlassContainer } from '@/components/ui/glass-container';

export default function CancelarAgendamentoPage() {
  const { id } = useParams();
  const router = useRouter();
  const [step, setStep] = useState<'validate' | 'verify'>('validate');

  const iniciarCancelamento = async () => {
    const res = await fetch('/api/agendamentos/cancelar-solicitacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agendamento_id: id }),
    });

    if (res.ok) {
      setStep('verify');
    } else {
      const data = await res.json();
      toast.error(data.erro);
    }
  };

  const handleVerify = async (code: string) => {
    try {
      const response = await fetch('/api/agendamentos/cancelar-executar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agendamento_id: id, otp: code }),
      });

      if (!response.ok) return false;
    toast.success('Agendamento cancelado com sucesso.');
    router.push('/dashboard');
      return true;
    } catch (err) {
      return false;
    }
  };

  return (
    <div className="p-8 text-white min-h-screen bg-graphite flex flex-col items-center justify-center">
      <GlassContainer className="p-8 w-full max-w-md">
        {step === 'validate' ? (
          <>
            <h1 className="text-2xl font-bold mb-4">Cancelar Agendamento</h1>
            <p className="text-zinc-400 mb-8">Esta ação exige confirmação de segurança via OTP.</p>
            <button 
              onClick={iniciarCancelamento}
              className="w-full bg-neon-orange text-white font-bold py-3 rounded-lg"
            >
              Iniciar Cancelamento
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4 text-center">Confirme o Cancelamento</h2>
            <TattooOTPInput onComplete={handleVerify} />
          </>
        )}
      </GlassContainer>
    </div>
  );
}

