'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { useSession, useUser } from '@clerk/nextjs';
import {
  ArrowLeft,
  AtSign,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ForgotPasswordFlow } from '@/components/settings/forgot-password-flow';
import { OtpInput } from '@/components/ui/otp-input';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

/**
 * TATTOOGO MK — CENTRAL DE RECUPERAÇÃO (APPLE-TIER)
 *
 * Bottom sheet que hospeda os sub-fluxos de recuperação. A máquina de estados é
 * determinística e o conteúdo troca com `AnimatePresence mode="wait"`, de modo
 * que a altura do painel nunca "salta" entre os passos.
 *
 *   Path 1 — "Esqueci a Senha" (Perda Total):
 *     Delega para `ForgotPasswordFlow` — CPF → documento (forense estrita) →
 *     OTP de 6 dígitos por e-mail → nova senha com medidor de força. Nenhuma
 *     prova biométrica simulada é usada.
 *
 *   Path 2 — "Esqueci o E-mail" (Mantendo Senha):
 *     reauth → email → emailOtp → success
 *     A senha atual é validada contra a SESSÃO ativa do Clerk
 *     (`startVerification` + `attemptFirstFactorVerification`); o novo e-mail
 *     é criado, verificado por OTP e promovido a primário, destruindo os
 *     aliases legados e recarregando a sessão.
 *
 * Todos os avanços disparam haptics e os erros são estritamente inline.
 */

export type RecoveryPath = 'password' | 'email';

type RecoveryStep = 'select' | 'reauth' | 'email' | 'emailOtp' | 'success';

export interface RecoveryHubSheetProps {
  open: boolean;
  onClose: () => void;
  /** E-mail de recuperação cadastrado (entrega do OTP do Path 1). */
  recoveryEmail?: string;
  /** E-mail atual (read-only) exibido no passo de reautenticação do Path 2. */
  currentEmail?: string;
  /** Disparado com o novo e-mail após o Path 2 concluir com sucesso. */
  onEmailUpdated?: (email: string) => void;
  /**
   * Sobrescreve o roteamento interno (uso avançado). Quando ausente — o padrão
   * no perfil — o hub executa os fluxos dentro dele mesmo.
   */
  onSelectPath?: (path: RecoveryPath) => void;
}

const OTP_LENGTH = 6;
const DISMISS_DISTANCE = 128;
const DISMISS_VELOCITY = 700;
const SUCCESS_HOLD_MS = 1500;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMAIL_STEPS: RecoveryStep[] = ['reauth', 'email', 'emailOtp'];

const STEP_TITLES: Record<RecoveryStep, string> = {
  select: 'Recuperações Digitais',
  reauth: 'Confirmar Identidade',
  email: 'Novo E-mail',
  emailOtp: 'Verificação',
  success: 'Tudo certo',
};

const STEP_BADGES: Record<RecoveryStep, string> = {
  select: 'Central Segura',
  reauth: 'Etapa 1 de 3',
  email: 'Etapa 2 de 3',
  emailOtp: 'Etapa 3 de 3',
  success: 'Concluído',
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
    haystack.includes('invalid email address')
  );
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 420, damping: 34 },
  },
};

export function RecoveryHubSheet({
  open,
  onClose,
  recoveryEmail = '',
  currentEmail = '',
  onEmailUpdated,
  onSelectPath,
}: RecoveryHubSheetProps): ReactNode {
  const { triggerHaptic } = useHapticFeedback();
  const { user, isLoaded: userLoaded } = useUser();
  const { session, isLoaded: sessionLoaded } = useSession();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [step, setStep] = useState<RecoveryStep>('select');
  const [path, setPath] = useState<RecoveryPath | null>(null);
  const [passwordFlowOpen, setPasswordFlowOpen] = useState(false);

  // Path 2 — reautenticação + novo e-mail + OTP.
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reauthError, setReauthError] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const passwordRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const otpDispatchRef = useRef(false);
  const promotionRef = useRef(false);

  const busy = submitting;

  const resetAll = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setStep('select');
    setPath(null);
    setPasswordFlowOpen(false);
    setPassword('');
    setShowPassword(false);
    setReauthError('');
    setEmail('');
    setEmailError('');
    setSubmitting(false);
    otpDispatchRef.current = false;
    promotionRef.current = false;
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
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      if (step === 'reauth') passwordRef.current?.focus();
      else if (step === 'email') emailRef.current?.focus();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open, step]);

  const dismiss = useCallback(() => {
    if (busy) return;
    triggerHaptic('light');
    onClose();
    window.setTimeout(resetAll, 220);
  }, [busy, onClose, resetAll, triggerHaptic]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismiss]);

  const handleDragEnd = useCallback(
    (_event: unknown, info: PanInfo) => {
      if (busy) return;
      if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
        dismiss();
      }
    },
    [busy, dismiss]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Path 2 — reautenticação + troca de e-mail
  // ─────────────────────────────────────────────────────────────────────────

  const runVerifyPassword = useCallback(
    async (value: string): Promise<void> => {
      if (!session) throw new Error('clerk-not-ready');
      const resource = await session.startVerification({ level: 'first_factor' });
      if (resource.status === 'complete') return;

      const passwordFactor = resource.supportedFirstFactors?.find(
        (candidate) => candidate.strategy === 'password'
      );
      if (!passwordFactor) throw new Error('clerk-not-ready');

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

  const handleSubmitReauth = useCallback(async () => {
    if (submitting) return;
    if (password.length < 6) {
      setReauthError('A senha precisa ter ao menos 6 caracteres.');
      triggerHaptic('heavy');
      return;
    }
    setReauthError('');
    triggerHaptic('medium');
    setSubmitting(true);
    try {
      await runVerifyPassword(password);
      triggerHaptic('success');
      setStep('email');
    } catch {
      setReauthError('A senha atual está incorreta.');
      triggerHaptic('heavy');
    } finally {
      setSubmitting(false);
    }
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
    if (!user) {
      setEmailError('Sessão expirada. Faça login novamente.');
      return;
    }
    otpDispatchRef.current = true;
    setEmailError('');
    triggerHaptic('medium');
    setSubmitting(true);
    try {
      const emailObj = await user.createEmailAddress({ email: trimmed });
      await emailObj.prepareVerification({ strategy: 'email_code' });
      setEmail(trimmed);
      setStep('emailOtp');
    } catch (err) {
      const detail = firstClerkError(err);
      setEmailError(
        isEmailFormatError(err)
          ? 'Insira um endereço de e-mail válido.'
          : detail?.longMessage ||
              detail?.message ||
              'Não foi possível enviar o código. Verifique o endereço e tente novamente.'
      );
      triggerHaptic('heavy');
    } finally {
      otpDispatchRef.current = false;
      setSubmitting(false);
    }
  }, [currentEmail, email, submitting, triggerHaptic, user]);

  const runVerifyEmailCode = useCallback(
    async (code: string): Promise<boolean> => {
      if (!user) return false;
      const targetEmail = user.emailAddresses.find(
        (candidate) => candidate.emailAddress === email
      );
      if (!targetEmail) return false;

      const verification = await targetEmail.attemptVerification({ code });
      if (verification.verification.status !== 'verified') return false;

      const updatedUser = await user.update({ primaryEmailAddressId: targetEmail.id });

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

      await session?.reload();
      return true;
    },
    [email, session, user]
  );

  const handleVerifyEmailCode = useCallback(
    async (code: string): Promise<boolean> => {
      if (promotionRef.current) return false;
      promotionRef.current = true;
      try {
        return await runVerifyEmailCode(code);
      } catch {
        return false;
      } finally {
        promotionRef.current = false;
      }
    },
    [runVerifyEmailCode]
  );

  const handleEmailOtpSuccess = useCallback(() => {
    triggerHaptic('success');
    onEmailUpdated?.(email);
    setStep('success');
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      onClose();
      window.setTimeout(resetAll, 220);
    }, SUCCESS_HOLD_MS);
  }, [email, onClose, onEmailUpdated, resetAll, triggerHaptic]);

  // ─────────────────────────────────────────────────────────────────────────
  // Navegação
  // ─────────────────────────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (next: RecoveryPath) => {
      triggerHaptic('medium');
      if (onSelectPath) {
        onSelectPath(next);
        return;
      }
      setPath(next);
      if (next === 'password') {
        setPasswordFlowOpen(true);
        return;
      }
      setStep('reauth');
    },
    [onSelectPath, triggerHaptic]
  );

  const handlePasswordFlowClose = useCallback(() => {
    setPasswordFlowOpen(false);
    setPath(null);
    setStep('select');
  }, []);

  const handleBack = useCallback(() => {
    if (busy) return;
    triggerHaptic('light');
    if (step === 'reauth') {
      setStep('select');
      setPath(null);
      return;
    }
    if (step === 'email') {
      setEmailError('');
      setStep('reauth');
      return;
    }
    if (step === 'emailOtp') {
      setEmail('');
      setStep('email');
    }
  }, [busy, step, triggerHaptic]);

  if (!mounted) return null;

  const canGoBack = step !== 'select' && step !== 'success';
  const showProgress = path === 'email' && step !== 'select' && step !== 'success';
  const clerkReady = userLoaded && sessionLoaded;

  const options: Array<{
    id: RecoveryPath;
    title: string;
    description: string;
    tag: string;
    icon: ReactNode;
  }> = [
    {
      id: 'password',
      title: 'Esqueci a Senha',
      description:
        'Recuperação total: confirme o CPF, envie seu documento oficial e valide o código de 6 dígitos por e-mail.',
      tag: 'CPF + Documento + OTP',
      icon: <KeyRound className="h-5 w-5" strokeWidth={1.75} />,
    },
    {
      id: 'email',
      title: 'Esqueci o E-mail',
      description: 'Mantendo a senha: confirme a senha atual, informe o novo e-mail e valide o OTP.',
      tag: 'Senha Atual + Novo E-mail + OTP',
      icon: <AtSign className="h-5 w-5" strokeWidth={1.75} />,
    },
  ];

  return (
    <>
      {!passwordFlowOpen
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  key="recovery-hub-sheet"
                  className="fixed inset-0 z-[130] flex h-[100dvh] w-full flex-col justify-end overflow-hidden transform-gpu will-change-transform"
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
                    aria-label="Recuperar acesso"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 42, mass: 0.9 }}
                    drag={busy ? false : 'y'}
                    dragDirectionLock
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0, bottom: 0.35 }}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'gpu-layer relative mx-auto flex max-h-[92dvh] w-full max-w-app transform-gpu flex-col overflow-hidden rounded-t-[28px] will-change-transform',
                      'border-t border-zinc-800/80 bg-zinc-950 text-white shadow-[0_-24px_60px_rgba(0,0,0,0.55)]'
                    )}
                  >
                    <span
                      aria-hidden
                      className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-white/15"
                    />

                    <header className="flex items-start justify-between gap-3 px-5 pt-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {canGoBack ? (
                          <button
                            type="button"
                            onClick={handleBack}
                            disabled={busy}
                            aria-label="Voltar"
                            className="flex h-9 w-9 min-h-9 min-w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.06] text-zinc-400 transition-colors active:scale-[0.96] disabled:opacity-40"
                          >
                            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.9} />
                          </button>
                        ) : (
                          <span className="flex h-9 w-9 min-h-9 min-w-9 shrink-0 items-center justify-center rounded-full border border-orange-500/25 bg-orange-500/10 text-orange-400">
                            <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.9} />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">
                            {STEP_BADGES[step]}
                          </p>
                          <h2 className="mt-1 truncate text-[22px] font-bold leading-tight tracking-tight text-white">
                            {STEP_TITLES[step]}
                          </h2>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={dismiss}
                        disabled={busy}
                        aria-label="Fechar"
                        className="flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.06] text-zinc-400 transition-colors active:scale-[0.96] disabled:opacity-40"
                      >
                        <X className="h-5 w-5" strokeWidth={1.75} />
                      </button>
                    </header>

                    {showProgress ? <StepProgress steps={EMAIL_STEPS} current={step} /> : null}

                    {/* Painel de altura estável: `mode="wait"` troca o passo sem deixar
                        o sheet crescer/encolher de forma abrupta entre as transições. */}
                    <div className="relative flex min-h-[24rem] min-w-0 flex-1 flex-col overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 [overscroll-behavior:contain]">
                      <AnimatePresence mode="wait" initial={false}>
                        {step === 'select' ? (
                          <motion.div
                            key="rh-select"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="flex flex-1 flex-col"
                          >
                            <p className="text-[13px] leading-relaxed text-zinc-500">
                              Escolha o que você esqueceu. Cada caminho usa uma prova de identidade
                              diferente para devolver o acesso com segurança.
                            </p>

                            <motion.div
                              variants={listVariants}
                              initial="hidden"
                              animate="show"
                              className="flex flex-col gap-3 pt-3"
                            >
                              {options.map((option) => (
                                <motion.button
                                  key={option.id}
                                  type="button"
                                  variants={cardVariants}
                                  onClick={() => handleSelect(option.id)}
                                  className="group flex min-h-[104px] w-full items-center gap-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/40 px-4 py-4 text-left transition-colors duration-200 hover:border-orange-500/40 hover:bg-white/[0.04] active:scale-[0.99] active:bg-white/[0.06]"
                                >
                                  <span className="pointer-events-none flex h-12 w-12 min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-400">
                                    {option.icon}
                                  </span>
                                  <span className="pointer-events-none flex min-w-0 flex-1 flex-col gap-y-1">
                                    <span className="text-[15px] font-bold tracking-tight text-zinc-100">
                                      {option.title}
                                    </span>
                                    <span className="text-[12.5px] leading-relaxed text-zinc-400">
                                      {option.description}
                                    </span>
                                    <span className="mt-0.5 inline-flex w-fit items-center rounded-full border border-zinc-800/70 bg-black/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                      {option.tag}
                                    </span>
                                  </span>
                                  <ChevronRight
                                    className="pointer-events-none h-5 w-5 min-h-5 min-w-5 shrink-0 text-zinc-600 transition-colors duration-200 group-hover:text-orange-400"
                                    strokeWidth={1.75}
                                  />
                                </motion.button>
                              ))}
                            </motion.div>
                          </motion.div>
                        ) : step === 'reauth' ? (
                          <motion.div
                            key="rh-reauth"
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            className="flex flex-1 flex-col"
                          >
                            <p className="text-[13px] leading-relaxed text-zinc-500">
                              Para proteger sua conta, confirme que é você. Digite sua senha atual
                              para liberar a troca de e-mail.
                            </p>

                            <div className="mt-5 flex flex-col gap-4">
                              <SheetField
                                htmlFor="rh-current-email"
                                label="E-mail Atual"
                                icon={<Mail className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                              >
                                <input
                                  id="rh-current-email"
                                  type="email"
                                  value={currentEmail}
                                  readOnly
                                  disabled
                                  aria-readonly
                                  className="peer !m-0 !h-auto !min-h-0 w-full flex-1 border-0 bg-transparent px-4 py-3.5 text-[15px] font-medium tracking-tight text-zinc-400 outline-none ring-0 disabled:opacity-100"
                                />
                                <Lock
                                  className="h-4 w-4 shrink-0 text-zinc-600"
                                  strokeWidth={1.75}
                                  aria-hidden
                                />
                              </SheetField>

                              <SheetField
                                htmlFor="rh-current-password"
                                label="Senha Atual"
                                icon={<Lock className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                                error={reauthError}
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
                                  id="rh-current-password"
                                  type={showPassword ? 'text' : 'password'}
                                  name="current-password"
                                  autoComplete="current-password"
                                  value={password}
                                  disabled={submitting}
                                  placeholder="Digite sua senha"
                                  onChange={(event) => {
                                    setPassword(event.target.value);
                                    if (reauthError) setReauthError('');
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') void handleSubmitReauth();
                                  }}
                                  className="peer !m-0 !h-auto !min-h-0 w-full flex-1 border-0 bg-transparent px-4 py-3.5 text-[15px] font-medium tracking-tight text-white caret-orange-400 outline-none ring-0 placeholder:text-zinc-600 disabled:opacity-60"
                                />
                              </SheetField>
                            </div>

                            <div className="mt-auto pt-6">
                              <PrimaryAction
                                onClick={() => void handleSubmitReauth()}
                                disabled={submitting || !password || !clerkReady}
                                busy={submitting}
                                label="Autenticar"
                                busyLabel="Autenticando..."
                              />
                            </div>
                          </motion.div>
                        ) : step === 'email' ? (
                          <motion.div
                            key="rh-email"
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 16 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            className="flex flex-1 flex-col"
                          >
                            <p className="text-[13px] leading-relaxed text-zinc-500">
                              Identidade confirmada. Informe o novo endereço; enviaremos um código
                              de verificação para ele.
                            </p>

                            <div className="mt-5">
                              <SheetField
                                htmlFor="rh-new-email"
                                label="Novo E-mail"
                                icon={<Mail className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                                error={emailError}
                              >
                                <input
                                  ref={emailRef}
                                  id="rh-new-email"
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
                        ) : step === 'emailOtp' ? (
                          <motion.div
                            key="rh-email-otp"
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

                            <div className="mt-6 flex flex-col items-center">
                              <OtpInput
                                length={OTP_LENGTH}
                                userRole="cliente"
                                onComplete={handleVerifyEmailCode}
                                onSuccess={handleEmailOtpSuccess}
                              />
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="rh-success"
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
                              <p className="text-lg font-bold tracking-tight text-white">
                                E-mail atualizado
                              </p>
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
          )
        : null}

      <ForgotPasswordFlow
        open={passwordFlowOpen}
        onClose={handlePasswordFlowClose}
        recoveryEmail={recoveryEmail}
      />
    </>
  );
}

/** Indicador de progresso segmentado — reforça a natureza em etapas. */
function StepProgress({ steps, current }: { steps: RecoveryStep[]; current: RecoveryStep }) {
  const activeIndex = steps.indexOf(current);
  return (
    <div className="flex items-center gap-1.5 px-5 pt-3" aria-hidden>
      {steps.map((step, index) => (
        <span
          key={step}
          className={cn(
            'h-1 flex-1 rounded-full transition-colors duration-300',
            index <= activeIndex ? 'bg-orange-500' : 'bg-white/[0.08]'
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
function SheetField({ htmlFor, label, icon, error, trailing, children }: SheetFieldProps) {
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

export default RecoveryHubSheet;
