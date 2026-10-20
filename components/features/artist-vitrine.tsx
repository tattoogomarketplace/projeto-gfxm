'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BadgeCheck, CalendarDays, Star } from 'lucide-react';
import { AtomicBookingSheet } from '@/components/features/atomic-booking-sheet';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useUiStore } from '@/hooks/use-ui-store';
import { useI18n } from '@/hooks/use-i18n';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';
import type { PublicArtistVitrine } from '@/lib/services/artist-vitrine';
import { cn } from '@/lib/utils';

type ArtistVitrineProps = {
  vitrine: PublicArtistVitrine;
};

export function ArtistVitrine({ vitrine }: ArtistVitrineProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { styleLabel, bodyPartLabel, sessionDurationLabel } = portfolioLabelResolver(t);
  const { triggerHaptic } = useHapticFeedback();
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const role = useAuthStore((s) => s.role);

  const { artist, items, availableSlots } = vitrine;
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingArtworkId, setBookingArtworkId] = useState<string | undefined>();
  const bookingArtwork = useMemo(
    () => items.find((item) => item.id === bookingArtworkId) ?? null,
    [items, bookingArtworkId]
  );

  const openBooking = (artworkId?: string) => {
    triggerHaptic('medium');
    setBookingArtworkId(artworkId);
    setBookingOpen(true);
  };

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

  return (
    <div className="relative overflow-x-hidden bg-zinc-950 pb-24 text-white">
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
            className="mt-5 flex min-h-12 w-full items-center justify-center rounded-2xl bg-orange-500 px-4 text-[15px] font-semibold text-white transition-transform active:scale-[0.98]"
          >
            {t('vitrine.requestQuote')}
          </button>
        </div>
      </header>

      <section className="relative mt-8 space-y-3 px-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
          {t('vitrine.portfolio')}
        </h2>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center dark:border-white/[0.05] dark:bg-white/[0.03]">
            <p className="text-sm text-neutral-500 dark:text-zinc-400">{t('vitrine.empty')}</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none"
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <OptimizedImage
                    src={item.imageUrl}
                    alt={styleLabel(item.style)}
                    className="h-full w-full"
                  />
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">{styleLabel(item.style)}</span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide',
                        item.isHealed
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/40 dark:text-emerald-300'
                          : 'border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-300'
                      )}
                    >
                      {item.isHealed ? t('portfolio.healed') : t('portfolio.fresh')}
                    </span>
                  </div>
                  {item.descricao ? (
                      <p className="line-clamp-3 text-xs leading-relaxed text-neutral-500 dark:text-zinc-400">{item.descricao}</p>
                  ) : null}
                  <p className="text-xs text-neutral-500 dark:text-zinc-500">
                    {bodyPartLabel(item.bodyPart)} · {sessionDurationLabel(item.sessionDuration)}
                  </p>
                  <button
                    type="button"
                    onClick={() => openBooking(item.id)}
                    disabled={!artist.bookingEnabled}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 text-sm font-semibold text-orange-600 transition-all hover:border-orange-500 hover:bg-orange-500/20 active:scale-[0.98] disabled:opacity-40 dark:text-orange-300"
                  >
                    <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
                    {t('vitrine.bookThis')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AtomicBookingSheet
        artistId={artist.id}
        artistName={artist.name || t('welcome.artistFallback')}
        slots={availableSlots}
        artworkId={bookingArtwork?.id}
        artworkLabel={
          bookingArtwork
            ? `${styleLabel(bookingArtwork.style)} · ${bodyPartLabel(bookingArtwork.bodyPart)}`
            : undefined
        }
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onBooked={() => {
          setActiveTab('agendar');
          router.push(`${dashboardPathForRole(role)}?tab=agendar`);
        }}
      />
    </div>
  );
}
