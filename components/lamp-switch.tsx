import { useState } from "react";
import { motion } from "framer-motion";

export default function LampSwitch({ onToggle }) {
  const [pulled, setPulled] = useState(false);

  const handlePull = () => {
    setPulled(true);
    setTimeout(() => {
      setPulled(false);
      onToggle();
    }, 300);
  };

  return (
    <div className="absolute top-0 right-10 flex flex-col items-center">
      <div className="w-1 h-20 bg-zinc-700" />
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handlePull}
        className={`w-12 h-12 rounded-full shadow-lg ${
          pulled ? "bg-orange-600 scale-110" : "bg-orange-500"
        } transition-colors duration-200 border-4 border-zinc-950`}
      />
    </div>
  );
}
