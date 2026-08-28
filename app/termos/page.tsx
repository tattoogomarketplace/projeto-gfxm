'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/use-auth-store';
import { NeonButton } from '@/components/ui/neon-button';

export default function TermsPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

  const handleAccept = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch('/api/auth/aceite-termos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (response.ok) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Falha ao aceitar termos:', error);
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
          {loading ? 'Processando...' : 'Confirmar e Prosseguir'}
        </NeonButton>
      </div>
    </div>
  );
}

