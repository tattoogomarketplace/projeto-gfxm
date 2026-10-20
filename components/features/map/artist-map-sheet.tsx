'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ReviewStars } from '@/components/features/feedback-card';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { mapArtistProfileHref, type MapArtistPin } from '@/lib/map-pins';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';

type ArtistMapSheetProps = {
  artist: MapArtistPin | null;
  onClose: () => void;
};

export function ArtistMapSheet({ artist, onClose }: ArtistMapSheetProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const { styleLabel } = portfolioLabelResolver(t);
  const name = artist?.name?.trim() || t('welcome.artistFallback');
  const roleLabel =
    artist?.role === 'estudio' ? t('role.estudio.label') : t('role.tatuador.label');
  const style = artist?.style ? styleLabel(artist.style) : roleLabel;

  const openProfile = () => {
    if (!artist) return;
    triggerHaptic('medium');
    router.push(mapArtistProfileHref(artist.id));
  };

  return (
    <AnimatePresence>
      {artist ? (
        <>
          <motion.button
            key="map-sheet-backdrop"
            type="button"
            aria-label={t('common.back')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 cursor-default bg-black/25"
          />
          <motion.section
            key={artist.id}
            role="dialog"
            aria-modal="true"
            aria-label={name}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 42, mass: 0.9 }}
            className="fixed bottom-0 left-0 z-50 w-full rounded-t-3xl border-t border-zinc-800 bg-zinc-900 p-6 pb-[max(env(safe-area-inset-bottom),_1.5rem)]"
          >
            <span
              aria-hidden
              className="mx-auto h-1.5 w-12 rounded-full bg-zinc-700"
            />
            <div className="mt-5 flex items-center gap-4">
              {artist.avatarUrl ? (
                <OptimizedImage
                  src={artist.avatarUrl}
                  alt={name}
                  className="h-16 w-16 min-h-16 min-w-16 shrink-0 overflow-hidden rounded-full border border-orange-500/40"
                />
              ) : (
                <span className="flex h-16 w-16 min-h-16 min-w-16 shrink-0 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/15 text-xl font-semibold text-orange-400">
                  {artist.initial || name.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[17px] font-semibold tracking-tight text-white">
                  {name}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <ReviewStars rating={artist.rating} size="md" />
                  <span className="text-[13px] font-medium text-zinc-400">{style}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={openProfile}
              className="mt-6 flex min-h-12 w-full items-center justify-center rounded-2xl bg-orange-500 px-4 text-[15px] font-semibold text-white transition-transform active:scale-[0.98]"
            >
              {t('map.viewFullProfile')}
            </button>
          </motion.section>
        </>
      ) : null}
    </AnimatePresence>
  );
}
