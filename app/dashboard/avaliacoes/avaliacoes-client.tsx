'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FeedbackCard, FeedbackCardSkeleton } from '@/components/features/feedback-card';
import { reviewDestination } from '@/components/features/home-feedback-carousel';
import { useFeaturedReviews } from '@/hooks/use-featured-reviews';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { hydrateGridItems } from '@/lib/grid-hydration';
import { PLACEHOLDER_REVIEWS } from '@/lib/review-mock';

export default function AvaliacoesClient() {
  const { t } = useI18n();
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const { data } = useFeaturedReviews();
  const reviews = hydrateGridItems(
    Array.isArray(data) ? data.filter((item) => item?.id && item.content) : [],
    PLACEHOLDER_REVIEWS
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 pb-24 pt-4">
      <header className="mb-6 space-y-1">
        <h1 className="text-[22px] font-bold tracking-tight text-white">{t('home.reviews')}</h1>
        <p className="text-sm text-zinc-400">{t('home.reviewsSubtitle')}</p>
      </header>

      {reviews.length === 0 ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((index) => (
            <FeedbackCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((review) => (
            <li key={review.id} className="w-full">
              <FeedbackCard
                review={review}
                className="w-full"
                onOpen={() => {
                  triggerHaptic('light');
                  router.push(reviewDestination(review));
                }}
                onPointerDown={() => undefined}
                onPointerMove={() => undefined}
                onPointerUp={() => undefined}
                onPointerCancel={() => undefined}
                onPointerLeave={() => undefined}
              />
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/dashboard/galeria"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-orange-500/40 bg-orange-500/15 px-4 text-sm font-semibold text-orange-300"
      >
        {t('home.ctaInspireMore')}
      </Link>
    </div>
  );
}
