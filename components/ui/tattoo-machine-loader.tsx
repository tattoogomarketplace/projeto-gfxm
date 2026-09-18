'use client';

import { cn } from '@/lib/utils';

interface TattooMachineLoaderProps {
  label?: string;
  className?: string;
  compact?: boolean;
}

export function TattooMachineLoader({
  label = 'Tatuando...',
  className,
  compact = false,
}: TattooMachineLoaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        compact ? 'flex-row gap-2' : 'flex-col gap-3',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className={cn('relative', compact ? 'h-7 w-7' : 'h-14 w-14')}>
        <div className="absolute inset-0 rounded-lg border-2 border-orange-500 tattoo-machine-buzz shadow-[0_0_18px_rgba(249,115,22,0.45)]" />
        <div className="absolute inset-[3px] overflow-hidden rounded-md bg-zinc-950">
          <div className="h-full w-full origin-bottom bg-gradient-to-t from-orange-600 via-orange-500 to-amber-400 tattoo-machine-fill" />
        </div>
        <div className="absolute -right-1 top-1/2 h-3 w-2 -translate-y-1/2 rounded-r-sm bg-orange-500 tattoo-machine-buzz" />
      </div>
      {label ? (
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-500">
          {label}
        </span>
      ) : null}
    </div>
  );
}
