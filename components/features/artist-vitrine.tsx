'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, BadgeCheck, MapPin, Star } from 'lucide-react';
import { FeedbackCard } from '@/components/features/feedback-card';
import { reviewDestination } from '@/components/features/home-feedback-carousel';
import { QuoteRequestSheet } from '@/components/features/quote-request-sheet';
import { ReviewHapticPreview } from '@/components/features/review-haptic-preview';
import { NATIVE_APP_IMAGE_STYLE, OptimizedImage } from '@/components/ui/optimized-image';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { useLongPressPreview } from '@/hooks/use-long-press-preview';
import { useUiStore } from '@/hooks/use-ui-store';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';
import type { PublicArtistVitrine } from '@/lib/services/artist-vitrine';
import type { GeoAddress } from '@/lib/types/geo';
import type { ReviewDto } from '@/lib/types/review';
import { cn } from '@/lib/utils';

type ProfileTab = 'portfolio' | 'reviews' | 'about';

type ArtistVitrineProps = {
  vitrine: PublicArtistVitrine;
};

export function ArtistVitrine({ vitrine }: ArtistVitrineProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { styleLabel } = portfolioLabelResolver(t);
  const { triggerHaptic } = useHapticFeedback();
  const setPendingChatPeer = useUiStore((s) => s.setPendingChatPeer);
  const setActiveTabNav = useUiStore((s) => s.setActiveTab);

  const { artist, items, reviews } = vitrine;
  const [activeTab, setActiveTab] = useState<ProfileTab>('portfolio');
  const [preview, setPreview] = useState<ReviewDto | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const longPress = useLongPressPreview();

  const goBack = () => {
    triggerHaptic('light');
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/dashboard/artistas');
  };

  const handle = artist.username ? `@${artist.username}` : null;
  const ratingLabel = artist.reviewCount > 0 ? artist.rating.toFixed(1) : '—';
  const addressLabel = formatArtistAddress(artist.address, artist.cidade, artist.estado);
  const hasCoordinates = artist.latitude != null && artist.longitude != null;
  const bio = [
    artist.studio?.name || t('vitrine.independent'),
    artist.styles.map((style) => styleLabel(style)).filter(Boolean).join(' · '),
    addressLabel,
  ]
    .filter(Boolean)
    .join('. ');

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

  const openQuoteSheet = () => {
    triggerHaptic('medium');
    setQuoteOpen(true);
  };

  const closeQuoteSheet = useCallback(() => setQuoteOpen(false), []);

  const submitQuote = useCallback(
    (result: { artistId: string }) => {
      triggerHaptic('medium');
      setQuoteOpen(false);
      setPendingChatPeer(result.artistId);
      setActiveTabNav('chat');
      router.push(`/dashboard/chat?artistId=${encodeURIComponent(result.artistId)}`);
    },
    [router, setActiveTabNav, setPendingChatPeer, triggerHaptic]
  );

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
    <div className="absolute inset-0 z-0 min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-none bg-zinc-950 pb-[calc(env(safe-area-inset-bottom)+6rem)] text-white [-webkit-overflow-scrolling:touch]">
      <header className="relative">
        <div className="relative h-48 w-full md:h-64">
          {artist.coverUrl ? (
            <OptimizedImage
              src={artist.coverUrl}
              alt={artist.name || t('welcome.artistFallback')}
              className="h-full w-full"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-zinc-800 via-zinc-950 to-orange-950/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-black/20" />
          <button
            type="button"
            onClick={goBack}
            aria-label={t('common.back')}
            className="absolute left-4 top-[env(safe-area-inset-top)] z-20 inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-zinc-950/70 text-white backdrop-blur-md"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.9} />
          </button>
          <span className="absolute -bottom-8 left-6 z-20 flex h-24 w-24 overflow-hidden rounded-full border-4 border-zinc-950 bg-zinc-900">
            {artist.avatarUrl ? (
              <OptimizedImage
                src={artist.avatarUrl}
                alt={artist.name || t('welcome.artistFallback')}
                className="h-full w-full rounded-full"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-semibold uppercase text-orange-400">
                {artist.initial}
              </span>
            )}
          </span>
        </div>

        <div className="px-6 pt-10">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-2xl font-bold text-zinc-100">
              {artist.name || t('welcome.artistFallback')}
            </h1>
            {artist.kycApproved ? (
              <BadgeCheck className="h-5 w-5 shrink-0 text-orange-400" strokeWidth={2.2} />
            ) : null}
          </div>
          {handle ? (
            <p className="mt-1 truncate text-sm text-zinc-400">{handle}</p>
          ) : (
            <p className="mt-1 truncate text-sm text-zinc-400">
              {artist.studio?.name || t('vitrine.independent')}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-8 items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 text-[12px] font-medium text-zinc-200">
              <Star className="h-3.5 w-3.5 fill-orange-400 text-orange-400" strokeWidth={1.75} />
              {ratingLabel}
            </span>
            <span className="inline-flex min-h-8 items-center rounded-full border border-zinc-800 bg-zinc-900/70 px-3 text-[12px] font-medium text-zinc-300">
              {artist.reviewCount} {t('home.reviews')}
            </span>
            {artist.styles.map((style) => (
              <span
                key={style}
                className="inline-flex min-h-8 items-center rounded-full border border-zinc-800 bg-zinc-900/70 px-3 text-[12px] font-medium text-zinc-300"
              >
                {styleLabel(style)}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={openQuoteSheet}
            className="mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl bg-orange-500 px-4 text-[15px] font-semibold text-white transition-transform active:scale-[0.98]"
          >
            {t('vitrine.requestQuote')}
          </button>
        </div>
      </header>

      <nav
        className="sticky top-0 z-40 mt-6 border-b border-zinc-800 bg-zinc-950/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl"
        aria-label={t('vitrine.badge')}
      >
        <div className="grid grid-cols-3">
          {(
            [
              { id: 'portfolio', label: t('vitrine.portfolio') },
              { id: 'reviews', label: t('vitrine.reviews') },
              { id: 'about', label: t('vitrine.about') },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveTab(tab.id);
                }}
                className={cn(
                  'relative flex min-h-11 items-center justify-center px-2 text-[13px] tracking-wide transition-colors',
                  isActive
                    ? 'font-semibold text-zinc-100'
                    : 'font-medium text-zinc-500'
                )}
              >
                {tab.label}
                {isActive ? (
                  <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-orange-500" />
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      <div className={activeTab === 'portfolio' ? undefined : 'hidden'}>
        {items.length === 0 ? (
          <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-zinc-500">
            {t('vitrine.empty')}
          </div>
        ) : (
          <ul className="grid w-full grid-cols-3 gap-[1px] md:gap-0.5">
            {items.map((item) => (
              <li key={item.id} className="relative aspect-[9/16] w-full overflow-hidden bg-white/5">
                <Image
                  src={item.imageUrl}
                  alt={styleLabel(item.style)}
                  fill
                  sizes="(max-width: 768px) 33vw, 240px"
                  className="h-full w-full object-cover select-none transform-gpu will-change-transform"
                  style={NATIVE_APP_IMAGE_STYLE}
                  draggable={false}
                  onDragStart={(event) => event.preventDefault()}
                  onContextMenu={(event) => event.preventDefault()}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={activeTab === 'reviews' ? undefined : 'hidden'}>
        {reviews.length === 0 ? (
          <div className="flex min-h-[50vh] items-center justify-center px-6 text-center text-sm text-zinc-500">
            {t('home.noFeaturedReviews')}
          </div>
        ) : (
          <ul className="flex flex-col gap-4 p-4">
            {reviews.map((review) => (
              <li key={review.id} className="w-full">
                <FeedbackCard
                  review={review}
                  className="w-full"
                  onOpen={(event) => openReview(review, event)}
                  onPointerDown={longPress.start(() => firePreview(review))}
                  onPointerMove={longPress.move}
                  onPointerUp={longPress.cancel}
                  onPointerCancel={longPress.cancel}
                  onPointerLeave={longPress.cancel}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className={cn(
          'min-h-[50vh] flex-col gap-6 p-6 leading-relaxed text-zinc-300',
          activeTab === 'about' ? 'flex' : 'hidden'
        )}
      >
        <p>{bio || t('profile.bioEmpty')}</p>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-400">
            {t('vitrine.location')}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl">
            <div className="relative flex min-h-36 items-center gap-3 bg-gradient-to-br from-zinc-800 via-zinc-950 to-orange-950/30 px-4 py-5">
              <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/15 text-orange-400">
                <MapPin className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-zinc-200">
                  {addressLabel || t('vitrine.independent')}
                </p>
                {hasCoordinates ? (
                  <p className="mt-1 text-[11px] tabular-nums text-zinc-500">
                    {artist.latitude?.toFixed(5)}, {artist.longitude?.toFixed(5)}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                router.push('/dashboard/mapa');
              }}
              className="flex min-h-11 w-full items-center justify-center border-t border-white/10 px-4 text-[13px] font-semibold text-orange-300"
            >
              {t('vitrine.viewOnMap')}
            </button>
          </div>
        </section>
      </div>

      <ReviewHapticPreview
        review={preview}
        onDismiss={dismissPreview}
        onViewFull={viewFullReview}
      />

      <QuoteRequestSheet
        open={quoteOpen}
        artistId={artist.id}
        onClose={closeQuoteSheet}
        onSuccess={submitQuote}
      />
    </div>
  );
}

function formatArtistAddress(
  address: GeoAddress | null,
  cidade: string | null,
  estado: string | null
): string {
  if (address) {
    const line = [address.street, address.city, address.state, address.zip]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ');
    if (line) return line;
  }
  if (cidade && estado) return `${cidade}/${estado}`;
  return cidade || estado || '';
}
