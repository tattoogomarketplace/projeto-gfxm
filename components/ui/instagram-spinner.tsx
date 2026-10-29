import { cn } from '@/lib/utils';
import { OrganicInkGlow } from '@/components/ui/organic-ink-glow';

export function InstagramSpinner({
  className,
  size = 22,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center overflow-visible text-zinc-400',
        className
      )}
      style={{ width: size, height: size }}
    >
      <OrganicInkGlow />
      <svg
        className="relative z-[1] animate-spin [animation-duration:0.75s]"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle
          cx="12"
          cy="12"
          r="9.25"
          stroke="currentColor"
          strokeOpacity="0.16"
          strokeWidth="1.5"
        />
        <circle
          cx="12"
          cy="12"
          r="9.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="16 42"
        />
      </svg>
    </span>
  );
}

export function InstagramSpinnerOverlay({
  className,
  label = 'Carregando',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        'pointer-events-none absolute inset-0 z-10 flex items-center justify-center contain-paint',
        className
      )}
    >
      <InstagramSpinner />
      <span className="sr-only">{label}</span>
    </div>
  );
}
