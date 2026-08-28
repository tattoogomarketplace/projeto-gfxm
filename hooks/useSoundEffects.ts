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

  const playError = () => {
    // Usando uma frequência sonora via Web Audio API para evitar dependência de arquivos externos que podem quebrar
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  const triggerHaptic = (pattern: number | number[] = 50) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  return { playTattoo, playSuccess, playError, triggerHaptic };
};

