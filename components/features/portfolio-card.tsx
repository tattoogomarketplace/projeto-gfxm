'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';

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

  const handleLike = async () => {
    // Optimistic UI Update
    const previousLiked = isLiked;
    const previousLikes = likes;
    
    setIsLiked(!isLiked);
    setLikes(prev => isLiked ? prev - 1 : prev + 1);

    // Haptic Feedback (Apple-tier experience)
    triggerHaptic('medium');

    // Sincronia com o Backend
    try {
      const res = await fetch(`/api/portfolio/like/${id}`, { method: 'POST' });
      if (!res.ok) throw new Error();
    } catch (error) {
      console.error("Erro na sincronia com backend:", error);
      setIsLiked(previousLiked);
      setLikes(previousLikes);
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
        <button onClick={handleLike} className="relative p-2 flex items-center gap-2">
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

