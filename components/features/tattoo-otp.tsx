'use client';
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSoundEffects } from '@/hooks/useSoundEffects';

export function TattooOTPVerification({ onVerify }: { onVerify: (code: string) => void }) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const { playTattoo, playSuccess } = useSoundEffects();

  const setRef = useCallback((el: HTMLInputElement | null, index: number) => {
    inputs.current[index] = el;
  }, []);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;

    if (value.length > 1) {
      const pasteData = value.slice(0, 6).split('');
      setCode(pasteData);
      if (pasteData.length === 6) {
        completeVerification(pasteData.join(''));
      }
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value !== '' && index < 5) inputs.current[index + 1]?.focus();
    if (newCode.join('').length === 6) {
      completeVerification(newCode.join(''));
    }
  };

  const completeVerification = (fullCode: string) => {
    setIsVerifying(true);
    playTattoo();
    setTimeout(() => {
      playSuccess();
      onVerify(fullCode);
    }, 1200);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && index > 0 && code[index] === '') {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center p-8 bg-zinc-900 rounded-3xl border border-zinc-800 min-h-40 items-center">
      <AnimatePresence mode="wait">
        {!isVerifying ? (
          <motion.div 
            key="inputs"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex gap-2"
          >
            {code.map((digit: string, i: number) => (
              <motion.input
                key={i}
                ref={(el) => setRef(el, i)}
                type="text"
                maxLength={6}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-16 text-center text-2xl font-bold bg-zinc-950 text-amber-500 border-b-2 border-amber-500 focus:outline-none focus:border-amber-400 transition-colors"
                whileFocus={{ scale: 1.1, y: -2 }}
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
            Tatuagem finalizada... ✨
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

