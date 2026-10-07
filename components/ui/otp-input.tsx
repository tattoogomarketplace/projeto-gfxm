'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useTattooMachine } from '@/hooks/use-tattoo-machine';
import { TattooMachineAnimationPlaceholder } from '@/components/ui/tattoo-machine-animation-placeholder';
import { cn } from '@/lib/utils';

export type OtpUserRole = 'cliente' | 'tatuador' | 'estudio';
export type OtpStatus = 'idle' | 'buzzing' | 'error' | 'success';

export interface OtpInputProps {
  length?: number;
  onComplete: (otp: string) => Promise<boolean | void> | boolean | void;
  onSuccess?: () => void;
  isLoading?: boolean;
  userRole?: OtpUserRole;
}

const SUCCESS_HOLD_MS = 1400;
const ERROR_HOLD_MS = 2500;

const MESSAGES: Record<OtpUserRole, { success: string; error: string }> = {
  cliente: {
    success: 'Jornada na pele iniciada! Sua próxima tattoo está sendo desenhada.',
    error: 'Falha no traço. A tinta não fixou na pele. Verifique o código e tente novamente.',
  },
  tatuador: {
    success: 'Decalque confirmado. Máquina ligada, bem-vindo ao seu Atelier Digital.',
    error: 'Máquina descalibrada. O traço tremeu e o código falhou. Refaça a calibragem.',
  },
  estudio: {
    success: 'Gestão master conectada. A agenda do seu império está online.',
    error: 'Curto-circuito na bancada principal. Credenciais fiscais ou código inválidos.',
  },
};

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}

export function OtpInput({
  length = 6,
  onComplete,
  onSuccess,
  isLoading,
  userRole = 'cliente',
}: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const [status, setStatus] = useState<OtpStatus>('idle');
  const [message, setMessage] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const locked = useRef(false);
  const { startTattooing, stopTattooing, triggerError } = useTattooMachine();
  const { playTattoo, playError, playSuccess, stopTattoo } = useSoundEffects();

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    return () => {
      stopTattoo();
      stopTattooing(false);
    };
  }, [stopTattoo, stopTattooing]);

  const resetDigits = (focus = true) => {
    setDigits(Array(length).fill(''));
    if (focus) {
      requestAnimationFrame(() => inputRefs.current[0]?.focus());
    }
  };

  const beginBuzz = () => {
    setStatus('buzzing');
    startTattooing();
    playTattoo();
  };

  const handleSubmit = async (otp: string) => {
    if (locked.current) return;
    locked.current = true;

    try {
      const result = await onComplete(otp);
      const success = result !== false;

      if (success) {
        stopTattoo();
        stopTattooing(true);
        playSuccess();
        setStatus('success');
        setMessage(MESSAGES[userRole].success);
        await new Promise((resolve) => window.setTimeout(resolve, SUCCESS_HOLD_MS));
        onSuccess?.();
        return;
      }
    } catch {
      // Invalid OTP falls through to the error state.
    }

    stopTattoo();
    triggerError();
    playError();
    vibrate([200, 100, 200]);
    setStatus('error');
    setMessage(`Código Incorreto. ${MESSAGES[userRole].error}`);
    window.setTimeout(() => {
      locked.current = false;
      setStatus('idle');
      setMessage('');
      resetDigits();
    }, ERROR_HOLD_MS);
  };

  const handleInput = (index: number, value: string) => {
    if (locked.current || isLoading || status === 'success') return;

    if (value.length > 1) {
      const pasteData = value.replace(/\D/g, '').slice(0, length).split('');
      if (pasteData.length === 0) return;
      if (digits.every((d) => d === '')) beginBuzz();
      vibrate(50);
      const padded = [...pasteData, ...Array(length - pasteData.length).fill('')];
      setDigits(padded);
      setStatus((current) => (current === 'success' ? current : 'buzzing'));
      setMessage('');
      if (pasteData.length === length) {
        void handleSubmit(pasteData.join(''));
      } else {
        inputRefs.current[Math.min(pasteData.length, length - 1)]?.focus();
      }
      return;
    }

    if (!/^\d*$/.test(value)) return;

    if (digits.every((d) => d === '') && value !== '') beginBuzz();

    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (status === 'error') {
      setStatus('buzzing');
      setMessage('');
    }

    if (value !== '') {
      vibrate(50);
      if (index < length - 1) inputRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== '')) {
      void handleSubmit(next.join(''));
    }
  };

  const isError = status === 'error';
  const isSuccess = status === 'success';
  const disabled = Boolean(isLoading) || isSuccess;

  return (
    <div className="flex flex-col items-center gap-6">
      <TattooMachineAnimationPlaceholder
        state={status === 'idle' && digits.some(Boolean) ? 'buzzing' : status}
      />

      <div className="flex max-w-full flex-wrap justify-center gap-1.5 sm:gap-2">
        {digits.map((digit, index) => (
          <motion.input
            key={index}
            ref={(el: HTMLInputElement | null) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            aria-label={`Dígito ${index + 1} de ${length}`}
            aria-invalid={isError}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleInput(index, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digit && index > 0) {
                inputRefs.current[index - 1]?.focus();
              }
            }}
            animate={isError ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'h-16 w-12 min-h-11 min-w-11 rounded-xl border-2 bg-white text-center text-2xl font-bold text-neutral-900 caret-neutral-900 outline-none transition-all dark:bg-neutral-900 dark:text-white dark:caret-white',
              isError &&
                'border-red-600 bg-red-50 text-red-600 shadow-[0_0_20px_rgba(220,38,38,0.6)] dark:bg-red-950/30 dark:text-red-500',
              isSuccess &&
                'border-[#F97316] text-[#F97316] shadow-[0_0_18px_rgba(249,115,22,0.45)]',
              !isError &&
                !isSuccess &&
                (digit
                  ? 'border-[#F97316] text-[#F97316] shadow-[0_0_10px_rgba(249,115,22,0.25)]'
                  : 'border-neutral-300 text-neutral-400 focus:border-[#F97316] focus:shadow-[0_0_10px_rgba(249,115,22,0.3)] dark:border-zinc-700 dark:text-zinc-400')
            )}
          />
        ))}
      </div>

      <AnimatePresence>
        {isSuccess ? (
          <motion.div
            key="otp-success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2 px-4 text-center"
          >
            <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-[#F97316] bg-[#F97316]/10 text-[#F97316] shadow-[0_0_16px_rgba(249,115,22,0.35)]">
              <Check className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <p className="text-sm font-medium text-[#F97316]">{message}</p>
          </motion.div>
        ) : message ? (
          <motion.p
            key="otp-message"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              'px-4 text-center text-sm font-medium',
              isError ? 'text-red-500' : 'text-[#F97316]'
            )}
          >
            {message}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export { OtpInput as TattooOTPInput };
