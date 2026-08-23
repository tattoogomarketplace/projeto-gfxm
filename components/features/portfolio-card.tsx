'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';

interface PortfolioCardProps {
  id: string;
  imageUrl: string;
  artistName: string;
}

export function PortfolioCard({ id, imageUrl, artistName }: PortfolioCardProps) {
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = () => {
    // Optimistic UI Update
    setIsLiked(!isLiked);
    
    // Haptic Feedback (Apple-tier experience)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="group bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl overflow-hidden shadow-lg transition-all"
    >
      <div className="relative h-64 w-full overflow-hidden">
        <img src={imageUrl} alt="Tattoo" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
      </div>
      
      <div className="p-4 flex justify-between items-center bg-zinc-950/30">
        <span className="text-zinc-300 font-medium">{artistName}</span>
        <button onClick={handleLike} className="relative p-2">
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
        </button>
      </div>
    </motion.div>
  );
}
