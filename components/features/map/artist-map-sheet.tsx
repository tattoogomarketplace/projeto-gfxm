'use client';

import { useRouter } from 'next/navigation';
import { ReviewStars } from '@/components/features/feedback-card';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
} from '@/components/ui/drawer';
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
    <Drawer
      open={Boolean(artist)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DrawerContent
        overlayClassName="z-40 bg-black/25"
        className="z-50 mt-24 h-auto max-h-[100dvh]"
        aria-label={name}
      >
        <DrawerBody className="px-6 pb-2 pt-2">
          <div className="flex items-center gap-4">
            {artist?.avatarUrl ? (
              <OptimizedImage
                src={artist.avatarUrl}
                alt={name}
                className="h-16 w-16 min-h-16 min-w-16 shrink-0 overflow-hidden rounded-full border border-orange-500/40"
              />
            ) : (
              <span className="flex h-16 w-16 min-h-16 min-w-16 shrink-0 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/15 text-xl font-semibold text-orange-400">
                {artist?.initial || name.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[17px] font-semibold tracking-tight text-white">
                {name}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <ReviewStars rating={artist?.rating ?? 0} size="md" />
                <span className="text-[13px] font-medium text-zinc-400">{style}</span>
              </div>
            </div>
          </div>
        </DrawerBody>
        <DrawerFooter>
          <button
            type="button"
            onClick={openProfile}
            className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-orange-500 px-4 text-[15px] font-semibold text-white transition-transform active:scale-[0.98]"
          >
            {t('map.viewFullProfile')}
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
