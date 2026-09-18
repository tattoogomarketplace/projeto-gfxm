'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useOfflineQueue } from '@/hooks/use-offline-queue';

interface PortfolioCardProps {
  id: string;
  imageUrl: string;
  artistName: string;
  initialLikes?: number;
}

export function PortfolioCard({ id, imageUrl, artistName, initialLikes = 0 }: PortfolioCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);
  const { triggerHaptic } = useHapticFeedback();
  const enqueue = useOfflineQueue((s) => s.enqueue);

  const handleLike = async () => {
    const nextLiked = !isLiked;

    setIsLiked(nextLiked);
    setLikes((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    triggerHaptic(nextLiked ? 'medium' : 'light');
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(nextLiked ? 24 : 12);
    }

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
      className="group shrink-0 w-full sm:w-[calc(50%-1rem)] bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl overflow-hidden shadow-lg transition-all"
    >
      <div className="relative h-64 w-full overflow-hidden">
        <OptimizedImage src={imageUrl} alt="Tattoo" className="w-full h-full" />
      </div>
      
      <div className="p-4 flex justify-between items-center bg-zinc-950/30">
        <span className="text-zinc-300 font-medium">{artistName}</span>
        <button
          type="button"
          onClick={handleLike}
          aria-pressed={isLiked}
          aria-label={isLiked ? 'Remover curtida' : 'Curtir'}
          className="relative flex min-h-11 min-w-11 items-center gap-2 p-2 active:scale-95"
        >
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
          <span className="text-zinc-400 font-medium">{likes}</span>
        </button>
      </div>
    </motion.div>
  );
}
