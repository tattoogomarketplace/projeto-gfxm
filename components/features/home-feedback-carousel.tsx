'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, Star } from 'lucide-react';
import { FeedbackCard, FeedbackCardSkeleton } from '@/components/features/feedback-card';
import { HomeCarouselActionCard } from '@/components/features/home-carousel-action-card';
import { ReviewHapticPreview } from '@/components/features/review-haptic-preview';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useFeaturedReviews } from '@/hooks/use-featured-reviews';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { useLongPressPreview } from '@/hooks/use-long-press-preview';
import { HOME_CAROUSEL_LIMIT } from '@/lib/gallery-mock';
import { hydrateGridItems } from '@/lib/grid-hydration';
import { PLACEHOLDER_REVIEWS } from '@/lib/review-mock';
import type { ReviewDto } from '@/lib/types/review';

const CAROUSEL_CLASS =
  '-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 [-webkit-overflow-scrolling:touch] scrollbar-none sm:-mx-6 sm:px-6';

export function reviewDestination(review: ReviewDto): string {
  if (!review?.id) return '/dashboard/avaliacoes';
  return `/dashboard/avaliacoes/${encodeURIComponent(review.id)}`;
}

export function HomeFeedbackCarousel() {
  const { t } = useI18n();
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const longPress = useLongPressPreview();
  const { data } = useFeaturedReviews();
  const [preview, setPreview] = useState<ReviewDto | null>(null);

  const reviews = useMemo<ReviewDto[]>(() => {
    const source = Array.isArray(data) ? data : [];
    const valid = source.filter((item) => item?.id && item.content);
    return hydrateGridItems(valid, PLACEHOLDER_REVIEWS).slice(0, HOME_CAROUSEL_LIMIT);
  }, [data]);

  const firePreview = (review: ReviewDto) => {
    if (!review?.id) return;
    triggerHaptic('medium');
    setPreview(review);
  };

  const openReview = (
    review: ReviewDto,
    event?: { preventDefault: () => void; stopPropagation: () => void }
  ) => {
    if (longPress.consumeClick(event)) return;
    triggerHaptic('light');
    router.push(reviewDestination(review));
  };

  const dismissPreview = useCallback(() => setPreview(null), []);

  const viewFullReview = useCallback(
    (review: ReviewDto) => {
      setPreview(null);
      triggerHaptic('light');
      router.push(reviewDestination(review));
    },
    [router, triggerHaptic]
  );

  return (
    <section className="min-w-0 w-full space-y-3" aria-labelledby="discover-reviews">
      <div className="flex w-full flex-row items-center justify-between p-3 mb-4 bg-[#121212]/80 border border-white/5 rounded-2xl backdrop-blur-sm">
        <div className="flex flex-row items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#FF5F1F]/10 text-[#FF5F1F]">
            <Star className="h-5 w-5 shrink-0" strokeWidth={1.9} aria-hidden />
          </div>
          <h2 id="discover-reviews" className="text-base sm:text-lg font-semibold text-white tracking-tight">
            {t('home.featuredReviews')}
          </h2>
        </div>
        <Link
          href="/dashboard/avaliacoes"
          className="text-sm font-medium text-[#FF5F1F] hover:text-[#FF5F1F]/80 transition-colors whitespace-nowrap flex-shrink-0 self-center m-0 flex items-center"
        >
          {t('home.viewAll')}
        </Link>
      </div>

      <ErrorBoundary
        fallback={
          <div className="flex min-h-[13.5rem] items-center justify-center rounded-2xl border border-zinc-800/50 bg-zinc-900/40 px-4 py-6 text-center">
            <p className="text-sm text-zinc-400">{t('home.noFeaturedReviews')}</p>
          </div>
        }
      >
        {reviews.length === 0 ? (
          <div className={CAROUSEL_CLASS} role="list" aria-label={t('home.reviews')}>
            {[0, 1, 2, 3, 4].map((index) => (
              <FeedbackCardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className={CAROUSEL_CLASS} role="list" aria-label={t('home.reviews')}>
            {reviews.map((review) => (
              <FeedbackCard
                key={review.id}
                review={review}
                onOpen={(event) => openReview(review, event)}
                onPointerDown={longPress.start(() => firePreview(review))}
                onPointerMove={longPress.move}
                onPointerUp={longPress.cancel}
                onPointerCancel={longPress.cancel}
                onPointerLeave={longPress.cancel}
              />
            ))}
            <HomeCarouselActionCard
              href="/dashboard/avaliacoes"
              label={t('home.ctaReadStories')}
              icon={<MessageCircle className="h-5 w-5" strokeWidth={1.9} />}
              className="h-[13.5rem] w-[18rem]"
            />
          </div>
        )}
      </ErrorBoundary>

      <ErrorBoundary fallback={null}>
        <ReviewHapticPreview
          review={preview}
          onDismiss={dismissPreview}
          onViewFull={viewFullReview}
        />
      </ErrorBoundary>
    </section>
  );
}
