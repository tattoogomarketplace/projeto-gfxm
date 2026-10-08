'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { OtpInput, type OtpUserRole } from '@/components/ui/otp-input';
import { useI18n } from '@/hooks/use-i18n';
import { formatAppError } from '@/lib/error-handler';

const RESEND_COOLDOWN_SEC = 60;

export function TattooOTPVerification({
  onVerify,
  onResend,
  onSuccess,
  userRole = 'cliente',
}: {
  onVerify: (code: string) => Promise<boolean | void>;
  onResend?: () => Promise<void>;
  onSuccess?: () => void;
  userRole?: OtpUserRole;
}) {
  const { t } = useI18n();
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN_SEC);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const handleResend = async () => {
    if (!onResend || resendSeconds > 0 || resending) return;
    setResending(true);
    try {
      await onResend();
      setResendSeconds(RESEND_COOLDOWN_SEC);
      toast.success(t('auth.codeResent'));
    } catch (err) {
      toast.error(formatAppError(err, 'auth'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <OtpInput
        length={6}
        userRole={userRole}
        onComplete={onVerify}
        onSuccess={onSuccess}
      />
      {onResend ? (
        <button
          type="button"
          onClick={handleResend}
          disabled={resendSeconds > 0 || resending}
          className="mt-2 min-h-11 px-4 text-sm font-semibold text-[#F97316] disabled:cursor-not-allowed disabled:text-zinc-500 hover:underline"
        >
          {resending
            ? t('auth.resending')
            : resendSeconds > 0
              ? t('auth.resendIn', { seconds: resendSeconds })
              : t('auth.resend')}
        </button>
      ) : null}
    </div>
  );
}
