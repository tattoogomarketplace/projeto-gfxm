/**
 * TATTOOGO MK - HOOK DE SINTETIZAÇÃO DE MÁQUINA DE TATUAR (CPU-GENERATED)
 * Unifica a experiência imersiva para Cadastro (OTP) e Cancelamento (Seguro).
 * 
 * ATENÇÃO: Atende ao Requisito 1 do Protocolo Mestre (Sincronia Sensorial).
 */
import { useState, useCallback, useRef } from 'react';
import { useHapticFeedback } from './use-haptic-feedback';

export const useTattooMachine = () => {
  const [isTattooing, setIsTattooing] = useState(false);
  const audioCtx = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);
  const { triggerHaptic } = useHapticFeedback();

  const startTattooing = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    // Inicializa o contexto de áudio (se não existir)
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    setIsTattooing(true);
    
    // Sintetiza o som de "bater" da máquina (frequência baixa/pulsante)
    oscillator.current = audioCtx.current.createOscillator();
    const gainNode = audioCtx.current.createGain();
    
    oscillator.current.type = 'square';
    oscillator.current.frequency.setValueAtTime(60, audioCtx.current.currentTime);
    gainNode.gain.setValueAtTime(0.05, audioCtx.current.currentTime); // Volume controlado
    
    oscillator.current.connect(gainNode);
    gainNode.connect(audioCtx.current.destination);
    
    oscillator.current.start();
  }, []);

  const stopTattooing = useCallback((success: boolean = false) => {
    setIsTattooing(false);
    
    if (oscillator.current) {
      oscillator.current.stop();
      oscillator.current.disconnect();
      oscillator.current = null;
    }
    
    if (success && audioCtx.current) {
      triggerHaptic('success');
      // Pequeno "beep" de conclusão sintetizado
      const osc = audioCtx.current.createOscillator();
      const gain = audioCtx.current.createGain();
      
      osc.frequency.setValueAtTime(880, audioCtx.current.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.current.currentTime);
      
      osc.connect(gain);
      gain.connect(audioCtx.current.destination);
      
      osc.start();
      osc.stop(audioCtx.current.currentTime + 0.2);
    }
  }, [triggerHaptic]);

  return { isTattooing, startTattooing, stopTattooing };
};
