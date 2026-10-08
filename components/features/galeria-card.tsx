'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MapPin, MessageCircle } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import {
  bodyPartLabel,
  healingLabel,
  sessionDurationLabel,
  styleLabel,
} from '@/lib/portfolio-metadata';
import type { GaleriaItem } from '@/lib/types/galeria';
import { cn } from '@/lib/utils';

type GaleriaCardProps = {
  item: GaleriaItem;
  onStartConversation: (tatuadorId: string, artworkId: string) => void;
};

export function GaleriaCard({ item, onStartConversation }: GaleriaCardProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(item.likesCount);
  const { triggerHaptic } = useHapticFeedback();
  const enqueue = useOfflineQueue((s) => s.enqueue);

  const openArtistProfile = () => {
    triggerHaptic('light');
    router.push(`/dashboard/artista/${encodeURIComponent(item.tatuadorId)}`);
  };

  const artistName = item.artist?.name || 'Artista';
  const studioName = item.artist?.studio?.name;
  const location =
    item.artist?.cidade && item.artist?.estado
      ? `${item.artist.cidade}/${item.artist.estado}`
      : item.artist?.cidade || null;

  const handleLike = async () => {
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikes((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    triggerHaptic('medium');

    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    if (!online) {
      enqueue('like', { id: item.id });
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('tattoogo_token') : null;
      const res = await fetch(`/api/portfolio/like/${item.id}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const payload = await res.json();
      if (typeof payload.likes_count === 'number') setLikes(payload.likes_count);
    } catch {
      enqueue('like', { id: item.id });
    }
  };

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="group relative break-inside-avoid overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm backdrop-blur-md transition-all hover:border-orange-500/50 hover:shadow-[0_0_32px_rgba(249,115,22,0.22)] dark:border-neutral-800 dark:bg-[#0a0a0a] dark:shadow-lg"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-orange-500/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative aspect-[3/4] w-full overflow-hidden">
        <OptimizedImage
          src={item.imageUrl}
          alt={`${styleLabel(item.style)} por ${artistName}`}
          className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <button
          type="button"
          onClick={openArtistProfile}
          className="absolute inset-0 z-[1]"
          aria-label={`Abrir vitrine de ${artistName}`}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80" />

        <div className="pointer-events-none absolute left-3 top-3 z-[2] flex flex-wrap gap-1.5">
          <span className="rounded-full border border-orange-500/40 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-300 backdrop-blur-md">
            {styleLabel(item.style)}
          </span>
          <span
            className={cn(
              'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-md',
              item.isHealed
                ? 'border-emerald-400/40 bg-black/55 text-emerald-300'
                : 'border-orange-500/40 bg-black/55 text-orange-300'
            )}
          >
            {healingLabel(item.isHealed)}
          </span>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] p-3 opacity-100 sm:translate-y-2 sm:opacity-0 sm:transition-all sm:duration-300 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
          <div className="rounded-xl border border-white/10 bg-black/55 p-3 backdrop-blur-xl">
            <div className="flex w-full items-center gap-2 text-left">
              <span className="flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-full border border-orange-500/40 bg-[#1a1a1a] text-sm font-semibold uppercase text-orange-400">
                {item.artist?.initial || artistName.charAt(0) || 'A'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{artistName}</p>
                <p className="truncate text-[11px] text-zinc-400">
                  {studioName ? studioName : 'Artista independente'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 bg-neutral-50 p-4 dark:bg-[#0a0a0a]">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={openArtistProfile}
            className="min-w-0 flex-1 text-left"
            aria-label={`Abrir vitrine de ${artistName}`}
          >
            <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{artistName}</p>
            <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-zinc-400">
              {studioName || 'Artista independente'}
            </p>
            {location ? (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500 dark:text-zinc-500">
                <MapPin className="h-3 w-3" strokeWidth={1.75} />
                {location}
              </p>
            ) : null}
          </button>
          <button
            type="button"
            onClick={handleLike}
            className="relative flex min-h-11 min-w-11 items-center gap-1.5 p-2 active:scale-95"
            aria-label={isLiked ? 'Remover curtida' : 'Curtir arte'}
          >
            <AnimatePresence>
              <motion.div
                key={isLiked ? 'liked' : 'unliked'}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              >
                <Heart
                  className={isLiked ? 'fill-orange-500 text-orange-500' : 'text-neutral-400 hover:text-orange-500 dark:text-zinc-500 dark:hover:text-zinc-300'}
                  size={22}
                />
              </motion.div>
            </AnimatePresence>
            <span className={isLiked ? 'font-medium text-orange-600 dark:text-orange-400' : 'font-medium text-neutral-500 dark:text-zinc-400'}>
              {likes}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {item.bodyPart ? (
            <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:border-neutral-700 dark:bg-transparent dark:text-zinc-400">
              {bodyPartLabel(item.bodyPart)}
            </span>
          ) : null}
          {item.sessionDuration ? (
            <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:border-neutral-700 dark:bg-transparent dark:text-zinc-400">
              {sessionDurationLabel(item.sessionDuration)}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onStartConversation(item.tatuadorId, item.id);
          }}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 text-sm font-semibold text-orange-600 shadow-[0_0_16px_rgba(249,115,22,0.18)] transition-all hover:border-orange-500 hover:bg-orange-500/20 hover:shadow-[0_0_24px_rgba(249,115,22,0.32)] active:scale-[0.98] dark:text-orange-300"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
          Iniciar Conversa / Orçamento
        </button>
      </div>
    </motion.article>
  );
}
