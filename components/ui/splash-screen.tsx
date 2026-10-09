import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BRAND_NAME } from '@/lib/i18n/brands';

/**
 * Splash tier "Apple": fundo preto solido, logo 1:1 da maquina no centro exato e
 * assinatura de marca ancorada na base, ambas respeitando as safe-areas.
 *
 * Regra de marca (nao traduzir/alterar): "TattooGo" em branco + "MK" no cobre
 * extraido do icone do app (#D9460E).
 *
 * `isVisible` controla a camada de saida (fade GPU). A animacao de entrada vive
 * num wrapper interno porque `splash-enter` usa `animation-fill-mode: both` e
 * forca `opacity: 1`, o que anularia a transicao de fade do container raiz.
 */

const MACHINE_LOGO_SRC = '/assets/maquina-logo.png';
const MACHINE_LOGO_SIZE = 512;

const WORDMARK_PARTS = BRAND_NAME.split(' ');
const WORDMARK_MAIN = WORDMARK_PARTS[0] ?? BRAND_NAME;
const WORDMARK_MARK = WORDMARK_PARTS.slice(1).join(' ') || 'MK';

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="text-white">{WORDMARK_MAIN}</span>
      <span className="ml-1 text-brand-copper [text-shadow:0_0_20px_rgba(217,70,14,0.45)]">
        {WORDMARK_MARK}
      </span>
    </span>
  );
}

type SplashScreenProps = {
  isVisible?: boolean;
};

export function SplashScreen({ isVisible = true }: SplashScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={BRAND_NAME}
      aria-hidden={!isVisible}
      style={{ backgroundColor: '#000000' }}
      className={cn(
        'splash-root splash-gpu fixed inset-0 z-[9999] flex h-[100dvh] w-full flex-col items-center justify-between overflow-hidden overscroll-none touch-none bg-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-opacity duration-500 ease-in-out transform-gpu will-change-opacity',
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}
    >
      <div className="splash-gpu splash-enter flex h-full min-h-0 w-full flex-1 flex-col items-center justify-between">
        <div aria-hidden className="w-full flex-1" />

        <div className="flex w-full shrink-0 flex-col items-center gap-5 px-6">
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden
              className="splash-gpu splash-glow pointer-events-none absolute aspect-square w-[38vw] min-w-[150px] max-w-[220px] rounded-full bg-brand-copper/30 blur-[54px]"
            />
            <div className="animate-float will-change-transform">
              <Image
                src={MACHINE_LOGO_SRC}
                alt={BRAND_NAME}
                width={MACHINE_LOGO_SIZE}
                height={MACHINE_LOGO_SIZE}
                priority
                sizes="(max-width: 640px) 35vw, 200px"
                className="splash-icon-enter relative aspect-square w-[35vw] min-w-[130px] max-w-[200px] rounded-full overflow-hidden object-cover ring-1 ring-brand-copper/25 shadow-[0_0_30px_rgba(217,70,14,0.28),0_0_60px_rgba(249,115,22,0.14)]"
              />
            </div>
          </div>

          <Wordmark className="splash-gpu text-[clamp(1.75rem,7vw,2.5rem)] font-extrabold leading-none tracking-tight" />
        </div>

        <div aria-hidden className="w-full flex-1" />

        <footer className="flex w-full shrink-0 flex-col items-center pb-6">
          <span className="text-xs uppercase tracking-widest text-zinc-500">from</span>
          <Wordmark className="mt-1 text-sm font-semibold tracking-wide" />
        </footer>
      </div>
    </div>
  );
}
