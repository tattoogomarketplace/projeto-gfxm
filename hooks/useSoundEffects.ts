'use client';

import { useCallback, useEffect, useRef } from 'react';

export const useSoundEffects = () => {
  const tattooAudio = useRef<HTMLAudioElement | null>(null);
  const successAudio = useRef<HTMLAudioElement | null>(null);
  const errorCtx = useRef<AudioContext | null>(null);

  const stopTattoo = useCallback(() => {
    const audio = tattooAudio.current;
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.loop = false;
    } catch {
      return;
    }
  }, []);

  const playTattoo = useCallback(() => {
    if (typeof window === 'undefined') return;
    stopTattoo();
    const audio = new Audio('/tattoo-machine.mp3');
    audio.volume = 0.5;
    audio.loop = true;
    tattooAudio.current = audio;
    audio.play().catch(() => {});
  }, [stopTattoo]);

  const playSuccess = useCallback(() => {
    stopTattoo();
    if (typeof window === 'undefined') return;
    const audio = new Audio('/notification-soft.mp3');
    audio.volume = 0.3;
    successAudio.current = audio;
    audio.play().catch(() => {});
  }, [stopTattoo]);

  const playError = useCallback(() => {
    stopTattoo();
    if (typeof window === 'undefined') return;
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = errorCtx.current && errorCtx.current.state !== 'closed'
      ? errorCtx.current
      : new AudioContextCtor();
    errorCtx.current = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }, [stopTattoo]);

  const triggerHaptic = useCallback((pattern: number | number[] = 50) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTattoo();
      if (successAudio.current) {
        successAudio.current.pause();
        successAudio.current = null;
      }
    };
  }, [stopTattoo]);

  return { playTattoo, playSuccess, playError, stopTattoo, triggerHaptic };
};
