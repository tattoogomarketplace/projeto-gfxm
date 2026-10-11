'use client';

import { useCallback, useEffect, useState } from 'react';
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
      className="fixed inset-0 z-[80] flex h-[100dvh] min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden overscroll-none touch-none bg-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
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
  // Trava de handoff: mantida alta a partir do aceite dos termos até o /login
  // montar. Impede que a landing (e qualquer casco sob ela) seja pintada.
  const [isHandoff, setIsHandoff] = useState(false);
  // `null` = aceite ainda não avaliado; `false` = liberado para a landing.
  // Qualquer outro valor mantém o AuthBootFallback como único frame possível.
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const router = useRouter();

  // Sessão ativa aterrissa direto no casco do painel; o middleware já cobre o
  // full load, este redirect é a salvaguarda de navegação client-side.
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  // Avaliação estrita do aceite legal. Se os termos já foram aceitos, a raiz
  // não pertence mais ao histórico: troca imediata por /login (`replace`) e
  // trava visual no AuthBootFallback até o novo frame montar.
  const evaluateAcceptance = useCallback(() => {
    let accepted = false;
    try {
      accepted = localStorage.getItem('termsAccepted') === 'true';
    } catch {
      accepted = false;
    }

    if (accepted) {
      setTermsAccepted(true);
      setIsHandoff(true);
      router.replace('/login');
      return;
    }

    setTermsAccepted(false);
  }, [router]);

  // Avaliação inicial na montagem.
  useEffect(() => {
    evaluateAcceptance();
  }, [evaluateAcceptance]);

  // Blindagem contra popstate (swipe-back nativo) e restauração do bfcache do
  // iOS. `pageshow.persisted` sinaliza que a página voltou da memória cache com
  // estado React possivelmente stale — reavaliar força o replace de volta.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) evaluateAcceptance();
    };
    const onPopState = () => evaluateAcceptance();

    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('popstate', onPopState);
    };
  }, [evaluateAcceptance]);

  // Enquanto o Clerk inicializa, o aceite não foi avaliado, a sessão está ativa
  // ou já estamos deixando a rota: NUNCA renderiza a landing nem o casco
  // interno. Apenas o AuthBootFallback (visual idêntico ao splash) é permitido.
  if (!isLoaded || isSignedIn || isHandoff || termsAccepted !== false) {
    return <AuthBootFallback />;
  }

  const handleAccess = () => {
    // Verifica se já aceitou (pode ser via localStorage)
    const hasAccepted = localStorage.getItem('termsAccepted');
    if (hasAccepted) {
      router.replace('/login');
    } else {
      setShowTerms(true);
    }
  };

  const handleAcceptTerms = () => {
    try {
      localStorage.setItem('termsAccepted', 'true');
    } catch (error) {
      console.error('Falha ao aceitar termos:', error);
    }
    // Fecha o overlay e sobe o AuthBootFallback no MESMO commit (estado batch),
    // de modo que a landing nunca seja revelada entre o unmount dos termos e a
    // chegada do /login. `replace` troca o estado de histórico: o swipe-back do
    // iOS não retorna ao overlay de termos/landing.
    setTermsAccepted(true);
    setIsHandoff(true);
    setShowTerms(false);
    router.replace('/login');
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-black">
      <main className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-gray-900 select-none dark:text-white">
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
    </div>
  );
}
