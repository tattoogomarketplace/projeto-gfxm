'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

/**
 * TATTOOGO MK — ATUALIZAÇÃO SEGURA DE E-MAIL (CLIENTE)
 *
 * Bottom sheet Apple-tier acionado a partir do `ClientIdentityHub`. A troca de
 * e-mail é uma operação sensível: exige a senha atual e depois um OTP de 6
 * dígitos. O conteúdo vive numa máquina de estados (`form` -> `otp` ->
 * `success`) e a transição entre passos é feita com `AnimatePresence`
 * `mode="wait"` dentro de um painel de altura mínima fixa — o sheet nunca
 * salta de tamanho durante a troca de etapa.
 *
 * Toda a mutação de backend é injetável (`onSubmit` / `onVerify`). Sem eles, o
 * componente usa promises simuladas para permitir a validação do fluxo de UI.
 */

export type EmailUpdateStep = 'form' | 'otp' | 'success';

export interface EmailUpdateSheetProps {
  open: boolean;
  /** E-mail atual exibido como contexto/placeholder. */
  currentEmail: string;
  onClose: () => void;
  /** Placeholder da mutação de identidade. Retorna `true` se a senha conferiu. */
  onSubmit?: (payload: { email: string; password: string }) => Promise<boolean> | boolean;
  /** Placeholder da verificação OTP. Retorna `true` se o código for válido. */
  onVerify?: (code: string) => Promise<boolean> | boolean;
  /** Disparado com o novo e-mail após sucesso completo. */
  onUpdated?: (email: string) => void;
}

const OTP_LENGTH = 6;
const DISMISS_DISTANCE = 128;
const DISMISS_VELOCITY = 700;
const SUCCESS_HOLD_MS = 1100;
const ERROR_HOLD_MS = 2200;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function EmailUpdateSheet({
  open,
  currentEmail,
  onClose,
  onSubmit,
  onVerify,
  onUpdated,
}: EmailUpdateSheetProps): ReactNode {
  const { triggerHaptic } = useHapticFeedback();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [step, setStep] = useState<EmailUpdateStep>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState(false);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const resetTimer = useRef<number | null>(null);

  const resetAll = useCallback(() => {
    setStep('form');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setEmailError('');
    setPasswordError('');
    setSubmitting(false);
    setDigits(Array(OTP_LENGTH).fill(''));
    setVerifying(false);
    setOtpError(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (step === 'form') {
      const timer = window.setTimeout(() => emailRef.current?.focus(), 280);
      return () => window.clearTimeout(timer);
    }
    if (step === 'otp') {
      const timer = window.setTimeout(() => otpRefs.current[0]?.focus(), 280);
      return () => window.clearTimeout(timer);
    }
    return;
  }, [open, step]);

  const dismiss = useCallback(() => {
    if (submitting || verifying) return;
    triggerHaptic('light');
    onClose();
    window.setTimeout(resetAll, 220);
  }, [onClose, resetAll, submitting, triggerHaptic, verifying]);

  const handleDragEnd = useCallback(
    (_event: unknown, info: PanInfo) => {
      if (submitting || verifying) return;
      if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
        triggerHaptic('light');
        onClose();
        window.setTimeout(resetAll, 220);
      }
    },
    [onClose, resetAll, submitting, triggerHaptic, verifying]
  );

  const handleSubmitForm = useCallback(async () => {
    if (submitting) return;

    const trimmed = email.trim();
    let invalid = false;

    if (!EMAIL_PATTERN.test(trimmed)) {
      setEmailError('Informe um e-mail válido.');
      invalid = true;
    } else if (trimmed.toLowerCase() === currentEmail.trim().toLowerCase()) {
      setEmailError('Este já é o seu e-mail atual.');
      invalid = true;
    } else {
      setEmailError('');
    }

    if (password.length < 6) {
      setPasswordError('A senha precisa ter ao menos 6 caracteres.');
      invalid = true;
    } else {
      setPasswordError('');
    }

    if (invalid) {
      triggerHaptic('heavy');
      return;
    }

    triggerHaptic('medium');
    setSubmitting(true);
    try {
      let accepted: boolean;
      if (onSubmit) {
        accepted = (await onSubmit({ email: trimmed, password })) !== false;
      } else {
        await sleep(750);
        accepted = true;
      }

      if (!accepted) {
        setPasswordError('Senha incorreta. Tente novamente.');
        triggerHaptic('heavy');
        return;
      }

      setEmail(trimmed);
      setStep('otp');
    } catch {
      setPasswordError('Não foi possível continuar. Tente novamente.');
      triggerHaptic('heavy');
    } finally {
      setSubmitting(false);
    }
  }, [currentEmail, email, onSubmit, password, submitting, triggerHaptic]);

  const fillDigit = useCallback(
    (index: number, value: string) => {
      if (verifying || step !== 'otp') return;

      if (value.length > 1) {
        const pasted = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
        if (pasted.length === 0) return;
        triggerHaptic('light');
        const next = [...pasted, ...Array(Math.max(OTP_LENGTH - pasted.length, 0)).fill('')];
        setDigits(next);
        setOtpError(false);
        otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
        return;
      }

      if (!/^\d*$/.test(value)) return;

      const next = [...digits];
      next[index] = value;
      setDigits(next);
      setOtpError(false);

      if (value !== '') {
        triggerHaptic('light');
        if (index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
      }
    },
    [digits, step, triggerHaptic, verifying]
  );

  const handleVerify = useCallback(async () => {
    const code = digits.join('');
    if (verifying || code.length !== OTP_LENGTH) return;

    triggerHaptic('medium');
    setVerifying(true);
    try {
      let valid: boolean;
      if (onVerify) {
        valid = (await onVerify(code)) !== false;
      } else {
        await sleep(750);
        valid = true;
      }

      if (!valid) {
        triggerHaptic('heavy');
        setOtpError(true);
        resetTimer.current = window.setTimeout(() => {
          resetTimer.current = null;
          setDigits(Array(OTP_LENGTH).fill(''));
          setOtpError(false);
          otpRefs.current[0]?.focus();
        }, ERROR_HOLD_MS);
        return;
      }

      triggerHaptic('success');
      setStep('success');
      resetTimer.current = window.setTimeout(() => {
        resetTimer.current = null;
        onUpdated?.(email);
        onClose();
        window.setTimeout(resetAll, 220);
      }, SUCCESS_HOLD_MS);
    } catch {
      triggerHaptic('heavy');
      setOtpError(true);
    } finally {
      setVerifying(false);
    }
  }, [digits, email, onClose, onUpdated, onVerify, resetAll, triggerHaptic, verifying]);

  const handleBack = useCallback(() => {
    if (verifying) return;
    triggerHaptic('light');
    setDigits(Array(OTP_LENGTH).fill(''));
    setOtpError(false);
    setStep('form');
  }, [triggerHaptic, verifying]);

  if (!mounted) return null;

  const codeComplete = digits.every((digit) => digit !== '');

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="email-update-sheet"
          className="fixed inset-0 z-[120] flex h-[100dvh] w-full flex-col justify-end overflow-hidden transform-gpu will-change-transform"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label="Fechar"
            onClick={dismiss}
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="Atualizar e-mail"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 42, mass: 0.9 }}
            drag={submitting || verifying ? false : 'y'}
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={handleDragEnd}
            className={cn(
              'gpu-layer relative mx-auto flex w-full max-w-app transform-gpu flex-col overflow-hidden rounded-t-[28px] will-change-transform',
              'border-t border-white/[0.08] bg-[#0d0d0d] text-white shadow-[0_-24px_60px_rgba(0,0,0,0.55)]'
            )}
          >
            <span
              aria-hidden
              className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-white/15"
            />

            <header className="flex items-start justify-between gap-3 px-5 pt-4">
              <div className="flex min-w-0 items-center gap-2.5">
                {step === 'otp' ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={verifying}
                    aria-label="Voltar"
                    className="flex h-9 w-9 min-h-9 min-w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.06] text-zinc-400 transition-colors active:scale-[0.96] disabled:opacity-40"
                  >
                    <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  </button>
                ) : null}
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">
                    <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                    Conta Segura
                  </p>
                  <h2 className="mt-1 truncate text-[22px] font-bold leading-tight tracking-tight text-white">
                    {step === 'otp' ? 'Verificação' : step === 'success' ? 'Tudo certo' : 'Atualizar E-mail'}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={dismiss}
                disabled={submitting || verifying}
                aria-label="Fechar"
                className="flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.06] text-zinc-400 transition-colors active:scale-[0.96] disabled:opacity-40"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </header>

            {/* Painel de altura estável — o `mode="wait"` troca o passo sem
                deixar o sheet crescer/encolher entre as transições. */}
            <div className="relative flex min-h-[21rem] flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
              <AnimatePresence mode="wait" initial={false}>
                {step === 'form' ? (
                  <motion.div
                    key="email-form"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="flex flex-1 flex-col"
                  >
                    <p className="text-[13px] leading-relaxed text-zinc-500">
                      Confirme a troca com a senha atual. Enviaremos um código de verificação para o novo endereço.
                    </p>

                    <div className="mt-5 flex flex-col gap-4">
                      <SheetField
                        htmlFor="email-update-new"
                        label="Novo E-mail"
                        icon={<Mail className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                        error={emailError}
                      >
                        <input
                          ref={emailRef}
                          id="email-update-new"
                          type="email"
                          name="email"
                          inputMode="email"
                          autoComplete="email"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          value={email}
                          disabled={submitting}
                          placeholder={currentEmail || 'voce@email.com'}
                          onChange={(event) => {
                            setEmail(event.target.value);
                            if (emailError) setEmailError('');
                          }}
                          className="peer !m-0 !h-auto !min-h-0 w-full flex-1 border-0 bg-transparent px-4 py-3.5 text-[15px] font-medium tracking-tight text-white caret-orange-400 outline-none ring-0 placeholder:text-zinc-600 disabled:opacity-60"
                        />
                      </SheetField>

                      <SheetField
                        htmlFor="email-update-password"
                        label="Senha Atual"
                        icon={<Lock className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                        error={passwordError}
                        trailing={
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword((visible) => !visible)}
                            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                            className={cn(
                              'flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-lg transition-colors',
                              showPassword ? 'text-orange-400' : 'text-zinc-500'
                            )}
                          >
                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        }
                      >
                        <input
                          id="email-update-password"
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          autoComplete="current-password"
                          value={password}
                          disabled={submitting}
                          placeholder="Digite sua senha"
                          onChange={(event) => {
                            setPassword(event.target.value);
                            if (passwordError) setPasswordError('');
                          }}
                          className="peer !m-0 !h-auto !min-h-0 w-full flex-1 border-0 bg-transparent px-4 py-3.5 text-[15px] font-medium tracking-tight text-white caret-orange-400 outline-none ring-0 placeholder:text-zinc-600 disabled:opacity-60"
                        />
                      </SheetField>
                    </div>

                    <div className="mt-auto pt-6">
                      <PrimaryAction
                        onClick={handleSubmitForm}
                        disabled={submitting}
                        busy={submitting}
                        label="Continuar"
                        busyLabel="Verificando senha..."
                      />
                    </div>
                  </motion.div>
                ) : step === 'otp' ? (
                  <motion.div
                    key="email-otp"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="flex flex-1 flex-col"
                  >
                    <p className="text-[13px] leading-relaxed text-zinc-500">
                      Digite o código de 6 dígitos enviado para{' '}
                      <span className="font-semibold text-orange-400">{email}</span>.
                    </p>

                    <div className="mt-6 flex flex-wrap justify-center gap-1.5">
                      {digits.map((digit, index) => (
                        <motion.input
                          key={index}
                          ref={(el: HTMLInputElement | null) => {
                            otpRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={1}
                          aria-label={`Dígito ${index + 1} de ${OTP_LENGTH}`}
                          aria-invalid={otpError}
                          value={digit}
                          disabled={verifying}
                          onChange={(event) => fillDigit(index, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Backspace' && !digit && index > 0) {
                              otpRefs.current[index - 1]?.focus();
                            }
                          }}
                          animate={otpError ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            '!h-auto !min-h-0 h-14 w-11 min-h-11 min-w-11 flex-none rounded-xl border-2 bg-neutral-900 py-0 text-center text-2xl font-bold text-white caret-orange-400 outline-none transition-all',
                            otpError
                              ? 'border-red-600 bg-red-950/30 text-red-500 shadow-[0_0_20px_rgba(220,38,38,0.6)]'
                              : digit
                                ? 'border-orange-500 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.25)]'
                                : 'border-zinc-700 text-zinc-400 focus:border-orange-500 focus:shadow-[0_0_10px_rgba(249,115,22,0.3)]'
                          )}
                        />
                      ))}
                    </div>

                    <div className="mt-3 min-h-[18px] px-1">
                      <AnimatePresence>
                        {otpError ? (
                          <motion.p
                            key="otp-error"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.16 }}
                            className="text-center text-xs font-medium text-red-500"
                          >
                            Código inválido. Tente novamente.
                          </motion.p>
                        ) : null}
                      </AnimatePresence>
                    </div>

                    <div className="mt-auto pt-6">
                      <PrimaryAction
                        onClick={handleVerify}
                        disabled={!codeComplete || verifying}
                        busy={verifying}
                        label="Verificar e Salvar"
                        busyLabel="Verificando código..."
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="email-success"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="flex flex-1 flex-col items-center justify-center gap-4 text-center"
                  >
                    <span className="flex h-16 w-16 min-h-16 min-w-16 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-400 shadow-[0_0_28px_rgba(249,115,22,0.4)]">
                      <Check className="h-7 w-7" strokeWidth={2.4} />
                    </span>
                    <div className="flex flex-col gap-1">
                      <p className="text-lg font-bold tracking-tight text-white">E-mail atualizado</p>
                      <p className="text-[13px] text-zinc-500">
                        Sua nova identidade de acesso já está ativa.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

type SheetFieldProps = {
  htmlFor: string;
  label: string;
  icon: ReactNode;
  error?: string;
  trailing?: ReactNode;
  children: ReactNode;
};

/** Inset-grouped field, Apple-style: label acima, grupo arredondado abaixo. */
function SheetField({
  htmlFor,
  label,
  icon,
  error,
  trailing,
  children,
}: SheetFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="ml-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
      >
        {label}
      </label>
      <div
        className={cn(
          'flex items-center gap-2 rounded-2xl border bg-zinc-900/60 pl-3.5 pr-2 transition-colors duration-200',
          'focus-within:border-orange-500/70 focus-within:ring-1 focus-within:ring-orange-500/40',
          error ? 'border-red-500/70' : 'border-zinc-800/70'
        )}
      >
        <span className={cn('flex shrink-0', error ? 'text-red-500' : 'text-orange-400')}>
          {icon}
        </span>
        {children}
        {trailing}
      </div>
      <div className="min-h-[16px] px-1">
        <AnimatePresence>
          {error ? (
            <motion.span
              key={error}
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="block text-[11px] font-medium text-red-500"
            >
              {error}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

type PrimaryActionProps = {
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  label: string;
  busyLabel: string;
};

function PrimaryAction({ onClick, disabled, busy, label, busyLabel }: PrimaryActionProps) {
  const inactive = disabled || busy;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={inactive}
      aria-busy={busy}
      className={cn(
        'inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-6 text-[15px] font-bold tracking-tight',
        'transition-[transform,box-shadow,filter] duration-150 active:scale-[0.98]',
        !inactive
          ? 'bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-[0_0_28px_rgba(249,115,22,0.5)]'
          : busy
            ? 'bg-gradient-to-b from-orange-500 to-orange-600 text-white opacity-80'
            : 'cursor-not-allowed bg-white/[0.06] text-zinc-500 shadow-none'
      )}
    >
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.6} />
          {busyLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}

export default EmailUpdateSheet;
