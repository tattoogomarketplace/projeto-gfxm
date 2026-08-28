'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTattooMachine } from '@/hooks/use-tattoo-machine';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { motion, AnimatePresence } from 'framer-motion';

interface TattooOTPInputProps {
  onComplete: (otp: string) => Promise<boolean>;
  length?: number;
}

/**
 * TATTOOGO MK - COMPONENTE DE INPUT DE OTP "MÁQUINA DE TATUAR"
 * Unifica a lógica de entrada, animação de escrita e feedback sensorial.
 */
export function TattooOTPInput({ onComplete, length = 6 }: TattooOTPInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const [error, setError] = useState(false);
  const { startTattooing, stopTattooing } = useTattooMachine();
  const { triggerHaptic } = useHapticFeedback();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleInput = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    // Sincronia: Start no primeiro dígito
    if (digits.every(d => d === '') && value !== '') {
      startTattooing();
    }

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Haptic por dígito (Padrão Apple-Tier)
    if (value !== '') {
      triggerHaptic('light');
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit no 6º dígito
    if (newDigits.every(d => d !== '')) {
      handleSubmit(newDigits.join(''));
    }
  };

  const handleSubmit = async (otp: string) => {
    const success = await onComplete(otp);
    if (success) {
      stopTattooing(true);
      setError(false);
    } else {
      setError(true);
      stopTattooing(false);
      // Feedback de erro visual (Shake) e reseta após animação
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((digit, index) => (
        <motion.input
          key={index}
          ref={(el: HTMLInputElement | null) => { inputRefs.current[index] = el; }}
          type="text"
          maxLength={1}
          value={digit}
          onChange={(e) => handleInput(index, e.target.value)}
          animate={error ? { x: [-5, 5, -5, 5, 0] } : {}}
          className={`w-12 h-16 text-center text-2xl font-bold bg-zinc-900 border-2 rounded-xl transition-colors
            ${error ? 'border-red-500 text-red-500' : 'border-zinc-700 text-white focus:border-orange-500'}`}
        />
      ))}
    </div>
  );
}

