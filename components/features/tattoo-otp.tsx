'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useTattooMachine } from '@/hooks/use-tattoo-machine';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 60;

const ERROR_COPY = {
  cliente: 'Código Incorreto. A tinta não fixou na pele. Verifique o código e tente novamente.',
  estudio: 'Código Incorreto. Curto-circuito na bancada principal.',
  tatuador: 'Código Incorreto. Máquina descalibrada. Refaça a calibragem.',
} as const;

export function TattooOTPVerification({
  onVerify,
  onResend,
  userRole = 'cliente',
}: {
  onVerify: (code: string) => Promise<void>;
  onResend?: () => Promise<void>;
  userRole?: 'cliente' | 'tatuador' | 'estudio';
}) {
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN_SEC);
  const [resending, setResending] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const verifyingLock = useRef(false);
  const { playTattoo, playSuccess, playError, stopTattoo } = useSoundEffects();
  const { startTattooing, stopTattooing, triggerError } = useTattooMachine();
  const { triggerHaptic } = useHapticFeedback();

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    return () => {
      stopTattoo();
      stopTattooing(false);
    };
  }, [stopTattoo, stopTattooing]);

  const hardStopAudio = useCallback(() => {
    stopTattoo();
    stopTattooing(false);
  }, [stopTattoo, stopTattooing]);

  const resetInputs = useCallback(() => {
    setCode(Array(OTP_LENGTH).fill(''));
    requestAnimationFrame(() => inputs.current[0]?.focus());
  }, []);

  const setRef = useCallback((el: HTMLInputElement | null, index: number) => {
    inputs.current[index] = el;
  }, []);

  const completeVerification = useCallback(async (fullCode: string) => {
    if (verifyingLock.current) return;
    verifyingLock.current = true;
    setIsVerifying(true);
    setHasError(false);
    setErrorMessage('');

    try {
      await onVerify(fullCode);
      hardStopAudio();
      stopTattooing(true);
      playSuccess();
    } catch {
      hardStopAudio();
      playError();
      triggerError();
      setHasError(true);
      setErrorMessage(ERROR_COPY[userRole] || 'Código Incorreto');
      toast.error('Código Incorreto');
      setIsVerifying(false);
      verifyingLock.current = false;
      resetInputs();
      window.setTimeout(() => setHasError(false), 2500);
    }
  }, [hardStopAudio, onVerify, playError, playSuccess, resetInputs, stopTattooing, triggerError, userRole]);

  const handleChange = (index: number, value: string) => {
    if (isVerifying) return;
    if (isNaN(Number(value))) return;

    if (value.length > 1) {
      const pasteData = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      if (code.every((d) => d === '') && pasteData.length > 0) {
        startTattooing();
        playTattoo();
      }
      const padded = [...pasteData, ...Array(OTP_LENGTH - pasteData.length).fill('')];
      setCode(padded);
      if (pasteData.length > 0) triggerHaptic('light');
      if (pasteData.length === OTP_LENGTH) {
        completeVerification(pasteData.join(''));
      } else if (pasteData.length > 0) {
        inputs.current[Math.min(pasteData.length, OTP_LENGTH - 1)]?.focus();
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
    if (newCode.every((d) => d !== '')) {
      completeVerification(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && index > 0 && code[index] === '') {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (!onResend || resendSeconds > 0 || resending || isVerifying) return;
    setResending(true);
    hardStopAudio();
    try {
      await onResend();
      setResendSeconds(RESEND_COOLDOWN_SEC);
      resetInputs();
      toast.success('Novo código enviado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao reenviar o código.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-8 bg-zinc-900 rounded-3xl border border-zinc-800 min-h-40">
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
                autoComplete="one-time-code"
                aria-label={`Dígito ${i + 1} de ${OTP_LENGTH}`}
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
            className="flex flex-col items-center gap-3"
          >
            <TattooMachineLoader label="Tatuagem finalizada..." />
          </motion.div>
        )}
      </AnimatePresence>
      {hasError && (
        <p className="w-full text-center text-sm text-red-400 mt-2 px-4">
          {errorMessage || 'Código Incorreto'}
        </p>
      )}
      {onResend ? (
        <button
          type="button"
          onClick={handleResend}
          disabled={resendSeconds > 0 || resending || isVerifying}
          className="mt-2 min-h-11 px-4 text-sm font-semibold text-amber-500 disabled:text-zinc-500 disabled:cursor-not-allowed hover:underline"
        >
          {resending
            ? 'Reenviando...'
            : resendSeconds > 0
              ? `Reenviar código em ${resendSeconds}s`
              : 'Reenviar código'}
        </button>
      ) : null}
    </div>
  );
}
