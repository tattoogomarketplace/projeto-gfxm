'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TermsModal } from '@/components/shared/terms-modal';
export default function Home() {
  const [showTerms, setShowTerms] = useState(false);
  const router = useRouter();

  const handleAccess = () => {
    // Verifica se já aceitou (pode ser via localStorage)
    const hasAccepted = localStorage.getItem('termsAccepted');
    if (hasAccepted) {
      router.push('/login');
    } else {
      setShowTerms(true);
    }
  };

  const handleAcceptTerms = async () => {
    try {
      localStorage.setItem('termsAccepted', 'true');
      setShowTerms(false);
      router.push('/login');
    } catch (error) {
      console.error('Falha ao aceitar termos:', error);
    }
  };

  return (
    <main className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-gray-900 select-none dark:text-white">
      <TermsModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={handleAcceptTerms}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 block dark:hidden"
        style={{
          background:
            "radial-gradient(120% 85% at 50% 8%, rgba(249,115,22,0.14) 0%, rgba(251,146,60,0.06) 34%, rgba(250,250,250,0) 72%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 hidden dark:block"
        style={{
          background:
            "radial-gradient(120% 85% at 50% 6%, rgba(249,115,22,0.30) 0%, rgba(234,88,12,0.15) 32%, rgba(10,10,10,0) 74%), radial-gradient(95% 70% at 50% 112%, rgba(180,83,9,0.16) 0%, rgba(10,10,10,0) 70%)",
        }}
      />

      <div className="z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-none px-4 pb-36 text-center [-webkit-overflow-scrolling:touch]">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4">
          TattooGo <span className="text-orange-500">MK</span>
        </h1>
        <p className="text-neutral-600 text-lg md:text-xl mb-10 max-w-lg dark:text-zinc-400">
          O ecossistema definitivo para Estúdios, Artistas e Clientes. 
          Performance extrema e design linear.
        </p>
        
        <button
          onClick={handleAccess}
          className="bg-orange-500 hover:bg-orange-600 text-black font-bold py-4 px-10 min-h-11 rounded-full transition-all active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
        >
          Acessar Plataforma
        </button>
      </div>
    </main>
  );
}