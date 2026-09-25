'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useClerk, useSignIn } from '@clerk/nextjs';
import { Input } from '@/components/input';
import Link from 'next/link';
import { TattooOTPInput } from '@/components/ui/tattoo-otp-input';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { TurnstileGuard, isTurnstileEnabled } from '@/components/features/turnstile-guard';
import { dashboardPathForRole, normalizeAppRole, postSignupPathForRole } from '@/lib/utils/auth-redirect';
import { useAuthStore } from '@/hooks/use-auth-store';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  turnstileToken: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function clerkErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'errors' in err) {
    const errors = (err as { errors?: { longMessage?: string; message?: string }[] }).errors;
    return errors?.[0]?.longMessage || errors?.[0]?.message || 'Erro ao autenticar.';
  }
  if (err instanceof Error) return err.message;
  return 'Erro ao autenticar.';
}

export default function LoginPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const clerk = useClerk();
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);
  const [token, setToken] = useState<string>();
  const [emailForVerification, setEmailForVerification] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const [resending, setResending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const sendEmailOtp = async (email: string) => {
    if (!signIn) {
      throw new Error('Clerk ainda não está pronto.');
    }

    const created = await signIn.create({ identifier: email });
    const emailFactor = created.supportedFirstFactors?.find(
      (factor) => factor.strategy === 'email_code'
    );

    if (!emailFactor || emailFactor.strategy !== 'email_code') {
      throw new Error('Login por código de e-mail não está disponível para esta conta.');
    }

    await signIn.prepareFirstFactor({
      strategy: 'email_code',
      emailAddressId: emailFactor.emailAddressId,
    });
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    if (isTurnstileEnabled() && !token) {
      toast.error('Por favor, valide o Turnstile.');
      setIsLoading(false);
      return;
    }

    console.log("[DEBUG] 1. Início do onSubmit, botão travado");
    console.log("[DEBUG] 2. Clerk isLoaded:", isLoaded);
    try {
      if (!signIn || !setActive) {
        throw new Error('Clerk ainda não está pronto.');
      }

      console.log("[DEBUG] 3. Disparando signIn.create...");
      const result = await signIn.create({
        identifier: data.email.trim().toLowerCase(),
      });
      console.log("[DEBUG] 4. Resposta do signIn.create:", result);
      console.log("[DEBUG] 5. Status:", result?.status);
      console.log('CLERK SUCCESS:', result);

      if (result.status === 'complete') {
        console.log("[DEBUG] 6. Disparando setActive...");
        await setActive({ session: result.createdSessionId });
        console.log("[DEBUG] 7. setActive concluído, redirecionando");
        window.location.href = '/dashboard';
        return;
      }

      const emailFactor = result.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'email_code'
      );

      if (!emailFactor || emailFactor.strategy !== 'email_code') {
        throw new Error('Login por código de e-mail não está disponível para esta conta.');
      }

      console.log("[DEBUG] 6. Disparando signIn.prepareFirstFactor...");
      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: emailFactor.emailAddressId,
      });
      console.log("[DEBUG] 7. Resposta do prepareFirstFactor concluída");

      setEmailForVerification(data.email.trim().toLowerCase());
      setIsVerifying(true);
      setResendSeconds(60);
      toast.success('Código de 8 dígitos enviado para o seu e-mail.');
    } catch (err) {
      console.error("[DEBUG] ERRO CAPTURADO NO CATCH:", err);
      console.error('CLERK ERROR:', err);
      toast.error(clerkErrorMessage(err) || 'Erro ao enviar o código.');
    } finally {
      console.log("[DEBUG] FINALLY ACIONADO, botão destravado");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isVerifying || resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isVerifying, resendSeconds]);

  const handleResendOtp = async () => {
    if (resendSeconds > 0 || resending) return;
    setResending(true);
    try {
      await sendEmailOtp(emailForVerification);
      setResendSeconds(60);
      toast.success('Novo código enviado.');
    } catch (err) {
      toast.error(clerkErrorMessage(err) || 'Falha ao reenviar o código.');
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = async (otp: string): Promise<boolean> => {
    try {
      if (!signIn || !setActive) {
        throw new Error('Clerk ainda não está pronto.');
      }

      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: otp,
      });
      console.log('CLERK SUCCESS:', result);

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
      } else {
        throw new Error('Sessão inválida após verificação.');
      }

      const clerkUser = clerk.user;
      const metadata = (clerkUser?.unsafeMetadata || clerkUser?.publicMetadata || {}) as Record<
        string,
        unknown
      >;
      const role = normalizeAppRole((metadata.role as string) || undefined);
      const fullName =
        (metadata.full_name as string) ||
        (metadata.nome as string) ||
        clerkUser?.fullName ||
        '';
      const kycStatus = metadata.kyc_status as string | undefined;

      setUser({
        id: clerkUser?.id || result.createdSessionId,
        email: clerkUser?.primaryEmailAddress?.emailAddress ?? emailForVerification,
        fullName,
      });
      setRole(role);

      toast.success('Bem-vindo de volta à elite!');
      const nextPath =
        role === 'tatuador' && kycStatus !== 'aprovado'
          ? postSignupPathForRole(role)
          : dashboardPathForRole(role);
      window.location.href = nextPath;
      return true;
    } catch (err) {
      console.error('CLERK ERROR:', err);
      toast.error(clerkErrorMessage(err) || 'Código inválido.');
      return false;
    }
  };

  console.log("[DEBUG ZOD LIVEDATA] Erros atuais:", formState.errors);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212] px-4">
        <TattooMachineLoader compact label="Carregando" />
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212] px-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-white">
              Verificação <span className="text-orange-500">OTP</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Digite o código de 8 dígitos enviado para {emailForVerification}
            </p>
          </div>
          <TattooOTPInput onComplete={handleVerifyOtp} length={8} />
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendSeconds > 0 || resending}
            className="w-full text-center text-sm font-semibold text-orange-500 disabled:text-zinc-500 disabled:cursor-not-allowed hover:underline"
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
              setIsVerifying(false);
              setEmailForVerification('');
            }}
            className="w-full text-center text-sm text-zinc-500 hover:text-orange-500"
          >
            Usar outro e-mail
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#121212] px-4">
      <div className="w-full max-w-sm space-y-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white">
            TattooGo <span className="text-orange-500">MK</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500">Acesse sua conta de elite</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit, (errors) => { console.error("[DEBUG FORM ERRO INVISÍVEL]:", errors); })} className="space-y-6" noValidate>
          <div className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              className="border-zinc-800 bg-zinc-900 focus:ring-orange-500"
              {...register('email')}
              error={errors.email?.message}
            />
            <TurnstileGuard onToken={setToken} />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-orange-500 py-3 font-bold text-black transition-all hover:bg-orange-600 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <TattooMachineLoader compact label="Enviando código" />
            ) : (
              'Receber código'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          Ainda não faz parte da elite?{' '}
          <Link href="/register" className="text-orange-500 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
