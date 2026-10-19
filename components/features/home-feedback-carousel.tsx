'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { FeedbackCard, FeedbackCardSkeleton } from '@/components/features/feedback-card';
import { ReviewHapticPreview } from '@/components/features/review-haptic-preview';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useFeaturedReviews } from '@/hooks/use-featured-reviews';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { PLACEHOLDER_REVIEWS } from '@/lib/review-mock';
import type { ReviewDto } from '@/lib/types/review';

const CAROUSEL_CLASS =
  '-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 [-webkit-overflow-scrolling:touch] scrollbar-none sm:-mx-6 sm:px-6';

const LONG_PRESS_MS = 420;
const LONG_PRESS_MOVE_TOLERANCE = 10;

function isPlaceholderId(id: string | null | undefined): boolean {
  return !id || id.startsWith('ph-');
}

function reviewDestination(review: ReviewDto): string {
  return isPlaceholderId(review.targetId)
    ? '/dashboard/galeria'
    : `/profile/${encodeURIComponent(review.targetId)}`;
}

export function HomeFeedbackCarousel() {
  const { t } = useI18n();
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const { data, isLoading } = useFeaturedReviews();
  const [preview, setPreview] = useState<ReviewDto | null>(null);

  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClick = useRef(false);

  const cancelLongPress = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  }, []);

  useEffect(() => cancelLongPress, [cancelLongPress]);

  const reviews = useMemo<ReviewDto[]>(() => {
    const source = Array.isArray(data) ? data : [];
    const valid = source.filter((item) => item?.id && item.content);
    return valid.length > 0 ? valid : PLACEHOLDER_REVIEWS;
  }, [data]);

  const loading = isLoading && !data;

  const startLongPress = (review: ReviewDto) => (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    cancelLongPress();
    pressOrigin.current = { x: event.clientX, y: event.clientY };
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      pressOrigin.current = null;
      if (!review?.id) return;
      suppressNextClick.current = true;
      triggerHaptic('medium');
      setPreview(review);
    }, LONG_PRESS_MS);
  };

  const moveLongPress = (event: ReactPointerEvent<HTMLElement>) => {
    const origin = pressOrigin.current;
    if (!origin) return;
    if (
      Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > LONG_PRESS_MOVE_TOLERANCE
    ) {
      cancelLongPress();
    }
  };

  const openReview = (review: ReviewDto) => {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    triggerHaptic('light');
    setPreview(review);
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
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
            <Star className="h-4 w-4" strokeWidth={1.9} />
          </span>
          <h2 id="discover-reviews" className="text-base font-bold tracking-tight text-white">
            {t('home.featuredReviews')}
          </h2>
        </div>
      </div>

      <ErrorBoundary
        fallback={
          <div className="flex min-h-[13.5rem] items-center justify-center rounded-2xl border border-zinc-800/50 bg-zinc-900/40 px-4 py-6 text-center">
            <p className="text-sm text-zinc-400">{t('home.noFeaturedReviews')}</p>
          </div>
        }
      >
        {loading ? (
          <div className={CAROUSEL_CLASS} role="list" aria-label={t('home.featuredReviews')}>
            {[0, 1, 2].map((index) => (
              <FeedbackCardSkeleton key={index} />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex min-h-[8rem] items-center justify-center rounded-2xl border border-zinc-800/50 bg-zinc-900/40 px-4 py-6 text-center">
            <p className="text-sm text-zinc-400">{t('home.noFeaturedReviews')}</p>
          </div>
        ) : (
          <div className={CAROUSEL_CLASS} role="list" aria-label={t('home.featuredReviews')}>
            {reviews.map((review) => (
              <FeedbackCard
                key={review.id}
                review={review}
                onOpen={() => openReview(review)}
                onPointerDown={startLongPress(review)}
                onPointerMove={moveLongPress}
                onPointerUp={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onPointerLeave={cancelLongPress}
              />
            ))}
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
