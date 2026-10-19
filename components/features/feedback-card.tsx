'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';
import { BadgeCheck, Star } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/hooks/use-i18n';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';
import type { ReviewDto } from '@/lib/types/review';
import { cn } from '@/lib/utils';

const STAR_SLOTS = [0, 1, 2, 3, 4] as const;

export function ReviewStars({
  rating,
  size = 'sm',
}: {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const clamped = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
  const iconClass = size === 'lg' ? 'h-5 w-5' : size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';

  return (
    <span className="flex items-center gap-0.5" aria-label={`${clamped} / 5`}>
      {STAR_SLOTS.map((slot) => (
        <Star
          key={slot}
          className={cn(
            iconClass,
            slot < clamped ? 'fill-orange-400 text-orange-400' : 'text-zinc-600'
          )}
          strokeWidth={1.75}
        />
      ))}
    </span>
  );
}

export function FeedbackCardSkeleton() {
  return (
    <div className="w-[18rem] shrink-0 snap-start">
      <Skeleton className="h-[13.5rem] w-full rounded-2xl" />
    </div>
  );
}

type ClickLike = { preventDefault: () => void; stopPropagation: () => void };

type FeedbackCardProps = {
  review: ReviewDto;
  onOpen: (event: ClickLike) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  className?: string;
};

export function FeedbackCard({
  review,
  onOpen,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  className,
}: FeedbackCardProps) {
  const { t } = useI18n();
  const { styleLabel } = portfolioLabelResolver(t);
  const authorName = review.author?.name?.trim() || t('welcome.artistFallback');
  const targetName = review.target?.name?.trim() || t('welcome.artistFallback');
  const authorInitial =
    review.author?.initial || authorName.charAt(0).toUpperCase() || 'A';
  const style = review.portfolio?.style ? styleLabel(review.portfolio.style) : '';

  return (
    <button
      type="button"
      role="listitem"
      onClick={onOpen}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        'group flex w-[18rem] shrink-0 snap-start flex-col gap-3 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-4 text-left transition-colors duration-200 hover:border-orange-500/40 active:bg-zinc-900/70',
        className
      )}
    >
      <span className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 min-h-9 min-w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-900 text-[13px] font-semibold uppercase text-orange-400">
          {review.author?.avatarUrl ? (
            <OptimizedImage
              src={review.author.avatarUrl}
              alt={authorName}
              className="h-full w-full rounded-full"
            />
          ) : (
            authorInitial
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="truncate text-sm font-semibold tracking-tight text-white">
              {authorName}
            </span>
            {review.isVerified ? (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-orange-400" strokeWidth={2.2} />
            ) : null}
          </span>
          <ReviewStars rating={review.rating} />
        </span>
      </span>

      <span className="line-clamp-3 text-[13px] leading-relaxed text-zinc-300">
        {review.content}
      </span>

      <span className="mt-auto flex items-center gap-2.5">
        {review.portfolio?.imageUrl ? (
          <span className="h-10 w-10 min-h-10 min-w-10 overflow-hidden rounded-lg border border-white/10">
            <OptimizedImage
              src={review.portfolio.imageUrl}
              alt={style || targetName}
              className="h-full w-full"
            />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-medium text-white">{targetName}</span>
          {style ? (
            <span className="block truncate text-[11px] text-zinc-400">{style}</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
