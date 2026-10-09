'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';

interface TattooMachineLoaderProps {
  label?: string;
  className?: string;
  compact?: boolean;
  failed?: boolean;
}

function TattooMachineLoaderBase({
  label,
  className,
  compact = false,
  failed = false,
}: TattooMachineLoaderProps) {
  const { t } = useI18n();
  const resolvedLabel = label ?? t('common.loading');
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        compact ? 'flex-row gap-2' : 'flex-col gap-3',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={resolvedLabel}
    >
      <div className={cn('relative', compact ? 'h-7 w-7' : 'h-14 w-14')}>
        <div
          className={cn(
            'absolute inset-0 rounded-lg border-2',
            failed
              ? 'border-red-600 tattoo-machine-shake shadow-[0_0_18px_rgba(220,38,38,0.55)]'
              : 'border-orange-500 tattoo-machine-buzz shadow-[0_0_18px_rgba(249,115,22,0.45)]'
          )}
        />
        <div className="absolute inset-[3px] overflow-hidden rounded-md bg-zinc-950">
          <div
            className={cn(
              'h-full w-full origin-bottom bg-gradient-to-t',
              failed
                ? 'from-red-800 via-red-600 to-rose-400 tattoo-machine-fill-failed'
                : 'from-orange-600 via-orange-500 to-amber-400 tattoo-machine-fill'
            )}
          />
        </div>
        {failed ? (
          <svg
            viewBox="0 0 24 24"
            className="absolute inset-0 m-auto h-1/2 w-1/2 text-red-500"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M12 2c.8 2.4 3 5.2 3 8.2A3 3 0 1 1 9 10.2C9 7.2 11.2 4.4 12 2Zm0 12.5a5.5 5.5 0 0 0-5.5 5.5h11A5.5 5.5 0 0 0 12 14.5Z"
            />
          </svg>
        ) : null}
        <div
          className={cn(
            'absolute -right-1 top-1/2 h-3 w-2 -translate-y-1/2 rounded-r-sm',
            failed ? 'bg-red-600 tattoo-machine-shake' : 'bg-orange-500 tattoo-machine-buzz'
          )}
        />
      </div>
      {resolvedLabel ? (
        <span
          className={cn(
            'text-[11px] font-bold uppercase tracking-[0.2em]',
            failed ? 'text-red-500' : 'text-orange-500'
          )}
        >
          {resolvedLabel}
        </span>
      ) : null}
    </div>
  );
}

export const TattooMachineLoader = memo(TattooMachineLoaderBase);
