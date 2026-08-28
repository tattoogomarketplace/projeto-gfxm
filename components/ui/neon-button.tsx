import React from 'react';
import { useSoundEffects } from '@/hooks/useSoundEffects';

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const NeonButton = ({ children, className = '', ...props }: NeonButtonProps) => {
  const { triggerHaptic } = useSoundEffects();

  return (
    <button
    className={`bg-neon-orange hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(249,115,22,0.5)] hover:shadow-[0_0_25px_rgba(249,115,22,0.8)] ${className}`}
    {...props}
      onMouseDown={() => triggerHaptic(20)}
      onTouchStart={() => triggerHaptic(20)}
  >
    {children}
  </button>
);
};

