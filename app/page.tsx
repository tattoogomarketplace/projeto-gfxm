'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TermsModal } from '@/components/shared/terms-modal';
export default function Home() {
  const router = useRouter();
  const [showTerms, setShowTerms] = useState(false);

  const handleAccess = () => {
    // Verifica se já aceitou (pode ser via localStorage)
    const hasAccepted = localStorage.getItem('termsAccepted');
    if (hasAccepted) {
      router.push('/login');
    } else {
      setShowTerms(true);
    }
  };

  const handleAcceptTerms = () => {
    localStorage.setItem('termsAccepted', 'true');
    setShowTerms(false);
    router.push('/login');
  };

  return (
    <main className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white relative overflow-hidden">
      <TermsModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={handleAcceptTerms}
      />
      {/* Efeito de brilho de fundo GFXM */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-orange-500/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="z-10 flex flex-col items-center text-center px-4">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4">
          TattooGo <span className="text-orange-500">MK</span>
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl mb-10 max-w-lg">
          O ecossistema definitivo para Estúdios, Artistas e Clientes. 
          Performance extrema e design linear.
        </p>
        
        <button
          onClick={handleAccess}
          className="bg-orange-500 hover:bg-orange-600 text-black font-bold py-4 px-10 rounded-full transition-all active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
        >
          Acessar Plataforma
        </button>
      </div>
    </main>
  );
}