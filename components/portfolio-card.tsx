"use client";
import { useState } from "react";
import { Heart } from "lucide-react";

export default function PortfolioCard({ id, imageUrl, title }) {
  const [liked, setLiked] = useState(false);

  const handleLike = () => {
    // Optimistic UI update
    setLiked(!liked);
    // Silent background fetch to backend
    fetch(`/api/portfolio/like/${id}`, { method: 'POST' }).catch(console.error);
  };

  return (
    <div className="group relative bg-zinc-900 rounded-xl overflow-hidden cursor-pointer border border-zinc-800 hover:border-orange-500/50 transition-colors">
      <img src={imageUrl} alt={title} className="w-full h-64 object-cover" />
      <div className="p-4 flex justify-between items-center">
        <h3 className="text-white font-semibold">{title}</h3>
        <button 
          onClick={handleLike}
          className={`transition-colors ${liked ? "text-orange-500" : "text-zinc-600 hover:text-zinc-400"}`}
        >
          <Heart fill={liked ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}
