import Image from 'next/image';
import { NATIVE_APP_IMAGE_STYLE } from '@/components/ui/optimized-image';
import { BRAND_WORDMARK } from '@/lib/i18n/brands';

/**
 * Fallback de boot da raiz pública.
 *
 * Espelha a Splash (nativa e em-app) — fundo Deep Graphite com brilho cobre e a
 * assinatura da marca ao centro — para que o handoff seja imperceptível:
 * Splash nativa -> Auth Loading -> Skeletons do painel. Não usa a classe
 * `splash-root` porque `html.splash-seen` a oculta após o primeiro boot.
 */
const BOOT_FALLBACK_BG = '#000000';

export function AuthBootFallback() {
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
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        className="aspect-square w-[35vw] min-w-[130px] max-w-[200px] rounded-full object-cover select-none ring-1 ring-brand-copper/25 shadow-[0_0_30px_rgba(217,70,14,0.28),0_0_60px_rgba(249,115,22,0.14)]"
        style={NATIVE_APP_IMAGE_STYLE}
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
