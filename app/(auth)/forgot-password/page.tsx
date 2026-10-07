'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { useSignIn } from '@clerk/nextjs/legacy';
import { Input } from '@/components/input';
import { OtpInput } from '@/components/ui/otp-input';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { PasswordStrengthBar } from '@/components/features/password-strength-bar';
import { passwordSchema } from '@/lib/utils/password-strength';
import { formatCpf, isValidCpf, onlyCpfDigits } from '@/lib/utils/cpf';
import { useRedirectIfAuthenticated } from '@/hooks/use-redirect-if-authenticated';
import { AuthBridgeOverlay, AuthScreen } from '@/components/layout/auth-screen';
import { formatAppError } from '@/lib/error-handler';

const credentialsSchema = z.object({
  email: z.string().email('E-mail inválido'),
  cpf: z
    .string()
    .min(11, 'CPF inválido')
    .refine((value) => isValidCpf(value), 'CPF inválido'),
});

const passwordSchemaForm = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type CredentialsValues = z.infer<typeof credentialsSchema>;
type PasswordValues = z.infer<typeof passwordSchemaForm>;
type ResetStep = 'credentials' | 'otp' | 'password';

export default function ForgotPasswordPage() {
  const { isLoaded, signIn } = useSignIn();
  const clerk = useClerk();
  const router = useRouter();
  const [step, setStep] = useState<ResetStep>('credentials');
  const [emailForReset, setEmailForReset] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const [resending, setResending] = useState(false);
  const [forceShow, setForceShow] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const { bridging: sessionBridge } = useRedirectIfAuthenticated(
    step === 'credentials' && !isLoading && !resetComplete
  );

  useEffect(() => {
    if (!resetComplete) return;
    const timer = window.setTimeout(() => {
      router.push('/login?reset=success');
    }, 160);
    return () => window.clearTimeout(timer);
  }, [resetComplete, router]);

  const credentialsForm = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', cpf: '' },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchemaForm),
    mode: 'onChange',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const passwordValue = useWatch({ control: passwordForm.control, name: 'password' }) || '';
  const confirmPasswordValue =
    useWatch({ control: passwordForm.control, name: 'confirmPassword' }) || '';
  const passwordsMatch = Boolean(passwordValue) && passwordValue === confirmPasswordValue;

  useEffect(() => {
    const timer = setTimeout(() => setForceShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (step !== 'otp' || resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step, resendSeconds]);

  const startClerkReset = async (email: string) => {
    if (!signIn) {
      throw new Error('Clerk ainda não está pronto.');
    }
    await signIn.create({
      strategy: 'reset_password_email_code',
      identifier: email,
    });
  };

  const onSubmitCredentials = async (data: CredentialsValues) => {
    setIsLoading(true);
    const email = data.email.trim().toLowerCase();
    const cpf = onlyCpfDigits(data.cpf);
    try {
      const response = await fetch('/api/auth/verify-reset-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, cpf }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || payload.ok !== true) {
        toast.error(payload.error || 'E-mail ou CPF não conferem.');
        return;
      }

      await startClerkReset(email);
      setEmailForReset(email);
      setStep('otp');
      setResendSeconds(60);
      toast.success('Código de 6 dígitos enviado para o seu e-mail.');
    } catch (err) {
      toast.error(formatAppError(err, 'reset'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string): Promise<boolean> => {
    try {
      if (!signIn) {
        throw new Error('Clerk ainda não está pronto.');
      }
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: otp,
      });
      if (result.status !== 'needs_new_password' && result.status !== 'complete') {
        throw new Error('Código inválido.');
      }
      setStep('password');
      return true;
    } catch (err) {
      toast.error(formatAppError(err, 'reset'));
      return false;
    }
  };

  const handleResendOtp = async () => {
    if (resendSeconds > 0 || resending || !emailForReset) return;
    setResending(true);
    try {
      await startClerkReset(emailForReset);
      setResendSeconds(60);
      toast.success('Novo código enviado.');
    } catch (err) {
      toast.error(formatAppError(err, 'reset'));
    } finally {
      setResending(false);
    }
  };

  const onSubmitPassword = async (data: PasswordValues) => {
    setIsLoading(true);
    try {
      if (!signIn) {
        throw new Error('Clerk ainda não está pronto.');
      }
      await signIn.resetPassword({
        password: data.password,
        signOutOfOtherSessions: true,
      });
      try {
        await clerk.signOut();
      } catch {
        // Sessão residual não pode bloquear o redirect rígido para o login.
      }
      toast.success('Senha redefinida com sucesso.');
      setResetComplete(true);
    } catch (err) {
      toast.error(formatAppError(err, 'reset'));
      setIsLoading(false);
    }
  };

  if (!isLoaded && !forceShow) {
    return (
      <AuthScreen>
        <TattooMachineLoader compact label="Carregando" />
      </AuthScreen>
    );
  }

  if (step === 'otp') {
    return (
      <AuthScreen>
        <AuthBridgeOverlay visible={sessionBridge} label="Carregando" />
        <div className="screen-fade-in w-full max-w-md space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl sm:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-white">
              Verificação <span className="text-orange-500">OTP</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Digite o código de 6 dígitos enviado para {emailForReset}
            </p>
          </div>
          <OtpInput onComplete={handleVerifyOtp} length={6} />
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendSeconds > 0 || resending}
            className="flex min-h-[44px] w-full items-center justify-center text-center text-sm font-semibold text-orange-500 disabled:cursor-not-allowed disabled:text-zinc-500 hover:underline"
          >
            {resending
              ? 'Reenviando...'
              : resendSeconds > 0
                ? `Reenviar código em ${resendSeconds}s`
                : 'Reenviar código'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('credentials');
              setEmailForReset('');
            }}
            className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-zinc-800 text-sm font-semibold text-zinc-400 transition-colors hover:border-orange-500 hover:text-orange-500"
          >
            Voltar
          </button>
        </div>
      </AuthScreen>
    );
  }

  if (step === 'password') {
    return (
      <AuthScreen>
        <AuthBridgeOverlay visible={sessionBridge} label="Carregando" />
        <div className="screen-fade-in w-full max-w-sm space-y-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-white">
              Nova <span className="text-orange-500">senha</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-500">Defina uma senha forte para sua conta</p>
          </div>
          <form
            onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
            className="space-y-6"
            noValidate
          >
            <div className="space-y-4">
              <Input
                label="Nova senha"
                type="password"
                autoComplete="new-password"
                placeholder="Nova senha"
                className="focus:ring-orange-500"
                {...passwordForm.register('password')}
                error={passwordForm.formState.errors.password?.message}
              />
              <PasswordStrengthBar password={passwordValue} />
              <Input
                label="Confirmar senha"
                type="password"
                autoComplete="new-password"
                placeholder="Repita a senha"
                className="focus:ring-orange-500"
                {...passwordForm.register('confirmPassword')}
                error={
                  passwordForm.formState.errors.confirmPassword?.message ||
                  (confirmPasswordValue && !passwordsMatch ? 'As senhas não coincidem' : undefined)
                }
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !passwordsMatch}
              className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-orange-500 py-3 font-bold text-black transition-all hover:bg-orange-600 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] active:scale-95 disabled:opacity-50"
            >
            {isLoading ? <TattooMachineLoader compact label="Salvando" /> : 'Salvar senha'}
          </button>
        </form>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <AuthBridgeOverlay visible={sessionBridge} label="Carregando" />
      <div className="screen-fade-in w-full max-w-sm space-y-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white">
            Recuperar <span className="text-orange-500">senha</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Informe o e-mail e o CPF cadastrados para receber o código
          </p>
        </div>

        <form
          onSubmit={credentialsForm.handleSubmit(onSubmitCredentials)}
          className="space-y-6"
          noValidate
        >
          <div className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              className="focus:ring-orange-500"
              {...credentialsForm.register('email')}
              error={credentialsForm.formState.errors.email?.message}
            />
            <Input
              label="CPF"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              className="focus:ring-orange-500"
              {...credentialsForm.register('cpf', {
                onChange: (event) => {
                  const formatted = formatCpf(event.target.value);
                  if (event.target.value !== formatted) event.target.value = formatted;
                  credentialsForm.setValue('cpf', formatted, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                },
              })}
              error={credentialsForm.formState.errors.cpf?.message}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-orange-500 py-3 font-bold text-black transition-all hover:bg-orange-600 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] active:scale-95 disabled:opacity-50"
          >
            {isLoading ? <TattooMachineLoader compact label="Validando" /> : 'Enviar código'}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          Lembrou a senha?{' '}
          <Link href="/login" className="text-orange-500 hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </AuthScreen>
  );
}
