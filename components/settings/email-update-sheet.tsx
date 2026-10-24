'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession, useUser } from '@clerk/nextjs';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
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
 * TATTOOGO MK — ATUALIZAÇÃO BANCÁRIA DE E-MAIL (CLIENTE)
 *
 * Bottom sheet Apple-tier acionado a partir do `ClientIdentityHub`. A troca de
 * e-mail é uma operação sensível e segue uma máquina de estados ESTRITA de 3
 * passos, impedindo tomada de conta quando o dispositivo fica destravado:
 *
 *   1. `reauthenticate` — o e-mail atual aparece travado (read-only) e o
 *      usuário precisa provar posse da conta com a "Senha Atual". A validação
 *      usa a reverificação nativa DE SESSÃO do Clerk
 *      (`session.startVerification` + `session.attemptFirstFactorVerification`),
 *      que autentica contra a sessão ativa — não uma nova tentativa de login.
 *   2. `destination` — só após o passo 1, o novo endereço é coletado.
 *   3. `verify` — `createEmailAddress` + `prepareVerification(email_code)` do
 *      Clerk disparam o OTP; o usuário confirma os 6 dígitos via
 *      `attemptVerification` e o endereço passa a ser o primário.
 *
 * `AnimatePresence mode="wait"` faz o crossfade/slide entre os passos dentro de
 * um painel de altura mínima fixa — sem layout snapping durante a troca.
 */

export type EmailUpdateStep = 'reauthenticate' | 'destination' | 'verify' | 'success';

export interface EmailUpdateSheetProps {
  open: boolean;
  /** E-mail atual exibido (read-only) no passo de reautenticação. */
  currentEmail: string;
  onClose: () => void;
  /** Disparado com o novo e-mail após sucesso completo. */
  onUpdated?: (email: string) => void;
  /** Overrides opcionais (testes/storybook) para as etapas de destino/OTP. */
  onRequestEmailChange?: (email: string) => Promise<boolean> | boolean;
  onVerifyCode?: (code: string) => Promise<boolean> | boolean;
}

const OTP_LENGTH = 6;
const SUCCESS_HOLD_MS = 1100;
const ERROR_HOLD_MS = 2200;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEP_TITLES: Record<EmailUpdateStep, string> = {
  reauthenticate: 'Confirmar Identidade',
  destination: 'Atualizar E-mail',
  verify: 'Verificação',
  success: 'Tudo certo',
};

type ClerkErrorShape = {
  errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
};

function firstClerkError(err: unknown) {
  const errors = (err as ClerkErrorShape | null | undefined)?.errors;
  return Array.isArray(errors) ? errors[0] : undefined;
}

/** Detecta erros de formato de e-mail do Clerk para não vazar texto em inglês. */
function isEmailFormatError(err: unknown): boolean {
  const detail = firstClerkError(err);
  const haystack =
    `${detail?.code ?? ''} ${detail?.message ?? ''} ${detail?.longMessage ?? ''}`.toLowerCase();
  return (
    haystack.includes('form_identifier_format_invalid') ||
    haystack.includes('form_param_format_invalid') ||
    haystack.includes('valid email address') ||
    haystack.includes('must be a valid email') ||
    haystack.includes('email address must be') ||
    haystack.includes('invalid email address')
  );
}

export function EmailUpdateSheet({
  open,
  currentEmail,
  onClose,
  onUpdated,
  onRequestEmailChange,
  onVerifyCode,
}: EmailUpdateSheetProps): ReactNode {
  const { triggerHaptic } = useHapticFeedback();
  const { user, isLoaded: userLoaded } = useUser();
  const { session, isLoaded: sessionLoaded } = useSession();

  const [step, setStep] = useState<EmailUpdateStep>('reauthenticate');
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
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const resetTimer = useRef<number | null>(null);
  // Guardas síncronas anti-duplicação: impedem que um duplo toque/Enter dispare
  // múltiplos `createEmailAddress`/`prepareVerification` (o 2º envio entra no
  // cooldown do Clerk e o SDK recua por ~30s antes de responder).
  const otpDispatchRef = useRef(false);
  const promotionRef = useRef(false);

  const resetAll = useCallback(() => {
    setStep('reauthenticate');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setEmailError('');
    setPasswordError('');
    setSubmitting(false);
    setDigits(Array(OTP_LENGTH).fill(''));
    setVerifying(false);
    setOtpError(false);
    otpDispatchRef.current = false;
    promotionRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      if (step === 'reauthenticate') passwordRef.current?.focus();
      else if (step === 'destination') emailRef.current?.focus();
      else if (step === 'verify') otpRefs.current[0]?.focus();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open, step]);

  const dismiss = useCallback(() => {
    if (submitting || verifying) return;
    triggerHaptic('light');
    onClose();
    window.setTimeout(resetAll, 220);
  }, [onClose, resetAll, submitting, triggerHaptic, verifying]);

  /**
   * Passo 1 — reverificação de sessão REAL e obrigatória. Usamos a verificação
   * nativa da sessão ativa do Clerk (`session.startVerification` +
   * `session.attemptFirstFactorVerification`), que autentica a senha contra a
   * sessão corrente em vez de criar uma nova tentativa de login (o que falha
   * quando já existe sessão). Não existe mock/fallback: se falhar, NÃO avança.
   */
  const runVerifyPassword = useCallback(
    async (value: string): Promise<void> => {
      if (!session) {
        throw new Error('clerk-not-ready');
      }

      const resource = await session.startVerification({ level: 'first_factor' });
      if (resource.status === 'complete') return;

      const passwordFactor = resource.supportedFirstFactors?.find(
        (candidate) => candidate.strategy === 'password'
      );
      if (!passwordFactor) {
        throw new Error('clerk-not-ready');
      }

      const attempt = await session.attemptFirstFactorVerification({
        strategy: 'password',
        password: value,
      });
      if (attempt.status !== 'complete') {
        throw new Error('A senha atual está incorreta.');
      }
    },
    [session]
  );

  /** Passo 2 — cria o endereço no Clerk e dispara o OTP para o novo e-mail. */
  const runRequestEmailChange = useCallback(
    async (value: string): Promise<boolean> => {
      if (onRequestEmailChange) return (await onRequestEmailChange(value)) !== false;
      if (!user) throw new Error('session-expired');
      const emailObj = await user.createEmailAddress({ email: value });
      await emailObj.prepareVerification({ strategy: 'email_code' });
      return true;
    },
    [onRequestEmailChange, user]
  );

  /** Passo 3 — localiza o endereço, valida o OTP e o promove a primário. */
  const runVerifyCode = useCallback(
    async (code: string): Promise<boolean> => {
      if (onVerifyCode) return (await onVerifyCode(code)) !== false;
      if (!user) return false;
      const targetEmail = user.emailAddresses.find(
        (candidate) => candidate.emailAddress === email
      );
      if (!targetEmail) return false;
      const verification = await targetEmail.attemptVerification({ code });
      if (verification.verification.status !== 'verified') return false;

      // 1. Promove o novo e-mail a primário (binding explícito e estrito). O
      //    retorno já é o UserResource atualizado — sem re-fetch redundante.
      const updatedUser = await user.update({ primaryEmailAddressId: targetEmail.id });

      // 2. Remove TODOS os demais identificadores em paralelo (sem await
      //    sequencial) para que nenhum alias legado permita login pela conta.
      const legacyAddresses = updatedUser.emailAddresses.filter(
        (address) => address.id !== targetEmail.id
      );
      await Promise.all(
        legacyAddresses.map(async (address) => {
          try {
            await address.destroy();
          } catch {
            // Alias bloqueado/restrito pelo Clerk — segue o fluxo.
          }
        })
      );

      // 3. Re-sincroniza a sessão: força o JWT a descartar o identificador
      //    antigo imediatamente, impedindo logins legados com o e-mail anterior.
      await session?.reload();
      return true;
    },
    [email, onVerifyCode, session, user]
  );

  const handleSubmitPassword = useCallback(async () => {
    if (submitting) return;
    if (password.length < 6) {
      setPasswordError('A senha precisa ter ao menos 6 caracteres.');
      triggerHaptic('heavy');
      return;
    }
    setPasswordError('');
    triggerHaptic('medium');
    setSubmitting(true);
    try {
      await runVerifyPassword(password);
    } catch {
      setPasswordError('A senha atual está incorreta.');
      triggerHaptic('heavy');
      setSubmitting(false);
      return;
    }
    // Só alcançado quando o Clerk confirmou a senha com sucesso.
    triggerHaptic('success');
    setSubmitting(false);
    setStep('destination');
  }, [password, runVerifyPassword, submitting, triggerHaptic]);

  const handleSubmitEmail = useCallback(async () => {
    if (submitting || otpDispatchRef.current) return;
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setEmailError('Insira um endereço de e-mail válido.');
      triggerHaptic('heavy');
      return;
    }
    if (trimmed.toLowerCase() === (currentEmail ?? '').trim().toLowerCase()) {
      setEmailError('Este já é o seu e-mail atual.');
      triggerHaptic('heavy');
      return;
    }
    otpDispatchRef.current = true;
    setEmailError('');
    triggerHaptic('medium');
    setSubmitting(true);
    setDigits(Array(OTP_LENGTH).fill(''));
    setOtpError(false);
    try {
      const ok = await runRequestEmailChange(trimmed);
      if (!ok) {
        setEmailError('Não foi possível usar este e-mail. Tente outro.');
        triggerHaptic('heavy');
        return;
      }
      setEmail(trimmed);
      setStep('verify');
    } catch (err) {
      const detail = firstClerkError(err);
      const message = isEmailFormatError(err)
        ? 'Insira um endereço de e-mail válido.'
        : detail?.longMessage || detail?.message;
      setEmailError(
        message || 'Não foi possível enviar o código. Verifique o endereço e tente novamente.'
      );
      triggerHaptic('heavy');
    } finally {
      otpDispatchRef.current = false;
      setSubmitting(false);
    }
  }, [currentEmail, email, runRequestEmailChange, submitting, triggerHaptic]);

  const fillDigit = useCallback(
    (index: number, value: string) => {
      if (verifying || step !== 'verify') return;

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
    if (verifying || promotionRef.current || code.length !== OTP_LENGTH) return;

    promotionRef.current = true;
    triggerHaptic('medium');
    setVerifying(true);
    try {
      const valid = await runVerifyCode(code);
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
      promotionRef.current = false;
      setVerifying(false);
    }
  }, [digits, email, onClose, onUpdated, resetAll, runVerifyCode, triggerHaptic, verifying]);

  const handleBack = useCallback(() => {
    if (submitting || verifying) return;
    triggerHaptic('light');
    if (step === 'verify') {
      setDigits(Array(OTP_LENGTH).fill(''));
      setOtpError(false);
      setStep('destination');
      return;
    }
    if (step === 'destination') {
      setPassword('');
      setPasswordError('');
      setStep('reauthenticate');
    }
  }, [step, submitting, triggerHaptic, verifying]);

  const codeComplete = digits.every((digit) => digit !== '');
  const canGoBack = step === 'destination' || step === 'verify';
  const clerkReady = userLoaded && sessionLoaded;
  const locked = submitting || verifying;

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) dismiss();
      }}
      dismissible={!locked}
    >
      <DrawerContent
        overlayClassName="z-[120]"
        className="z-[121] mt-24 h-auto max-h-[100dvh]"
        aria-label="Atualizar e-mail"
      >
            <DrawerHeader className="flex items-start justify-between gap-3 px-5 pt-4">
              <div className="flex min-w-0 items-center gap-2.5">
                {canGoBack ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={submitting || verifying}
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
                  <DrawerTitle className="mt-1 truncate text-[22px] font-bold leading-tight tracking-tight text-white">
                    {STEP_TITLES[step]}
                  </DrawerTitle>
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
            </DrawerHeader>

            <StepProgress step={step} />

            <DrawerBody className="relative flex min-h-[21rem] flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
              <AnimatePresence mode="wait" initial={false}>
                {step === 'reauthenticate' ? (
                  <motion.div
                    key="email-reauth"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="flex flex-1 flex-col"
                  >
                    <p className="text-[13px] leading-relaxed text-zinc-500">
                      Para proteger sua conta, confirme que é você. Digite sua senha atual para
                      liberar a troca de e-mail.
                    </p>

                    <div className="mt-5 flex flex-col gap-4">
                      <SheetField
                        htmlFor="email-update-current"
                        label="E-mail Atual"
                        icon={<Mail className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                      >
                        <input
                          id="email-update-current"
                          type="email"
                          value={currentEmail}
                          readOnly
                          disabled
                          aria-readonly
                          className="peer !m-0 !h-auto !min-h-0 w-full flex-1 border-0 bg-transparent px-4 py-3.5 text-[15px] font-medium tracking-tight text-zinc-400 outline-none ring-0 disabled:opacity-100"
                        />
                        <Lock className="h-4 w-4 shrink-0 text-zinc-600" strokeWidth={1.75} aria-hidden />
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
                          ref={passwordRef}
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
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') void handleSubmitPassword();
                          }}
                          className="peer !m-0 !h-auto !min-h-0 w-full flex-1 border-0 bg-transparent px-4 py-3.5 text-[15px] font-medium tracking-tight text-white caret-orange-400 outline-none ring-0 placeholder:text-zinc-600 disabled:opacity-60"
                        />
                      </SheetField>
                    </div>

                    <div className="mt-auto pt-6">
                      <PrimaryAction
                        onClick={() => void handleSubmitPassword()}
                        disabled={submitting || !password || !clerkReady}
                        busy={submitting}
                        label="Autenticar"
                        busyLabel="Autenticando..."
                      />
                    </div>
                  </motion.div>
                ) : step === 'destination' ? (
                  <motion.div
                    key="email-destination"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="flex flex-1 flex-col"
                  >
                    <p className="text-[13px] leading-relaxed text-zinc-500">
                      Identidade confirmada. Informe o novo endereço; enviaremos um código de
                      verificação para ele.
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
                          placeholder="voce@email.com"
                          onChange={(event) => {
                            setEmail(event.target.value);
                            if (emailError) setEmailError('');
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') void handleSubmitEmail();
                          }}
                          className="peer !m-0 !h-auto !min-h-0 w-full flex-1 border-0 bg-transparent px-4 py-3.5 text-[15px] font-medium tracking-tight text-white caret-orange-400 outline-none ring-0 placeholder:text-zinc-600 disabled:opacity-60"
                        />
                      </SheetField>
                    </div>

                    <div className="mt-auto pt-6">
                      <PrimaryAction
                        onClick={() => void handleSubmitEmail()}
                        disabled={submitting || !email}
                        busy={submitting}
                        label="Enviar Código"
                        busyLabel="Enviando código..."
                      />
                    </div>
                  </motion.div>
                ) : step === 'verify' ? (
                  <motion.div
                    key="email-verify"
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
                        onClick={() => void handleVerify()}
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
            </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

const STEP_ORDER: EmailUpdateStep[] = ['reauthenticate', 'destination', 'verify'];

/** Indicador de progresso de 3 segmentos — reforça a natureza em etapas. */
function StepProgress({ step }: { step: EmailUpdateStep }) {
  const activeIndex = step === 'success' ? STEP_ORDER.length : STEP_ORDER.indexOf(step);
  return (
    <div className="flex items-center gap-1.5 px-5 pt-3" aria-hidden>
      {STEP_ORDER.map((_, index) => (
        <span
          key={index}
          className={cn(
            'h-1 flex-1 rounded-full transition-colors duration-300',
            index < activeIndex ? 'bg-orange-500' : 'bg-white/[0.08]'
          )}
        />
      ))}
    </div>
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
