

'use client';

export const useSoundEffects = () => {
  const playTattoo = () => {
    const audio = new Audio('/tattoo-machine.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  const playSuccess = () => {
    const audio = new Audio('/notification-soft.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  return { playTattoo, playSuccess };
};
