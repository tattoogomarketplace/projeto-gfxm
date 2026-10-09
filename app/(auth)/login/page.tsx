'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { useSignIn } from '@clerk/nextjs/legacy';
import { Input } from '@/components/input';
import Link from 'next/link';
import { OtpInput } from '@/components/ui/otp-input';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { assignAppPath, dashboardPathForRole, normalizeAppRole, postSignupPathForRole } from '@/lib/utils/auth-redirect';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useRedirectIfAuthenticated } from '@/hooks/use-redirect-if-authenticated';
import { useI18n } from '@/hooks/use-i18n';
import { enforceSingleSession } from '@/app/actions/auth-actions';
import { AuthBridgeOverlay, AuthScreen } from '@/components/layout/auth-screen';
import { formatAppError } from '@/lib/error-handler';

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const clerk = useClerk();
  const router = useRouter();
  const { t, locale } = useI18n();
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);
  const [emailForVerification, setEmailForVerification] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const [resending, setResending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forceShow, setForceShow] = useState(false);
  const [bridging, setBridging] = useState(false);
  const nextPathRef = useRef<string | null>(null);
  const resetToastShown = useRef(false);
  const prevLocaleRef = useRef(locale);

  const { bridging: sessionBridge } = useRedirectIfAuthenticated(!isVerifying && !isLoading && !bridging);

  useEffect(() => {
    if (resetToastShown.current) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') !== 'success') return;
    resetToastShown.current = true;
    toast.success(t('auth.resetSuccessLogin'));
  }, [t]);

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('auth.invalidEmail')),
        password: z.string().min(1, t('auth.passwordRequired')),
      }),
    [t]
  );

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const hasFieldErrors = Boolean(errors.email || errors.password);

  useEffect(() => {
    if (prevLocaleRef.current === locale) return;
    prevLocaleRef.current = locale;
    if (hasFieldErrors) void trigger();
  }, [locale, trigger, hasFieldErrors]);

  const sendEmailOtp = async (email: string) => {
    if (!signIn) {
      throw new Error('clerk not ready');
    }

    const created = await signIn.create({ identifier: email });
    const emailFactor = created.supportedFirstFactors?.find(
      (factor) => factor.strategy === 'email_code'
    );

    if (!emailFactor || emailFactor.strategy !== 'email_code') {
      throw new Error('email code unavailable');
    }

    await signIn.prepareFirstFactor({
      strategy: 'email_code',
      emailAddressId: emailFactor.emailAddressId,
    });
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      if (!signIn || !setActive) {
        throw new Error('clerk not ready');
      }

      const result = await signIn.create({
        identifier: data.email.trim().toLowerCase(),
        password: data.password,
      });

      if (result.status === 'complete') {
        try {
          await setActive({ session: result.createdSessionId });
          try {
            await enforceSingleSession(result.createdSessionId ?? undefined);
          } catch (err) {
            console.error('Single-session enforcement error:', err);
          }
          setBridging(true);
        } catch (err) {
          console.error('Session activation error:', err);
        }
        return;
      }

      const emailFactor = result.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'email_code'
      );

      if (!emailFactor || emailFactor.strategy !== 'email_code') {
        throw new Error('email code unavailable');
      }

      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: emailFactor.emailAddressId,
      });

      setEmailForVerification(data.email.trim().toLowerCase());
      setIsVerifying(true);
      setResendSeconds(60);
      toast.success(t('auth.codeSent'));
    } catch (err) {
      console.error('CLERK ERROR:', err);
      toast.error(formatAppError(err, 'auth'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setForceShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!bridging) return;
    const nextPath = nextPathRef.current || '/dashboard';
    const soft = window.setTimeout(() => {
      try {
        router.push(nextPath);
      } catch (err) {
        console.error('Session activation error:', err);
        assignAppPath(nextPath);
      }
    }, 160);
    const hard = window.setTimeout(() => {
      assignAppPath(nextPath);
    }, 4000);
    return () => {
      window.clearTimeout(soft);
      window.clearTimeout(hard);
    };
  }, [bridging, router]);

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
      toast.success(t('auth.codeResent'));
    } catch (err) {
      toast.error(formatAppError(err, 'auth'));
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = async (otp: string): Promise<boolean> => {
    try {
      if (!signIn || !setActive) {
        throw new Error('clerk not ready');
      }

      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: otp,
      });

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        try {
          await enforceSingleSession(result.createdSessionId);
        } catch (err) {
          console.error('Single-session enforcement error:', err);
        }
      } else {
        throw new Error('session expired');
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

      toast.success(t('auth.welcomeBack'));
      nextPathRef.current =
        role === 'tatuador' && kycStatus !== 'aprovado'
          ? postSignupPathForRole(role)
          : dashboardPathForRole(role);
      return true;
    } catch (err) {
      console.error('CLERK ERROR:', err);
      toast.error(formatAppError(err, 'auth'));
      return false;
    }
  };

  if (!isLoaded && !forceShow) {
    return (
      <AuthScreen>
        <TattooMachineLoader compact label={t('common.loading')} />
      </AuthScreen>
    );
  }

  if (isVerifying) {
    return (
      <AuthScreen>
        <AuthBridgeOverlay visible={bridging || sessionBridge} label={t('auth.entering')} />
        <div className="screen-fade-in w-full max-w-md space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl sm:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-white">{t('auth.otpTitle')}</h1>
            <p className="mt-2 text-sm text-zinc-400">
              {t('auth.otpSentTo', { email: emailForVerification })}
            </p>
          </div>
          <OtpInput
            onComplete={handleVerifyOtp}
            onSuccess={() => {
              if (!nextPathRef.current) nextPathRef.current = '/dashboard';
              setBridging(true);
            }}
            length={6}
          />
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendSeconds > 0 || resending}
            className="flex min-h-[44px] w-full items-center justify-center text-center text-sm font-semibold text-orange-500 disabled:text-zinc-500 disabled:cursor-not-allowed hover:underline"
          >
            {resending
              ? t('auth.resending')
              : resendSeconds > 0
                ? t('auth.resendIn', { seconds: resendSeconds })
                : t('auth.resend')}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsVerifying(false);
              setEmailForVerification('');
            }}
            className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-zinc-800 text-sm font-semibold text-zinc-400 transition-colors hover:border-orange-500 hover:text-orange-500"
          >
            {t('common.back')}
          </button>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <AuthBridgeOverlay visible={bridging || sessionBridge} label={t('auth.entering')} />
      <div className="screen-fade-in w-full max-w-sm space-y-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white">
            TattooGo <span className="text-orange-500">MK</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500">{t('auth.loginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div className="space-y-4">
            <Input
              label={t('auth.email')}
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              className="focus:ring-orange-500"
              {...register('email')}
              error={errors.email?.message}
            />
            <Input
              label={t('auth.password')}
              type="password"
              autoComplete="current-password"
              placeholder={t('auth.passwordPlaceholder')}
              className="focus:ring-orange-500"
              {...register('password')}
              error={errors.password?.message}
            />
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-gray-400 transition-colors hover:text-orange-500"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-orange-500 py-3 font-bold text-black transition-all hover:bg-orange-600 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <TattooMachineLoader compact label={t('auth.entering')} />
            ) : (
              t('auth.signIn')
            )}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          {t('auth.noAccount')}{' '}
          <Link href="/register" className="text-orange-500 hover:underline">
            {t('auth.signUpLink')}
          </Link>
        </p>
      </div>
    </AuthScreen>
  );
}
