'use client';
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useTattooMachine } from '@/hooks/use-tattoo-machine';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';

export function TattooOTPVerification({ onVerify, userRole = 'cliente' }: { onVerify: (code: string) => Promise<void>; userRole?: 'cliente' | 'tatuador' | 'estudio' }) {
  const OTP_LENGTH = 8;
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const { playTattoo, playSuccess, playError } = useSoundEffects();
  const { startTattooing, stopTattooing, triggerError } = useTattooMachine();
  const { triggerHaptic } = useHapticFeedback();

  const setRef = useCallback((el: HTMLInputElement | null, index: number) => {
    inputs.current[index] = el;
  }, []);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;

    if (value.length > 1) {
      const pasteData = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      const padded = [...pasteData, ...Array(OTP_LENGTH - pasteData.length).fill('')];
      setCode(padded);
      if (pasteData.length === OTP_LENGTH) {
        completeVerification(pasteData.join(''));
      }
      return;
    }

    if (code.every((d) => d === '') && value !== '') {
      startTattooing();
      playTattoo();
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setHasError(false);

    if (value !== '') {
      triggerHaptic('light');
      if (index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
    }
    if (newCode.join('').length === OTP_LENGTH) {
      completeVerification(newCode.join(''));
    }
  };

  const completeVerification = async (fullCode: string) => {
    setIsVerifying(true);

    try {
      await onVerify(fullCode);
      stopTattooing(true);
      playSuccess();
    } catch (error) {
      playError();
      triggerError();
      setHasError(true);
      setIsVerifying(false);
      setTimeout(() => setHasError(false), 2500);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && index > 0 && code[index] === '') {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex flex-wrap justify-center gap-2 p-8 bg-zinc-900 rounded-3xl border border-zinc-800 min-h-40 items-center">
      <AnimatePresence mode="wait">
        {!isVerifying ? (
          <motion.div 
            key="inputs"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-wrap justify-center gap-2"
          >
            {code.map((digit: string, i: number) => (
              <motion.input
                key={i}
                ref={(el) => setRef(el, i)}
                type="text"
                maxLength={1}
                inputMode="numeric"
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                animate={hasError ? { x: [-8, 8, -8, 8, 0], color: '#f87171' } : { opacity: digit ? 1 : 0.35 }}
                whileFocus={{ scale: 1.1, y: -2 }}
                className={`w-12 h-16 text-center text-2xl font-bold bg-zinc-950 border-b-2 focus:outline-none transition-colors ${hasError ? 'text-red-400 border-red-600 shadow-[0_8px_12px_-6px_rgba(220,38,38,0.8)]' : 'text-amber-500 border-amber-500 focus:border-amber-400'}`}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-amber-500 font-bold text-xl tracking-wider uppercase"
          >
            Tatuagem finalizada...
          </motion.div>
        )}
      </AnimatePresence>
      {hasError && (
        <p className="w-full text-center text-sm text-red-400 mt-4 px-4">
          {userRole === 'cliente'
            ? 'Falha no traço. A tinta não fixou na pele. Verifique o código e tente novamente.'
            : userRole === 'estudio'
              ? 'Curto-circuito na bancada principal. Credenciais fiscais ou código inválidos.'
              : 'Máquina descalibrada. O traço tremeu e o código falhou. Refaça a calibragem.'}
        </p>
      )}
    </div>
  );
}

