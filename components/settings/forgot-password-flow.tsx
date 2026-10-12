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
import { useAuth } from '@clerk/nextjs';
import { useSignIn } from '@clerk/nextjs/legacy';
import {
  ArrowLeft,
  Check,
  FileText,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Upload,
  User,
  X,
} from 'lucide-react';
import { authedFetch } from '@/lib/utils/authed-fetch';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { formatCpf, isValidCpf, onlyCpfDigits } from '@/lib/utils/cpf';
import { getPasswordStrength } from '@/lib/utils/password-strength';
import { PasswordStrengthBar } from '@/components/features/password-strength-bar';
import { OtpInput } from '@/components/ui/otp-input';
import { formatAppError } from '@/lib/error-handler';
import { cn } from '@/lib/utils';

/**
 * TATTOOGO MK — RECUPERAÇÃO DE SENHA (CPF + DOCUMENTO + OTP)
 *
 * Sub-fluxo bancário do Path A do hub de recuperação. Máquina de estados
 * ESTRITA e linear, sem atalhos:
 *
 *   1. `cpf`      — coleta o CPF cadastrado (com máscara automática) e valida
 *                   contra a base/Clerk (`/api/auth/verify-reset-credentials`).
 *   2. `document` — reaproveita o motor seguro de upload (presign R2 → PUT →
 *                   análise). Exibe o indicador "Análise de segurança em
 *                   andamento" durante o processamento.
 *   3. `otp`      — dispara e confere o código de 6 dígitos enviado ao e-mail
 *                   de recuperação via Clerk (`reset_password_email_code`).
 *   4. `password` — nova senha com o medidor de força obrigatório e reset real
 *                   do Clerk (`resetPassword`).
 *
 * A geometria é determinística (`flex-col`, painel de altura mínima fixa) e as
 * transições usam `AnimatePresence mode="wait"` — zero layout shift entre os
 * passos.
 */

export type ForgotPasswordStep = 'cpf' | 'document' | 'otp' | 'password' | 'success';

export interface ForgotPasswordFlowProps {
  open: boolean;
  onClose: () => void;
  /** E-mail de recuperação registrado na conta. */
  recoveryEmail: string;
  /** Disparado após o reset concluído com sucesso. */
  onComplete?: () => void;
}

const STEP_ORDER: ForgotPasswordStep[] = ['cpf', 'document', 'otp', 'password'];

const STEP_TITLES: Record<ForgotPasswordStep, string> = {
  cpf: 'Verificar CPF',
  document: 'Documento de Identidade',
  otp: 'Código por E-mail',
  password: 'Nova Senha',
  success: 'Acesso Recuperado',
};

const STEP_META: Record<ForgotPasswordStep, { badge: string; icon: typeof User }> = {
  cpf: { badge: 'Etapa 1 de 4', icon: User },
  document: { badge: 'Etapa 2 de 4', icon: FileText },
  otp: { badge: 'Etapa 3 de 4', icon: Mail },
  password: { badge: 'Etapa 4 de 4', icon: Lock },
  success: { badge: 'Concluído', icon: Check },
};

const DISMISS_DISTANCE = 128;
const DISMISS_VELOCITY = 700;
const SUCCESS_HOLD_MS = 1600;
const OTP_LENGTH = 6;

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
const ACCEPTED_INPUT_TYPES = 'application/pdf,image/jpeg,image/png';
const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
};

type UploadPhase = 'idle' | 'presigning' | 'uploading' | 'validating';

const PHASE_META: Record<Exclude<UploadPhase, 'idle'>, { label: string; percent: number }> = {
  presigning: { label: 'Preparando canal seguro...', percent: 18 },
  uploading: { label: 'Enviando documento criptografado...', percent: 55 },
  validating: { label: 'Análise de segurança em andamento...', percent: 92 },
};

type ClerkErrorShape = {
  errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
};

function firstClerkError(err: unknown) {
  const errors = (err as ClerkErrorShape | null | undefined)?.errors;
  return Array.isArray(errors) ? errors[0] : undefined;
}

function parseClerkPasswordError(err: unknown): string {
  const detail = firstClerkError(err);
  const haystack =
    `${detail?.code ?? ''} ${detail?.message ?? ''} ${detail?.longMessage ?? ''}`.toLowerCase();
  if (haystack.includes('pwned') || haystack.includes('leaked') || haystack.includes('breach')) {
    return 'Esta senha já vazou na internet. Escolha uma mais segura.';
  }
  return detail?.longMessage || detail?.message || 'Não foi possível atualizar a senha.';
}

/** iOS/Android frequentemente entregam `file.type` vazio; inferimos pela extensão. */
function resolveUploadContentType(file: File): string {
  if (file.type && ALLOWED_TYPES.has(file.type)) {
    return file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPE_BY_EXT[ext] ?? '';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const head = local.slice(0, 1);
  const tail = local.length > 2 ? local.slice(-1) : '';
  return `${head}${'*'.repeat(Math.max(local.length - 2, 1))}${tail}@${domain}`;
}

export function ForgotPasswordFlow({
  open,
  onClose,
  recoveryEmail,
  onComplete,
}: ForgotPasswordFlowProps): ReactNode {
  const { getToken } = useAuth();
  const { isLoaded, signIn } = useSignIn();
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [step, setStep] = useState<ForgotPasswordStep>('cpf');

  const [cpf, setCpf] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [cpfSubmitting, setCpfSubmitting] = useState(false);
  const [cpfStatus, setCpfStatus] = useState<
    'idle' | 'checking' | 'verified' | 'unregistered' | 'error'
  >('idle');

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [phase, setPhase] = useState<UploadPhase>('idle');

  const [otpReady, setOtpReady] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendSeconds, setResendSeconds] = useState(60);
  const [resending, setResending] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [resetting, setResetting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cpfRef = useRef<HTMLInputElement | null>(null);
  const cpfCheckSeq = useRef(0);
  const otpRequestedRef = useRef(false);
  const successTimer = useRef<number | null>(null);

  const strength = getPasswordStrength(password, t);
  const passwordsMatch = Boolean(password) && password === confirmPassword;
  const uploading = phase !== 'idle';
  const busy = cpfSubmitting || uploading || resetting;

  const cpfDigits = onlyCpfDigits(cpf);
  const cpfValid = isValidCpf(cpfDigits);
  const cpfChecking = cpfStatus === 'checking';
  const cpfButtonEnabled = cpfValid && (cpfStatus === 'verified' || cpfStatus === 'error');
  const cpfFieldError =
    cpfError || (cpfDigits.length > 0 && !cpfValid ? t('auth.invalidCpf') : '');

  const resetAll = useCallback(() => {
    setStep('cpf');
    setCpf('');
    setCpfError('');
    setCpfSubmitting(false);
    setCpfStatus('idle');
    cpfCheckSeq.current = 0;
    setFile(null);
    setFileError('');
    setPhase('idle');
    setOtpReady(false);
    setOtpError('');
    setResendSeconds(60);
    setResending(false);
    setPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setResetting(false);
    otpRequestedRef.current = false;
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
      if (successTimer.current !== null) window.clearTimeout(successTimer.current);
    };
  }, []);

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

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      if (step === 'cpf') cpfRef.current?.focus();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open, step]);

  useEffect(() => {
    if (!open || step !== 'cpf') return;
    const digits = onlyCpfDigits(cpf);
    const email = recoveryEmail.trim().toLowerCase();
    if (!isValidCpf(digits) || !email) {
      cpfCheckSeq.current += 1;
      setCpfStatus('idle');
      return;
    }
    const seq = cpfCheckSeq.current + 1;
    cpfCheckSeq.current = seq;
    setCpfStatus('checking');
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/auth/verify-reset-credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, cpf: digits }),
        });
        const payload = (await response.json().catch(() => ({}))) as { ok?: boolean };
        if (cpfCheckSeq.current !== seq) return;
        if (response.ok && payload.ok === true) {
          setCpfStatus('verified');
          setCpfError('');
        } else {
          setCpfStatus('unregistered');
          setCpfError(t('auth.cpfNotRegistered'));
        }
      } catch {
        if (cpfCheckSeq.current !== seq) return;
        setCpfStatus('error');
        setCpfError(t('errors.network'));
      }
    }, 420);
    return () => window.clearTimeout(timer);
  }, [open, step, cpf, recoveryEmail, t]);

  useEffect(() => {
    if (step !== 'otp' || resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step, resendSeconds]);

  const handleDragEnd = useCallback(
    (_event: unknown, info: PanInfo) => {
      if (busy) return;
      if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
        triggerHaptic('light');
        onClose();
        window.setTimeout(resetAll, 220);
      }
    },
    [busy, onClose, resetAll, triggerHaptic]
  );

  /** Passo 1 — valida o CPF contra a base/Clerk usando o e-mail da conta. */
  const handleSubmitCpf = useCallback(async () => {
    if (cpfSubmitting) return;
    const digits = onlyCpfDigits(cpf);
    if (!isValidCpf(digits)) {
      setCpfStatus('idle');
      setCpfError(t('auth.invalidCpf'));
      triggerHaptic('heavy');
      return;
    }
    setCpfError('');
    triggerHaptic('medium');
    setCpfSubmitting(true);
    setCpfStatus('checking');
    try {
      const response = await fetch('/api/auth/verify-reset-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim().toLowerCase(), cpf: digits }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || payload.ok !== true) {
        setCpfStatus('unregistered');
        setCpfError(t('auth.cpfNotRegistered'));
        triggerHaptic('heavy');
        return;
      }
      setCpfStatus('verified');
      triggerHaptic('success');
      setStep('document');
    } catch {
      setCpfStatus('error');
      setCpfError(t('errors.network'));
      triggerHaptic('heavy');
    } finally {
      setCpfSubmitting(false);
    }
  }, [cpf, cpfSubmitting, recoveryEmail, triggerHaptic, t]);

  const handleSelectFile = useCallback(
    (next: File) => {
      setFileError('');
      const contentType = resolveUploadContentType(next);
      if (!contentType || !ALLOWED_TYPES.has(contentType)) {
        setFileError('Formato inválido. Envie JPG, PNG ou PDF.');
        triggerHaptic('heavy');
        return;
      }
      if (next.size > MAX_FILE_BYTES) {
        setFileError('O documento excede o limite de 10 MB.');
        triggerHaptic('heavy');
        return;
      }
      setFile(next);
      triggerHaptic('light');
    },
    [triggerHaptic]
  );

  /** Passo 2 — reaproveita o motor de upload seguro: presign → PUT → análise. */
  const runUpload = useCallback(
    async (selected: File) => {
      setFileError('');
      setPhase('presigning');
      const contentType = resolveUploadContentType(selected);
      const tokenFn = () => getToken({ skipCache: true });
      try {
        const presignRes = await authedFetch(
          '/api/upload/presign',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: selected.name, contentType }),
          },
          tokenFn
        );
        const presign = (await presignRes.json().catch(() => ({}))) as {
          presignedUrl?: string;
          fileKey?: string;
          publicUrl?: string;
          erro?: string;
        };
        if (!presignRes.ok || !presign.presignedUrl || !presign.fileKey) {
          throw new Error(presign.erro || 'Não foi possível preparar o upload.');
        }

        setPhase('uploading');
        const putRes = await fetch(presign.presignedUrl, {
          method: 'PUT',
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store',
          headers: { 'Content-Type': contentType },
          body: selected,
        });
        if (!putRes.ok) {
          throw new Error('Falha ao enviar o documento. Tente novamente.');
        }

        setPhase('validating');
        const validateRes = await authedFetch(
          '/api/auth/recovery/validate-document',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileKey: presign.fileKey,
              publicUrl: presign.publicUrl,
              contentType,
            }),
          },
          tokenFn
        );
        const result = (await validateRes.json().catch(() => ({}))) as {
          success?: boolean;
          valid?: boolean;
          erro?: string;
          error?: string;
        };
        const documentApproved =
          validateRes.ok === true && result.success === true && result.valid === true;
        if (!documentApproved) {
          throw new Error(
            result.erro ||
              result.error ||
              'Documento inválido ou ilegível. Envie um documento oficial válido.'
          );
        }

        triggerHaptic('success');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setStep('otp');
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : formatAppError(err, 'api');
        setFileError(message);
        triggerHaptic('heavy');
      } finally {
        setPhase('idle');
      }
    },
    [getToken, triggerHaptic]
  );

  const handleSubmitDocument = useCallback(() => {
    if (!file || uploading) return;
    triggerHaptic('medium');
    void runUpload(file);
  }, [file, runUpload, triggerHaptic, uploading]);

  const dispatchOtp = useCallback(async () => {
    if (!signIn) throw new Error('clerk-not-ready');
    await signIn.create({
      strategy: 'reset_password_email_code',
      identifier: recoveryEmail.trim().toLowerCase(),
    });
  }, [recoveryEmail, signIn]);

  // Passo 3 — dispara o OTP uma única vez ao entrar na etapa.
  useEffect(() => {
    if (!open) {
      otpRequestedRef.current = false;
      return;
    }
    if (step !== 'otp' || otpRequestedRef.current) return;
    if (!isLoaded || !signIn) return;
    otpRequestedRef.current = true;
    void (async () => {
      try {
        await dispatchOtp();
        setOtpReady(true);
        setResendSeconds(60);
      } catch (err) {
        otpRequestedRef.current = false;
        setOtpError(formatAppError(err, 'reset'));
      }
    })();
  }, [open, step, isLoaded, signIn, dispatchOtp]);

  const handleVerifyOtp = useCallback(
    async (code: string): Promise<boolean> => {
      if (!signIn) return false;
      setOtpError('');
      try {
        const result = await signIn.attemptFirstFactor({
          strategy: 'reset_password_email_code',
          code,
        });
        if (result.status !== 'needs_new_password' && result.status !== 'complete') {
          throw new Error('errors.clerk.codeInvalid');
        }
        return true;
      } catch (err) {
        setOtpError(formatAppError(err, 'reset'));
        return false;
      }
    },
    [signIn]
  );

  const handleResendOtp = useCallback(async () => {
    if (resendSeconds > 0 || resending || !otpReady) return;
    setResending(true);
    setOtpError('');
    try {
      await dispatchOtp();
      setResendSeconds(60);
      triggerHaptic('light');
    } catch (err) {
      setOtpError(formatAppError(err, 'reset'));
    } finally {
      setResending(false);
    }
  }, [dispatchOtp, otpReady, resendSeconds, resending, triggerHaptic]);

  /** Passo 4 — reset real via Clerk, com medidor de força obrigatório. */
  const handleResetPassword = useCallback(async () => {
    if (resetting) return;
    if (!strength.isComplete) {
      setPasswordError('A senha não atende todos os requisitos de segurança.');
      triggerHaptic('heavy');
      return;
    }
    if (!passwordsMatch) {
      setPasswordError('As senhas não coincidem.');
      triggerHaptic('heavy');
      return;
    }
    setPasswordError('');
    triggerHaptic('medium');
    setResetting(true);
    try {
      if (!signIn) throw new Error('clerk-not-ready');
      await signIn.resetPassword({ password, signOutOfOtherSessions: true });
      triggerHaptic('success');
      setStep('success');
      successTimer.current = window.setTimeout(() => {
        successTimer.current = null;
        onComplete?.();
        onClose();
        window.setTimeout(resetAll, 220);
      }, SUCCESS_HOLD_MS);
    } catch (err) {
      setPasswordError(parseClerkPasswordError(err));
      triggerHaptic('heavy');
    } finally {
      setResetting(false);
    }
  }, [
    onClose,
    onComplete,
    password,
    passwordsMatch,
    resetAll,
    resetting,
    signIn,
    strength.isComplete,
    triggerHaptic,
  ]);

  const handleBack = useCallback(() => {
    if (busy) return;
    triggerHaptic('light');
    if (step === 'document') {
      setFile(null);
      setFileError('');
      setStep('cpf');
      return;
    }
    if (step === 'otp') {
      setOtpError('');
      otpRequestedRef.current = false;
      setStep('document');
      return;
    }
    if (step === 'password') {
      setPassword('');
      setConfirmPassword('');
      setPasswordError('');
      setStep('otp');
    }
  }, [busy, step, triggerHaptic]);

  if (!mounted) return null;

  const canGoBack = step === 'document' || step === 'otp' || step === 'password';
  const StepIcon = STEP_META[step].icon;
  const phaseMeta = phase === 'idle' ? null : PHASE_META[phase];

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="forgot-password-flow"
          className="fixed inset-0 z-[140] flex h-[100dvh] w-full flex-col justify-end overflow-hidden transform-gpu will-change-transform"
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
            aria-label="Recuperar senha"
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
                ) : null}
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">
                    <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                    {STEP_META[step].badge}
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

            <StepProgress step={step} />

            <div className="relative flex min-h-[24rem] flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
              <AnimatePresence mode="wait" initial={false}>
                {step === 'cpf' ? (
                  <motion.div
                    key="fp-cpf"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="flex flex-1 flex-col"
                  >
                    <p className="text-[13px] leading-relaxed text-zinc-500">
                      Para iniciar a recuperação bancária, confirme o CPF cadastrado na sua conta.
                    </p>

                    <div className="mt-5">
                      <FlowField
                        htmlFor="fp-cpf"
                        label="CPF Cadastrado"
                        icon={<User className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                        error={cpfFieldError}
                      >
                        <input
                          ref={cpfRef}
                          id="fp-cpf"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="000.000.000-00"
                          value={cpf}
                          disabled={cpfSubmitting}
                          aria-invalid={cpfFieldError ? true : undefined}
                          onChange={(event) => {
                            const next = formatCpf(event.target.value);
                            setCpf(next);
                            if (cpfError) setCpfError('');
                            if (isValidCpf(onlyCpfDigits(next))) triggerHaptic('light');
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && cpfButtonEnabled) void handleSubmitCpf();
                          }}
                          className="peer !m-0 !h-auto !min-h-0 w-full flex-1 border-0 bg-transparent px-4 py-3.5 text-[15px] font-medium tracking-tight text-white caret-orange-400 outline-none ring-0 placeholder:text-zinc-600 disabled:opacity-60"
                        />
                      </FlowField>
                    </div>

                    <p className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3.5 py-2.5 text-[11px] leading-relaxed text-zinc-500">
                      Seus dados são comparados de forma segura contra o cadastro. Nada é exibido
                      nem compartilhado.
                    </p>

                    <div className="mt-auto pt-6">
                      <motion.div
                        animate={{ scale: cpfButtonEnabled && !cpfSubmitting ? 1 : 0.985 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 26 }}
                      >
                        <PrimaryAction
                          onClick={() => void handleSubmitCpf()}
                          disabled={cpfSubmitting || cpfChecking || !cpfButtonEnabled}
                          busy={cpfSubmitting || cpfChecking}
                          label={cpfStatus === 'error' ? t('common.retry') : 'Validar CPF'}
                          busyLabel={cpfChecking ? 'Verificando CPF...' : 'Validando...'}
                        />
                      </motion.div>
                    </div>
                  </motion.div>
                ) : step === 'document' ? (
                  <motion.div
                    key="fp-document"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="flex flex-1 flex-col"
                  >
                    <p className="text-[13px] leading-relaxed text-zinc-500">
                      CPF confirmado. Envie uma foto nítida do seu documento oficial (RG, CNH ou
                      Passaporte) para a análise de segurança.
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_INPUT_TYPES}
                      className="sr-only"
                      disabled={uploading}
                      onChange={(event) => {
                        const selected = event.target.files?.[0];
                        if (selected) handleSelectFile(selected);
                        event.target.value = '';
                      }}
                    />

                    <div className="mt-5">
                      <AnimatePresence mode="wait" initial={false}>
                        {file ? (
                          <motion.div
                            key="fp-file"
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                            className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3"
                          >
                            {uploading ? (
                              <span
                                aria-hidden
                                className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
                              >
                                <motion.span
                                  className="absolute inset-y-0 w-1/2 bg-[linear-gradient(110deg,transparent,rgba(249,115,22,0.22),transparent)]"
                                  initial={{ x: '-150%' }}
                                  animate={{ x: '250%' }}
                                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                />
                              </span>
                            ) : null}
                            <span className="relative flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-400">
                              <FileText className="h-5 w-5" strokeWidth={1.75} />
                            </span>
                            <span className="relative min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-zinc-100">
                                {file.name}
                              </span>
                              <span className="mt-0.5 block text-xs text-zinc-500">
                                {formatFileSize(file.size)} · pronto para envio
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setFile(null);
                                setFileError('');
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              disabled={uploading}
                              aria-label="Remover documento"
                              className="relative flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-zinc-400 transition-colors hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
                            >
                              <X className="h-4 w-4" strokeWidth={2} />
                            </button>
                          </motion.div>
                        ) : (
                          <motion.button
                            key="fp-dropzone"
                            type="button"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                            whileHover={!uploading ? { scale: 1.01 } : undefined}
                            whileTap={!uploading ? { scale: 0.985 } : undefined}
                            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                            className="group flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-7 text-center transition-colors hover:border-orange-500/60 hover:bg-orange-500/5 disabled:opacity-60"
                          >
                            <Upload
                              className="mb-2 h-6 w-6 text-orange-400 transition-transform duration-300 group-hover:-translate-y-0.5"
                              strokeWidth={1.75}
                            />
                            <span className="text-sm font-semibold text-zinc-100">
                              Tirar foto ou enviar documento
                            </span>
                            <span className="mt-1 text-xs text-zinc-500">
                              JPG, PNG ou PDF · até 10 MB
                            </span>
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="mt-3 min-h-[18px]">
                      <AnimatePresence>
                        {fileError ? (
                          <motion.p
                            key="fp-file-error"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-[11px] font-medium text-red-500"
                          >
                            {fileError}
                          </motion.p>
                        ) : null}
                      </AnimatePresence>
                    </div>

                    <SecurityAnalysis active={uploading} phaseMeta={phaseMeta} />

                    <div className="mt-auto pt-6">
                      <PrimaryAction
                        onClick={handleSubmitDocument}
                        disabled={!file || uploading}
                        busy={uploading}
                        label="Enviar para Análise"
                        busyLabel="Analisando..."
                      />
                    </div>
                  </motion.div>
                ) : step === 'otp' ? (
                  <motion.div
                    key="fp-otp"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="flex flex-1 flex-col"
                  >
                    <p className="text-[13px] leading-relaxed text-zinc-500">
                      Identidade validada. Enviamos um código de 6 dígitos para o e-mail de
                      recuperação{' '}
                      <span className="font-semibold text-orange-400">
                        {maskEmail(recoveryEmail)}
                      </span>
                      .
                    </p>

                    <div className="mt-6 flex flex-col items-center">
                      {otpReady ? (
                        <OtpInput
                          length={OTP_LENGTH}
                          onComplete={handleVerifyOtp}
                          onSuccess={() => setStep('password')}
                          userRole="cliente"
                        />
                      ) : (
                        <div className="flex min-h-[7rem] items-center justify-center gap-2 text-sm text-zinc-400">
                          <Loader2 className="h-4 w-4 animate-spin text-orange-400" strokeWidth={2} />
                          Enviando código...
                        </div>
                      )}
                    </div>

                    <div className="mt-3 min-h-[18px] px-1">
                      <AnimatePresence>
                        {otpError ? (
                          <motion.p
                            key="fp-otp-error"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-center text-xs font-medium text-red-500"
                          >
                            {otpError}
                          </motion.p>
                        ) : null}
                      </AnimatePresence>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleResendOtp()}
                      disabled={resendSeconds > 0 || resending || !otpReady}
                      className="mt-auto flex min-h-11 w-full items-center justify-center text-sm font-semibold text-orange-500 transition-colors hover:underline disabled:cursor-not-allowed disabled:text-zinc-600"
                    >
                      {resending
                        ? 'Reenviando...'
                        : resendSeconds > 0
                          ? `Reenviar código em ${resendSeconds}s`
                          : 'Reenviar código'}
                    </button>
                  </motion.div>
                ) : step === 'password' ? (
                  <motion.div
                    key="fp-password"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="flex flex-1 flex-col"
                  >
                    <p className="text-[13px] leading-relaxed text-zinc-500">
                      Código confirmado. Defina sua nova senha de acesso.
                    </p>

                    <div className="mt-5 flex flex-col gap-4">
                      <FlowField
                        htmlFor="fp-password"
                        label="Nova Senha"
                        icon={<Lock className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                      >
                        <input
                          id="fp-password"
                          type="password"
                          name="new-password"
                          autoComplete="new-password"
                          value={password}
                          disabled={resetting}
                          placeholder="Digite a nova senha"
                          onChange={(event) => {
                            setPassword(event.target.value);
                            if (passwordError) setPasswordError('');
                          }}
                          className="peer !m-0 !h-auto !min-h-0 w-full flex-1 border-0 bg-transparent px-4 py-3.5 text-[15px] font-medium tracking-tight text-white caret-orange-400 outline-none ring-0 placeholder:text-zinc-600 disabled:opacity-60"
                        />
                      </FlowField>

                      <PasswordStrengthBar password={password} error={passwordError || undefined} />

                      <FlowField
                        htmlFor="fp-confirm"
                        label="Confirmar Senha"
                        icon={<Lock className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                        error={
                          confirmPassword && !passwordsMatch ? 'As senhas não coincidem.' : ''
                        }
                      >
                        <input
                          id="fp-confirm"
                          type="password"
                          name="confirm-password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          disabled={resetting}
                          placeholder="Repita a nova senha"
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') void handleResetPassword();
                          }}
                          className="peer !m-0 !h-auto !min-h-0 w-full flex-1 border-0 bg-transparent px-4 py-3.5 text-[15px] font-medium tracking-tight text-white caret-orange-400 outline-none ring-0 placeholder:text-zinc-600 disabled:opacity-60"
                        />
                      </FlowField>
                    </div>

                    <div className="mt-auto pt-6">
                      <PrimaryAction
                        onClick={() => void handleResetPassword()}
                        disabled={resetting || !strength.isComplete || !passwordsMatch}
                        busy={resetting}
                        label="Redefinir Senha"
                        busyLabel="Redefinindo..."
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="fp-success"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="flex flex-1 flex-col items-center justify-center gap-4 text-center"
                  >
                    <span className="flex h-16 w-16 min-h-16 min-w-16 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-400 shadow-[0_0_28px_rgba(249,115,22,0.4)]">
                      <StepIcon className="h-7 w-7" strokeWidth={2.4} />
                    </span>
                    <div className="flex flex-col gap-1">
                      <p className="text-lg font-bold tracking-tight text-white">
                        Acesso recuperado
                      </p>
                      <p className="text-[13px] text-zinc-500">
                        Sua nova senha já está ativa. Use-a no próximo login.
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

/** Indicador contínuo de análise — reforça que o documento está sob verificação. */
function SecurityAnalysis({
  active,
  phaseMeta,
}: {
  active: boolean;
  phaseMeta: { label: string; percent: number } | null;
}) {
  return (
    <div className="mt-4 min-h-14">
      <AnimatePresence>
        {active && phaseMeta ? (
          <motion.div
            key="fp-analysis"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-orange-500/25 bg-orange-500/[0.06] px-3.5 py-3"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400">
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full border border-orange-500/50"
                  animate={{ scale: [1, 1.6], opacity: [0.55, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                />
                <ShieldCheck className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-orange-300">
                  {phaseMeta.label}
                </p>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <motion.span
                    className="block h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300"
                    initial={{ width: 0 }}
                    animate={{ width: `${phaseMeta.percent}%` }}
                    transition={{ ease: 'easeOut', duration: 0.45 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Indicador de progresso de 4 segmentos — reforça a natureza em etapas. */
function StepProgress({ step }: { step: ForgotPasswordStep }) {
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

type FlowFieldProps = {
  htmlFor: string;
  label: string;
  icon: ReactNode;
  error?: string;
  children: ReactNode;
};

/** Inset-grouped field, Apple-style: label acima, grupo arredondado abaixo. */
function FlowField({ htmlFor, label, icon, error, children }: FlowFieldProps) {
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

export default ForgotPasswordFlow;
