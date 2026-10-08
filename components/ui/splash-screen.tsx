import { BRAND_NAME } from '@/lib/i18n/brands';

export function SplashScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={BRAND_NAME}
      className="splash-gpu splash-enter fixed inset-0 z-[9999] flex h-[100dvh] w-screen flex-col items-center justify-center overflow-hidden bg-[#fcfcfc] dark:bg-[#0a0a0a]"
    >
      <div className="splash-gpu relative flex items-center justify-center">
        <div
          aria-hidden
          className="splash-gpu splash-glow pointer-events-none absolute h-[11rem] w-[11rem] rounded-full bg-[#FF4500]/40 blur-[48px] dark:bg-[#FF4500]/50 sm:h-52 sm:w-52"
        />
        <div
          aria-hidden
          className="splash-gpu pointer-events-none absolute h-24 w-24 rounded-full bg-gradient-to-br from-orange-500/70 via-[#FF4500]/50 to-orange-600/30 blur-2xl dark:from-orange-500/80 dark:via-[#FF4500]/60 dark:to-orange-600/40 sm:h-28 sm:w-28"
        />
        <svg
          viewBox="0 0 24 24"
          className="splash-gpu splash-icon-enter relative h-[5.5rem] w-[5.5rem] drop-shadow-[0_0_28px_rgba(255,69,0,0.55)] sm:h-24 sm:w-24"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="tattoogo-splash-orange"
              x1="4"
              y1="1"
              x2="20"
              y2="23"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FF6A00" />
              <stop offset="48%" stopColor="#FF4500" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>
          <g fill="url(#tattoogo-splash-orange)">
            <rect x="10.6" y="1.4" width="2.8" height="2.1" rx="0.45" />
            <path d="M7.05 4.05h9.9c.72 0 1.26.62 1.14 1.33l-.46 2.22H6.37l-.46-2.22c-.12-.71.42-1.33 1.14-1.33Z" />
            <circle cx="9.35" cy="11.15" r="3.15" />
            <circle cx="14.65" cy="11.15" r="3.15" />
            <rect x="11.15" y="8.05" width="1.7" height="6.35" rx="0.4" />
            <rect x="10.65" y="14.15" width="2.7" height="5.15" rx="0.7" />
            <path d="M12 19.1 12.75 22.7h-1.5Z" />
            <rect x="3.55" y="9.2" width="2.45" height="4.2" rx="0.7" />
          </g>
        </svg>
      </div>

      <div className="splash-gpu absolute inset-x-0 bottom-0 flex flex-col items-center pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <span className="text-[11px] font-medium tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
          from
        </span>
        <span className="mt-1 bg-gradient-to-r from-orange-500 via-[#FF4500] to-orange-600 bg-clip-text text-lg font-bold tracking-tight text-transparent">
          {BRAND_NAME}
        </span>
      </div>
    </div>
  );
}
