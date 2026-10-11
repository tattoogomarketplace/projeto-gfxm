'use client';

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, ScanLine, ShieldCheck } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';
import { validateStudioSessionPass } from '@/lib/actions/transaction.actions';
import { toast } from '@/lib/toast';

/**
 * SessionValidationSheet — validador de sessão do tatuador (OTP Input).
 *
 * Substitui o placeholder do roster do estúdio: confirma a presença do cliente
 * digitando o token do TattooGo Pass e libera o split de pagamento da sessão.
 * Diferente do OTP de cadastro (auto-submit), a liberação de fundos é uma
 * operação de alto risco, então exige confirmação explícita com estado de
 * loading.
 *
 * A validação é executada pela Server Action `validateStudioSessionPass`: o
 * profissional autenticado (tatuador ou estúdio vinculado) confirma o token do
 * TattooGo Pass, a sessão é marcada como concluída e o repasse é registrado com
 * idempotência. Toda a resposta tátil/sonora reaproveita os hooks de marca.
 */
export type SessionValidationStatus = 'idle' | 'validating' | 'error' | 'success';

export interface SessionValidationSheetProps {
  open: boolean;
  panelId: string;
  /** Identificador da sessão (`agendamento`) cujo sinal será processado. */
  sessionId: string;
  onValidated: () => void;
  /** Validação injetável. Retorna `true` para liberar o pagamento. */
  onVerify?: (code: string) => Promise<boolean> | boolean;
  /** Quantidade de dígitos do token (4 a 6). Padrão 6. */
  length?: number;
}

const SUCCESS_HOLD_MS = 1200;
const ERROR_HOLD_MS = 2200;

export function SessionValidationSheet({
  open,
  panelId,
  sessionId,
  onValidated,
  onVerify,
  length = 6,
}: SessionValidationSheetProps): ReactNode {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const { playTattoo, playSuccess, playError, stopTattoo } = useSoundEffects();

  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(''));
  const [status, setStatus] = useState<SessionValidationStatus>('idle');
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const lockedRef = useRef(false);
  const resetTimerRef = useRef<number | null>(null);

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearResetTimer();
      stopTattoo();
    };
  }, [clearResetTimer, stopTattoo]);

  useEffect(() => {
    if (open && status === 'idle') {
      requestAnimationFrame(() => inputsRef.current[0]?.focus());
    }
  }, [open, status]);

  const reset = useCallback(() => {
    setDigits(Array(length).fill(''));
    setStatus('idle');
    lockedRef.current = false;
    requestAnimationFrame(() => inputsRef.current[0]?.focus());
  }, [length]);

  const fill = (index: number, value: string) => {
    if (lockedRef.current || status === 'validating' || status === 'success') return;

    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, length).split('');
      if (pasted.length === 0) return;
      triggerHaptic('light');
      const next = [...pasted, ...Array(Math.max(length - pasted.length, 0)).fill('')];
      setDigits(next);
      setStatus('idle');
      const focusIndex = Math.min(pasted.length, length - 1);
      inputsRef.current[focusIndex]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (status === 'error') setStatus('idle');

    if (value !== '') {
      triggerHaptic('light');
      if (index < length - 1) inputsRef.current[index + 1]?.focus();
    }
  };

  const complete = digits.every((digit) => digit !== '');
  const [isPending, startTransition] = useTransition();
  const pending = isPending || status === 'validating';

  const failValidation = useCallback(() => {
    stopTattoo();
    playError();
    triggerHaptic('heavy');
    setStatus('error');
    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null;
      reset();
    }, ERROR_HOLD_MS);
  }, [playError, reset, stopTattoo, triggerHaptic]);

  const succeed = useCallback(() => {
    stopTattoo();
    playSuccess();
    triggerHaptic('success');
    toast.success(t('agenda.payout_success'));
    setStatus('success');
    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null;
      onValidated();
      reset();
    }, SUCCESS_HOLD_MS);
  }, [onValidated, playSuccess, reset, stopTattoo, t, triggerHaptic]);

  const handleConfirm = useCallback(() => {
    const code = digits.join('');
    if (lockedRef.current || code.length !== length) return;

    lockedRef.current = true;
    setStatus('validating');
    triggerHaptic('medium');
    playTattoo();

    startTransition(async () => {
      try {
        const valid = onVerify ? (await onVerify(code)) !== false : code.length === length;
        if (!valid) {
          failValidation();
          return;
        }

        const idempotencyKey = crypto.randomUUID();
        const result = await validateStudioSessionPass(sessionId, code, idempotencyKey);

        if (!result.success) {
          toast.error(result.error);
          failValidation();
          return;
        }

        succeed();
      } catch {
        toast.error('Falha ao processar o pagamento.');
        failValidation();
      }
    });
  }, [
    digits,
    length,
    onVerify,
    sessionId,
    startTransition,
    failValidation,
    succeed,
    playTattoo,
    triggerHaptic,
  ]);

  return (
    <div
      id={panelId}
      className={cn(
        'grid transition-[grid-template-rows] duration-300 ease-out',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="mt-4 space-y-4 border-t border-black/[0.04] pt-4 dark:border-white/[0.05]">
          <p className="flex items-center justify-center gap-1.5 text-center text-xs leading-relaxed text-neutral-500 dark:text-zinc-400">
            <ScanLine
              className="h-4 w-4 shrink-0 text-orange-500 dark:text-orange-400"
              strokeWidth={2}
            />
            {t('agenda.tokenInputHint')}
          </p>

          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
            {digits.map((digit, index) => (
              <motion.input
                key={index}
                ref={(el: HTMLInputElement | null) => {
                  inputsRef.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                aria-label={t('aria.digit', { index: index + 1, length })}
                aria-invalid={status === 'error'}
                value={digit}
                disabled={pending || status === 'success'}
                onChange={(event) => fill(index, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Backspace' && !digit && index > 0) {
                    inputsRef.current[index - 1]?.focus();
                  }
                }}
                animate={status === 'error' ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'h-14 w-11 min-h-11 min-w-11 rounded-xl border-2 bg-neutral-100 text-center font-mono text-2xl font-bold text-neutral-900 caret-neutral-900 outline-none transition-all dark:bg-neutral-900 dark:text-white dark:caret-white',
                  status === 'error' &&
                    'border-red-600 bg-red-50 text-red-600 shadow-[0_0_20px_rgba(220,38,38,0.6)] dark:bg-red-950/30 dark:text-red-500',
                  status === 'success' &&
                    'border-brand-copper text-brand-copper-soft shadow-[0_0_18px_rgba(217,70,14,0.45)]',
                  status !== 'error' &&
                    status !== 'success' &&
                    (digit
                      ? 'border-orange-500 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.25)]'
                      : 'border-neutral-300 text-neutral-400 focus:border-orange-500 focus:shadow-[0_0_10px_rgba(249,115,22,0.3)] dark:border-zinc-700 dark:text-zinc-400')
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!complete || pending || status === 'success'}
            className={cn(
              'apple-press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-all',
              status === 'success'
                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                : 'border-orange-500/40 bg-orange-500/15 text-orange-600 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 dark:text-orange-300'
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {status === 'success' ? (
                <motion.span
                  key="success"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-2"
                >
                  <Check className="h-4 w-4" strokeWidth={2.6} />
                  {t('agenda.sessionValidated')}
                </motion.span>
              ) : pending ? (
                <motion.span
                  key="validating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-2"
                >
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
                  {t('agenda.validating')}
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="inline-flex items-center gap-2"
                >
                  <ShieldCheck className="h-4 w-4" strokeWidth={2} />
                  {t('agenda.confirmPresence')}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <AnimatePresence>
            {status === 'error' ? (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center text-xs font-medium text-red-500"
              >
                {t('agenda.invalidToken')}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
