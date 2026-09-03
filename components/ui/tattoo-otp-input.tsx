'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTattooMachine } from '@/hooks/use-tattoo-machine';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { motion, AnimatePresence } from 'framer-motion';

interface TattooOTPInputProps {
  onComplete: (otp: string) => Promise<boolean>;
  length?: number;
  userRole?: 'cliente' | 'tatuador' | 'estudio';
}

/**
 * TATTOOGO MK - COMPONENTE DE INPUT DE OTP "MÁQUINA DE TATUAR"
 * Unifica a lógica de entrada, animação de escrita e feedback sensorial.
 */
export function TattooOTPInput({ onComplete, length = 8, userRole = 'cliente' }: TattooOTPInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const [error, setError] = useState(false);
  const [message, setMessage] = useState('');
  const { startTattooing, stopTattooing, triggerError } = useTattooMachine();
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

    if (newDigits.every(d => d !== '')) {
      handleSubmit(newDigits.join(''));
    }
  };

  const handleSubmit = async (otp: string) => {
    const success = await onComplete(otp);

    const MESSAGES = {
      cliente: {
        success: "Jornada na pele iniciada! Sua próxima tattoo está sendo desenhada.",
        error: "Falha no traço. A tinta não fixou na pele. Verifique o código e tente novamente."
      },
      tatuador: {
        success: "Decalque confirmado. Máquina ligada, bem-vindo ao seu Atelier Digital.",
        error: "Máquina descalibrada. O traço tremeu e o código falhou. Refaça a calibragem."
      },
      estudio: {
        success: "Gestão master conectada. A agenda do seu império está online.",
        error: "Curto-circuito na bancada principal. Credenciais fiscais ou código inválidos."
      }
    };

    if (success) {
      setMessage(MESSAGES[userRole].success);
      stopTattooing(true);
      setError(false);
    } else {
      triggerError();
      setMessage(MESSAGES[userRole].error);
      setError(true);
      setTimeout(() => { setError(false); setMessage(''); }, 2500);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-wrap justify-center gap-2">
      {digits.map((digit, index) => (
        <motion.input
          key={index}
          ref={(el: HTMLInputElement | null) => { inputRefs.current[index] = el; }}
          type="text"
          maxLength={1}
          value={digit}
          onChange={(e) => handleInput(index, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digit && index > 0) {
              inputRefs.current[index - 1]?.focus();
            }
          }}
          inputMode="numeric"
          animate={error ? {
            x: [-10, 10, -10, 10, 0],
            borderColor: '#991b1b',
            color: '#f87171'
          } : { opacity: digit ? 1 : 0.4 }}
          transition={{ duration: 0.2 }}
          className={`w-12 h-16 text-center text-2xl font-bold bg-zinc-900 border-2 rounded-xl transition-all
              ${error ? 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.6)] bg-red-950/30 text-red-400' : digit ? 'border-orange-500 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.25)]' : 'border-zinc-700 text-zinc-600 focus:border-orange-500 focus:shadow-[0_0_10px_rgba(249,115,22,0.3)]'}`}
        />
      ))}
    </div>
      <AnimatePresence>
        {message && (
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-sm font-medium text-center px-4 ${error ? 'text-red-400' : 'text-orange-500'}`}
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

