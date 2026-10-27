import { BRAND_NAME, BRAND_WORDMARK } from '@/lib/i18n/brands';
import { cn } from '@/lib/utils';

type BrandLogoSize = 'sm' | 'md' | 'lg';

const MAIN_SIZE: Record<BrandLogoSize, string> = {
  sm: 'text-xl sm:text-2xl',
  md: 'text-2xl sm:text-3xl',
  lg: 'text-4xl sm:text-5xl',
};

const MARK_SIZE: Record<BrandLogoSize, string> = {
  sm: 'text-base sm:text-lg',
  md: 'text-lg sm:text-xl',
  lg: 'text-2xl sm:text-3xl',
};

const UNDERLINE_SIZE: Record<BrandLogoSize, string> = {
  sm: 'h-[6px]',
  md: 'h-[7px]',
  lg: 'h-[9px]',
};

export function BrandLogo({
  className,
  size = 'md',
}: {
  className?: string;
  size?: BrandLogoSize;
}) {
  return (
    <div
      className={cn(
        'relative z-10 flex h-11 w-full items-center justify-center overflow-visible bg-transparent px-4',
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-28 -translate-x-[68%] -translate-y-1/2 rounded-full bg-[#90EE90]/25 blur-xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-14 translate-x-[8%] -translate-y-1/2 rounded-full bg-[#FF5F1F]/30 blur-xl"
      />
      <p
        className="flex max-w-full items-center justify-center gap-1.5 select-none leading-none"
        aria-label={BRAND_NAME}
      >
        <span className="relative inline-block leading-none">
          <span
            className={cn(
              'font-caveat font-bold leading-none tracking-tight text-[#90EE90] drop-shadow-[0_0_8px_rgba(144,238,144,0.4)]',
              MAIN_SIZE[size]
            )}
          >
            {BRAND_WORDMARK.main}
          </span>
          <svg
            aria-hidden
            viewBox="0 0 88 8"
            className={cn(
              'pointer-events-none absolute inset-x-0 -bottom-[5px] mx-auto w-[92%] text-[#90EE90] drop-shadow-[0_0_6px_rgba(144,238,144,0.45)]',
              UNDERLINE_SIZE[size]
            )}
          >
            <path
              d="M2 5.4 C 20 1.8, 44 1.4, 68 3.6 C 76 4.4, 82 5.8, 86 6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span
          className={cn(
            'shrink-0 font-sans font-black leading-none tracking-tight text-[#FF5F1F] drop-shadow-[0_0_8px_rgba(255,95,31,0.4)]',
            MARK_SIZE[size]
          )}
        >
          {BRAND_WORDMARK.mark}
        </span>
      </p>
    </div>
  );
}
