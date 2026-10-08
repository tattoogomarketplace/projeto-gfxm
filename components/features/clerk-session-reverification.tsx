'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '@clerk/nextjs';
import type {
  SessionVerificationLevel,
  SessionVerificationResource,
  SessionVerificationSecondFactor,
} from '@clerk/nextjs/types';
import { ShieldCheck } from 'lucide-react';
import { Input } from '@/components/input';
import { OtpInput } from '@/components/ui/otp-input';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { useI18n } from '@/hooks/use-i18n';

type ReverificationStatus = 'preparing' | 'second_factor';

export type ClerkSessionReverificationProps = {
  /** Verification level requested by Clerk for the sensitive action. */
  level: SessionVerificationLevel | undefined;
  /** Password already typed by the user, reused for native first-factor verification. */
  password: string;
  /** Called once the session is successfully reverified. */
  onComplete: () => void;
  /** Called when the user aborts the reverification. */
  onCancel: () => void;
  /** Called when reverification cannot be completed through the custom UI. */
  onError: (error: unknown) => void;
};

/**
 * Native session re-authentication UI for Clerk reverification.
 *
 * It replaces Clerk's default "Digite sua senha" modal by driving the
 * Session verification flow programmatically:
 *  1. Start the session verification for the requested level.
 *  2. Reuse the current password already captured by the custom form to
 *     verify the first factor (no extra prompt).
 *  3. If a second factor is required, render our own OTP / backup-code inputs.
 */
export function ClerkSessionReverification({
  level,
  password,
  onComplete,
  onCancel,
  onError,
}: ClerkSessionReverificationProps) {
  const { isLoaded, session } = useSession();
  const { t } = useI18n();
  const [status, setStatus] = useState<ReverificationStatus>('preparing');
  const [secondFactor, setSecondFactor] = useState<SessionVerificationSecondFactor | null>(null);
  const [backupCode, setBackupCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const completedRef = useRef(false);
  const startedRef = useRef(false);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  const pickSecondFactor = useCallback(
    (resource: SessionVerificationResource): SessionVerificationSecondFactor | null => {
      const factors = resource.supportedSecondFactors ?? [];
      const preference = ['totp', 'phone_code', 'backup_code'] as const;
      for (const strategy of preference) {
        const factor = factors.find((candidate) => candidate.strategy === strategy);
        if (factor) return factor;
      }
      return null;
    },
    []
  );

  const prepareSecondFactor = useCallback(
    async (factor: SessionVerificationSecondFactor) => {
      if (!session) return;
      if (factor.strategy === 'phone_code') {
        await session.prepareSecondFactorVerification({ strategy: 'phone_code' });
      }
      setSecondFactor(factor);
      setStatus('second_factor');
    },
    [session]
  );

  useEffect(() => {
    if (!isLoaded || !session || startedRef.current) return;
    startedRef.current = true;
    let active = true;

    const run = async () => {
      try {
        const resource = await session.startVerification({ level: level ?? 'first_factor' });
        if (!active) return;

        if (resource.status === 'complete') {
          complete();
          return;
        }

        if (resource.status === 'needs_second_factor') {
          const factor = pickSecondFactor(resource);
          if (!factor) throw new Error('reverification-no-factor');
          await prepareSecondFactor(factor);
          return;
        }

        const passwordFactor = resource.supportedFirstFactors?.find(
          (candidate) => candidate.strategy === 'password'
        );

        if (passwordFactor && password) {
          const attempt = await session.attemptFirstFactorVerification({
            strategy: 'password',
            password,
          });
          if (!active) return;

          if (attempt.status === 'complete') {
            complete();
            return;
          }

          if (attempt.status === 'needs_second_factor') {
            const factor = pickSecondFactor(attempt);
            if (!factor) throw new Error('reverification-no-factor');
            await prepareSecondFactor(factor);
            return;
          }
        }

        throw new Error('reverification-unavailable');
      } catch (error) {
        if (active) onError(error);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [
    isLoaded,
    session,
    level,
    password,
    complete,
    pickSecondFactor,
    prepareSecondFactor,
    onError,
  ]);

  const attemptSecondFactor = useCallback(
    async (code: string): Promise<boolean> => {
      if (!session || !secondFactor || submitting) return false;
      setSubmitting(true);
      setFeedback(null);
      try {
        if (secondFactor.strategy === 'phone_code') {
          await session.attemptSecondFactorVerification({ strategy: 'phone_code', code });
        } else if (secondFactor.strategy === 'totp') {
          await session.attemptSecondFactorVerification({ strategy: 'totp', code });
        } else {
          await session.attemptSecondFactorVerification({ strategy: 'backup_code', code });
        }
        return true;
      } catch {
        setFeedback(t('errors.clerk.codeInvalid'));
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [session, secondFactor, submitting, t]
  );

  const handleBackupSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!backupCode.trim()) return;
      const ok = await attemptSecondFactor(backupCode.trim());
      if (ok) complete();
    },
    [attemptSecondFactor, backupCode, complete]
  );

  const isOtpFactor = secondFactor?.strategy === 'totp' || secondFactor?.strategy === 'phone_code';

  return (
    <div className="space-y-4 rounded-xl border border-brand-copper/30 bg-brand-copper/[0.04] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-brand-copper/30 bg-brand-copper/10 text-brand-copper dark:text-brand-copper-soft">
          <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
            {t('security.title')}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-zinc-500">
            {t('security.nativeHint')}
          </p>
        </div>
      </div>

      {status === 'preparing' ? (
        <div className="flex min-h-12 items-center justify-center">
          <TattooMachineLoader compact label={t('security.confirming')} />
        </div>
      ) : null}

      {status === 'second_factor' && isOtpFactor ? (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-zinc-500">
            {secondFactor?.strategy === 'phone_code'
              ? t('security.smsHint')
              : t('security.totpHint')}
          </p>
          <OtpInput
            length={6}
            onComplete={attemptSecondFactor}
            onSuccess={complete}
          />
          {feedback ? (
            <p className="text-center text-xs font-medium text-red-500">{feedback}</p>
          ) : null}
        </div>
      ) : null}

      {status === 'second_factor' && secondFactor?.strategy === 'backup_code' ? (
        <form className="space-y-3" onSubmit={handleBackupSubmit}>
          <Input
            label={t('security.backupCode')}
            autoComplete="one-time-code"
            value={backupCode}
            onChange={(event) => {
              setBackupCode(event.target.value);
              setFeedback(null);
            }}
            disabled={submitting}
            error={feedback ?? undefined}
          />
          <button
            type="submit"
            disabled={submitting || !backupCode.trim()}
            className="min-h-11 w-full rounded-xl bg-brand-copper px-6 py-2 font-bold text-black shadow-[0_0_18px_rgba(217,70,14,0.35)] transition-all hover:bg-brand-copper-strong active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? (
              <TattooMachineLoader compact label={t('security.confirming')} />
            ) : (
              t('security.confirmCode')
            )}
          </button>
        </form>
      ) : null}

      <button
        type="button"
        onClick={onCancel}
        className="flex min-h-11 w-full items-center justify-center text-center text-xs font-semibold text-zinc-500 transition-colors hover:text-brand-copper active:scale-[0.98]"
      >
        {t('common.cancel')}
      </button>
    </div>
  );
}
