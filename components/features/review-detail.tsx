'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BadgeCheck } from 'lucide-react';
import { ReviewStars } from '@/components/features/feedback-card';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { TattooLikeButton } from '@/components/ui/tattoo-like-button';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';
import type { ReviewDto } from '@/lib/types/review';

type ReviewDetailProps = {
  review: ReviewDto;
};

export function ReviewDetail({ review }: ReviewDetailProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { styleLabel } = portfolioLabelResolver(t);
  const { triggerHaptic } = useHapticFeedback();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);

  const authorName = review.author?.name?.trim() || t('welcome.artistFallback');
  const targetName = review.target?.name?.trim() || t('welcome.artistFallback');
  const authorInitial = review.author?.initial || authorName.charAt(0).toUpperCase() || 'A';
  const targetInitial = review.target?.initial || targetName.charAt(0).toUpperCase() || 'A';
  const style = review.portfolio?.style ? styleLabel(review.portfolio.style) : '';

  const goBack = () => {
    triggerHaptic('light');
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/dashboard/avaliacoes');
  };

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain bg-transparent pb-24 text-white">
      <header className="sticky top-0 z-20 border-b border-white/[0.05] bg-neutral-950/70 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl backdrop-saturate-150">
        <div className="flex min-h-11 items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-zinc-300 transition-colors hover:text-orange-300"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.9} />
            {t('common.back')}
          </button>
          <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight">
            {t('home.reviews')}
          </h1>
        </div>
      </header>

      <article className="flex flex-col gap-7 px-4 pt-6">
        <div className="flex items-center justify-between gap-3">
          <ReviewStars rating={review.rating} size="lg" />
          {review.isVerified ? (
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-orange-300">
              <BadgeCheck className="h-4 w-4" strokeWidth={2.2} />
              {t('profile.verified')}
            </span>
          ) : null}
        </div>

        <p className="text-xl font-medium leading-relaxed tracking-tight text-zinc-100 sm:text-2xl">
          {review.content}
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 min-h-12 min-w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-900 text-sm font-semibold uppercase text-orange-400">
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
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{authorName}</p>
              <p className="truncate text-[12px] text-zinc-400">{t('home.reviews')}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              router.push(
                review.targetId?.startsWith('ph-')
                  ? '/dashboard/artistas'
                  : `/profile/${encodeURIComponent(review.targetId)}`
              );
            }}
            className="flex items-center gap-3 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-3 text-left transition-colors hover:border-orange-500/40"
          >
            <span className="flex h-12 w-12 min-h-12 min-w-12 items-center justify-center overflow-hidden rounded-full border border-orange-500/30 bg-zinc-900 text-sm font-semibold uppercase text-orange-400">
              {review.target?.avatarUrl ? (
                <OptimizedImage
                  src={review.target.avatarUrl}
                  alt={targetName}
                  className="h-full w-full rounded-full"
                />
              ) : (
                targetInitial
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {t('home.featuredArtists')}
              </span>
              <span className="block truncate text-sm font-semibold text-white">{targetName}</span>
              {style ? (
                <span className="mt-0.5 block truncate text-[12px] text-zinc-400">{style}</span>
              ) : null}
            </span>
          </button>
        </div>

        {review.portfolio?.imageUrl ? (
          <div className="relative w-full overflow-hidden rounded-3xl aspect-square border border-white/10 bg-zinc-900">
            <OptimizedImage
              src={review.portfolio.imageUrl}
              alt={style || targetName}
              className="h-full w-full object-cover"
            />
            {style ? (
              <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-orange-500/40 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-300 backdrop-blur-md">
                {style}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center">
          <TattooLikeButton
            liked={liked}
            count={likes}
            onToggle={() => {
              setLiked((current) => {
                const next = !current;
                setLikes((value) => Math.max(0, value + (next ? 1 : -1)));
                return next;
              });
            }}
            ariaLabel={liked ? t('aria.unlike') : t('aria.like')}
          />
        </div>
      </article>
    </div>
  );
}
