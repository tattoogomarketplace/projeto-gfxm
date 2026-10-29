import { cn } from '@/lib/utils';

export function OrganicInkGlow({ className }: { className?: string }) {
  return (
    <>
      <svg
        aria-hidden
        focusable="false"
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
        width={0}
        height={0}
      >
        <defs>
          <filter id="ink-dispersion" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015"
              numOctaves={3}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={20}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <span aria-hidden className={cn('organic-ink-blob', className)} />
    </>
  );
}
