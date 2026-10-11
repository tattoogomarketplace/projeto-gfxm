'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { TermsModal } from '@/components/shared/terms-modal';
import { useI18n } from '@/hooks/use-i18n';
import { BRAND_WORDMARK } from '@/lib/i18n/brands';

/**
 * Fallback de boot da raiz pública.
 *
 * Espelha a Splash (nativa e em-app) — fundo Deep Graphite com brilho cobre e a
 * assinatura da marca ao centro — para que o handoff seja imperceptível:
 * Splash nativa -> Auth Loading -> Skeletons do painel. Não usa a classe
 * `splash-root` porque `html.splash-seen` a oculta após o primeiro boot.
 */
const BOOT_FALLBACK_BG = '#121212';

function AuthBootFallback() {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label={`${BRAND_WORDMARK.main} ${BRAND_WORDMARK.mark}`}
      className="fixed inset-0 z-[80] flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden overscroll-none touch-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      style={{
        backgroundColor: BOOT_FALLBACK_BG,
        backgroundImage: `radial-gradient(circle at 50% 42%, rgba(217,70,14,0.14) 0%, rgba(26,10,4,0.55) 16%, ${BOOT_FALLBACK_BG} 46%)`,
      }}
    >
      <Image
        src="/assets/maquina-logo.png"
        alt=""
        aria-hidden
        width={512}
        height={512}
        priority
        className="aspect-square w-[35vw] min-w-[130px] max-w-[200px] rounded-full object-cover ring-1 ring-brand-copper/25 shadow-[0_0_30px_rgba(217,70,14,0.28),0_0_60px_rgba(249,115,22,0.14)]"
      />
      <span className="mt-6 text-[clamp(1.75rem,7vw,2.5rem)] font-extrabold leading-none tracking-tight text-white">
        {BRAND_WORDMARK.main}
        <span className="ml-1 text-brand-copper [text-shadow:0_0_20px_rgba(217,70,14,0.45)]">
          {BRAND_WORDMARK.mark}
        </span>
      </span>
    </main>
  );
}

export default function Home() {
  const { t } = useI18n();
  const { isLoaded, isSignedIn } = useAuth();
  const [showTerms, setShowTerms] = useState(false);
  const router = useRouter();

  // Sessão ativa aterrissa direto no casco do painel; o middleware já cobre o
  // full load, este redirect é a salvaguarda de navegação client-side.
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  // Enquanto o Clerk inicializa — ou já com sessão ativa a caminho do painel —
  // a CTA pública nunca é pintada, eliminando o flash de "Acessar Plataforma".
  if (!isLoaded || isSignedIn) {
    return <AuthBootFallback />;
  }

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
            "radial-gradient(ellipse 120% 90% at 50% 50%, rgba(249,115,22,0.14) 0%, rgba(251,146,60,0.06) 34%, rgba(250,250,250,0) 72%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 hidden dark:block"
        style={{
          background:
            "radial-gradient(ellipse 120% 90% at 50% 50%, rgba(249,115,22,0.30) 0%, rgba(234,88,12,0.15) 32%, rgba(10,10,10,0) 74%)",
        }}
      />

      <div className="z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-none px-4 pb-36 text-center [-webkit-overflow-scrolling:touch]">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4">
          {BRAND_WORDMARK.main} <span className="text-orange-500">{BRAND_WORDMARK.mark}</span>
        </h1>
        <p className="text-neutral-600 text-lg md:text-xl mb-10 max-w-lg dark:text-zinc-400">
          {t('landing.tagline')}
        </p>
        
        <button
          onClick={handleAccess}
          className="bg-orange-500 hover:bg-orange-600 text-black font-bold py-4 px-10 min-h-11 rounded-full transition-all active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
        >
          {t('auth.accessPlatform')}
        </button>
      </div>
    </main>
  );
}