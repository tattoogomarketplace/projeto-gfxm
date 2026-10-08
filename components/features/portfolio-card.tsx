'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { bodyPartLabel, healingLabel, sessionDurationLabel, styleLabel } from '@/lib/portfolio-metadata';

interface PortfolioCardProps {
  id: string;
  imageUrl: string;
  artistName: string;
  initialLikes?: number;
  style?: string;
  bodyPart?: string;
  sessionDuration?: string;
  isHealed?: boolean;
}

export function PortfolioCard({
  id,
  imageUrl,
  artistName,
  initialLikes = 0,
  style,
  bodyPart,
  sessionDuration,
  isHealed,
}: PortfolioCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);
  const { triggerHaptic } = useHapticFeedback();
  const enqueue = useOfflineQueue((s) => s.enqueue);

  const handleLike = async () => {
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikes((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    triggerHaptic('medium');

    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    if (!online) {
      enqueue('like', { id });
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('tattoogo_token') : null;
      const res = await fetch(`/api/portfolio/like/${id}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const payload = await res.json();
      if (typeof payload.likes_count === 'number') setLikes(payload.likes_count);
    } catch (error) {
      console.error("Erro na sincronia com backend:", error);
      enqueue('like', { id });
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="group relative w-full shrink-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm backdrop-blur-md transition-all hover:border-orange-500/40 hover:shadow-[0_0_30px_rgba(249,115,22,0.18)] dark:border-neutral-800 dark:bg-[#0a0a0a] dark:shadow-lg sm:w-[calc(50%-1rem)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative h-64 w-full overflow-hidden">
        <OptimizedImage src={imageUrl} alt="Tattoo" className="w-full h-full" />
      </div>
      
      <div className="flex items-center justify-between bg-neutral-50 p-4 dark:bg-[#0a0a0a]">
        <div className="min-w-0 flex-1 pr-3">
          <span className="block truncate font-medium text-neutral-800 dark:text-zinc-300">{artistName}</span>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {style ? (
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-400">
                {styleLabel(style)}
              </span>
            ) : null}
            {bodyPart ? (
              <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                {bodyPartLabel(bodyPart)}
              </span>
            ) : null}
            {sessionDuration ? (
              <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                {sessionDurationLabel(sessionDuration)}
              </span>
            ) : null}
            {typeof isHealed === 'boolean' ? (
              <span
                className={
                  isHealed
                    ? 'rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300'
                    : 'rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-300'
                }
              >
                {healingLabel(isHealed)}
              </span>
            ) : null}
          </div>
        </div>
        <button onClick={handleLike} className="relative flex min-h-11 min-w-11 items-center gap-2 p-2 active:scale-95">
          <AnimatePresence>
            <motion.div
              key={isLiked ? "liked" : "unliked"}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              <Heart 
                className={isLiked ? "fill-orange-500 text-orange-500" : "text-zinc-500 hover:text-zinc-300"} 
                size={24} 
              />
            </motion.div>
          </AnimatePresence>
          <span className={isLiked ? "text-orange-400 font-medium" : "text-zinc-400 font-medium"}>{likes}</span>
        </button>
      </div>
    </motion.div>
  );
}

