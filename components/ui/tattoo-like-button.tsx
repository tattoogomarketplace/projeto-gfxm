'use client';

import { useId, useState, type MouseEvent, type PointerEvent } from 'react';
import { motion } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

type TattooLikeButtonProps = {
  liked: boolean;
  onToggle: () => void;
  ariaLabel: string;
  count?: number;
  showCount?: boolean;
  className?: string;
  iconClassName?: string;
  dataGalleryAction?: boolean;
};

export function TattooMachineLikeGlyph({
  liked,
  className,
}: {
  liked: boolean;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const copper = `tl-copper-${uid}`;
  const body = `tl-body-${uid}`;
  const needle = `tl-needle-${uid}`;
  const stroke = liked ? `url(#${copper})` : 'currentColor';

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('h-[22px] w-[22px]', className)}
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={copper} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="45%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        <linearGradient id={body} x1="6" y1="4" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#52525b" />
          <stop offset="100%" stopColor="#18181b" />
        </linearGradient>
        <linearGradient id={needle} x1="0" y1="18" x2="0" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
      </defs>

      <rect
        x="8.9"
        y="1.5"
        width="6.2"
        height="2.4"
        rx="0.9"
        stroke={stroke}
        strokeWidth="1.35"
        fill={liked ? `url(#${body})` : 'none'}
      />
      <rect
        x="10.9"
        y="0.6"
        width="2.2"
        height="1.4"
        rx="0.5"
        stroke={stroke}
        strokeWidth="1.2"
        fill={liked ? `url(#${body})` : 'none'}
      />
      <rect
        x="8.2"
        y="3.5"
        width="1.9"
        height="2.3"
        rx="0.6"
        stroke={stroke}
        strokeWidth="1.2"
        fill={liked ? `url(#${body})` : 'none'}
      />
      <rect
        x="13.9"
        y="3.5"
        width="1.9"
        height="2.3"
        rx="0.6"
        stroke={stroke}
        strokeWidth="1.2"
        fill={liked ? `url(#${body})` : 'none'}
      />

      <rect
        x="3.5"
        y="8.5"
        width="2.5"
        height="4.7"
        rx="0.9"
        stroke={stroke}
        strokeWidth="1.3"
        fill={liked ? `url(#${body})` : 'none'}
      />

      <circle
        cx="9.7"
        cy="10.7"
        r="3.15"
        stroke={stroke}
        strokeWidth="1.35"
        fill={liked ? `url(#${copper})` : 'none'}
      />
      <circle
        cx="14.3"
        cy="10.7"
        r="3.15"
        stroke={stroke}
        strokeWidth="1.35"
        fill={liked ? `url(#${copper})` : 'none'}
      />
      <circle cx="9.7" cy="10.7" r="1.5" fill={liked ? '#18181b' : 'none'} opacity={liked ? 0.55 : 0} />
      <circle cx="14.3" cy="10.7" r="1.5" fill={liked ? '#18181b' : 'none'} opacity={liked ? 0.55 : 0} />

      <rect
        x="11.15"
        y="7.4"
        width="1.7"
        height="6.8"
        rx="0.5"
        stroke={stroke}
        strokeWidth="1.2"
        fill={liked ? `url(#${body})` : 'none'}
      />

      <path d="M6 10.7h1.2M16.8 10.7H18" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />

      <rect
        x="10.1"
        y="13.7"
        width="3.8"
        height="1"
        rx="0.5"
        stroke={stroke}
        strokeWidth="1.1"
        fill={liked ? `url(#${body})` : 'none'}
      />
      <rect
        x="10.45"
        y="14"
        width="3.1"
        height="5.5"
        rx="1.1"
        stroke={stroke}
        strokeWidth="1.2"
        fill={liked ? `url(#${body})` : 'none'}
      />

      <path
        d="M12 19.35 12.75 22.9h-1.5z"
        stroke={stroke}
        strokeWidth="0.9"
        strokeLinejoin="round"
        fill={liked ? `url(#${needle})` : 'none'}
      />
    </svg>
  );
}

/**
 * TATTOOGO MK - PROPRIETARY LIKE MICRO-INTERACTION
 *
 * Wraps the existing mutation handler without owning it: parents keep their
 * optimistic state + API/offline queue logic, while this control supplies the
 * tattoo-machine glyph, elastic spring feedback, and a crisp haptic tick on the
 * exact toggle. Only transforms animate, so the button's box never shifts.
 */
export function TattooLikeButton({
  liked,
  onToggle,
  ariaLabel,
  count,
  showCount = true,
  className,
  iconClassName,
  dataGalleryAction,
}: TattooLikeButtonProps) {
  const { triggerHaptic } = useHapticFeedback();
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const active = optimisticLiked ?? liked;

  const isolatePointer = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOptimisticLiked(!active);
    triggerHaptic('light');
    onToggle();
  };

  return (
    <motion.button
      type="button"
      onPointerDown={isolatePointer}
      onPointerUp={isolatePointer}
      onPointerCancel={isolatePointer}
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      data-gallery-action={dataGalleryAction ? '' : undefined}
      whileTap={{ scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
      className={cn(
        'relative z-10 inline-flex min-h-11 min-w-11 shrink-0 select-none items-center justify-center gap-1.5 rounded-full p-2 outline-none',
        'transform-gpu will-change-transform',
        'focus-visible:ring-2 focus-visible:ring-orange-500/60',
        className
      )}
    >
      <motion.span
        key={active ? 'liked' : 'idle'}
        initial={{ scale: 1 }}
        animate={{ scale: active ? [1, 1.35, 1] : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        className="pointer-events-none flex h-[22px] w-[22px] items-center justify-center transform-gpu will-change-transform"
      >
        <TattooMachineLikeGlyph
          liked={active}
          className={cn(active ? 'text-orange-500' : 'text-zinc-500', iconClassName)}
        />
      </motion.span>
      {showCount ? (
        <span
          className={cn(
            'min-w-[1.75rem] text-left text-sm font-medium tabular-nums',
            active ? 'text-orange-500' : 'text-zinc-500'
          )}
        >
          {count ?? 0}
        </span>
      ) : null}
    </motion.button>
  );
}
