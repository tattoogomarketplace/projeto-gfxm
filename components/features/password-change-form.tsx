'use client';

import { memo, useCallback, useRef, useState } from 'react';
import { toast } from '@/lib/toast';
import { useReverification, useUser } from '@clerk/nextjs';
import { isReverificationCancelledError } from '@clerk/nextjs/errors';
import type { SessionVerificationLevel, UpdateUserPasswordParams } from '@clerk/nextjs/types';
import { ShieldCheck } from 'lucide-react';
import { Input } from '@/components/input';
import { PasswordStrengthBar } from '@/components/features/password-strength-bar';
import { ClerkSessionReverification } from '@/components/features/clerk-session-reverification';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { useI18n } from '@/hooks/use-i18n';
import { getPasswordStrength } from '@/lib/utils/password-strength';
import { passwordErrorMessage } from '@/lib/error-handler';
import { cn } from '@/lib/utils';

type PasswordChangeFormProps = {
  embedded?: boolean;
};

const COPPER_FOCUS =
  'focus:border-brand-copper focus:ring-brand-copper/60 dark:focus:border-brand-copper dark:focus:ring-brand-copper/60';

type ClerkErrorShape = {
  errors?: Array<{ code?: string; longMessage?: string; message?: string }>;
};

type PendingReverification = {
  level: SessionVerificationLevel | undefined;
  complete: () => void;
  cancel: () => void;
};

function firstError(err: unknown) {
  const errors = (err as ClerkErrorShape | null | undefined)?.errors;
  return Array.isArray(errors) ? errors[0] : undefined;
}

type ParsedPasswordError = { field: 'current' | 'new'; message: string };

const CURRENT_PASSWORD_ERROR = 'A senha atual está incorreta.';
const PWNED_PASSWORD_ERROR = 'Esta senha já vazou na internet. Escolha uma mais segura.';

/**
 * Traduz o array de erros do Clerk em um estado de UI preciso. Diferencia a
 * senha ATUAL incorreta (culpa do primeiro campo) de uma rejeição da NOVA senha
 * (vazada/fraca), para que o usuário receba uma mensagem acionável e o medidor
 * possa reagir sem ambiguidade.
 */
function parseClerkPasswordError(err: unknown): ParsedPasswordError | null {
  const detail = firstError(err);
  const code = (detail?.code ?? '').toLowerCase();
  const haystack = `${detail?.code ?? ''} ${detail?.message ?? ''} ${detail?.longMessage ?? ''}`.toLowerCase();

  if (
    code === 'form_password_incorrect' ||
    haystack.includes('form_password_incorrect') ||
    haystack.includes('senha atual') ||
    (haystack.includes('current password') && haystack.includes('incorrect'))
  ) {
    return { field: 'current', message: CURRENT_PASSWORD_ERROR };
  }

  if (
    code === 'form_password_pwned' ||
    haystack.includes('pwned') ||
    haystack.includes('leaked') ||
    haystack.includes('data breach') ||
    haystack.includes('vaz')
  ) {
    return { field: 'new', message: PWNED_PASSWORD_ERROR };
  }

  if (code.startsWith('form_password_') || haystack.includes('password')) {
    return { field: 'new', message: passwordErrorMessage(err) };
  }

  return null;
}

/**
 * Alteração de senha 100% customizada.
 *
 * `user.updatePassword` é embrulhado por `useReverification`: o Clerk tenta a
 * mutação primeiro e, quando a sessão exige step-up, dispara
 * `onNeedsReverification` (desligando a modal nativa). Conduzimos então a
 * reverificação pelo `ClerkSessionReverification` reutilizando a "Senha Atual"
 * já digitada; ao concluir, o SDK reexecuta a atualização automaticamente.
 * Nenhuma UI do Clerk é renderizada.
 */
export const PasswordChangeForm = memo(function PasswordChangeForm({
  embedded = false,
}: PasswordChangeFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingReverification, setPendingReverification] =
    useState<PendingReverification | null>(null);
  const pendingRef = useRef<PendingReverification | null>(null);
  const { isLoaded, user } = useUser();
  const { t } = useI18n();

  const strength = getPasswordStrength(newPassword, t);
  const passwordsMatch = Boolean(newPassword) && newPassword === confirmPassword;
  const passwordEnabled = Boolean(user?.passwordEnabled);

  const resetFields = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPasswordError('');
    setNewPasswordError('');
  }, []);

  const clearPendingReverification = useCallback(() => {
    pendingRef.current = null;
    setPendingReverification(null);
  }, []);

  const updatePassword = useReverification(
    useCallback(
      async (params: UpdateUserPasswordParams) => {
        if (!user) throw new Error('session-expired');
        return user.updatePassword(params);
      },
      [user]
    ),
    {
      onNeedsReverification: useCallback(
        ({ level, complete, cancel }: PendingReverification) => {
          const pending: PendingReverification = { level, complete, cancel };
          pendingRef.current = pending;
          setPendingReverification(pending);
        },
        []
      ),
    }
  );

  const handleSubmit = useCallback(async () => {
    if (!user) {
      toast.error(t('errors.sessionExpired'));
      return;
    }
    if (!currentPassword.trim()) {
      toast.error(t('errors.password.currentRequired'));
      return;
    }
    if (!strength.isComplete) {
      toast.error(t('errors.clerk.passwordWeak'));
      return;
    }
    if (!passwordsMatch) {
      toast.error(t('errors.password.mismatch'));
      return;
    }
    if (newPassword === currentPassword) {
      toast.error(t('errors.password.sameAsCurrent'));
      return;
    }

    setIsUpdating(true);
    setCurrentPasswordError('');
    setNewPasswordError('');
    clearPendingReverification();
    try {
      const result = await updatePassword({
        currentPassword: currentPassword.trim(),
        newPassword,
        signOutOfOtherSessions: true,
      });

      // Defesa: se o retry ainda devolver um hint de reverificação, não
      // reportamos sucesso — sinalizamos o erro para o usuário tentar de novo.
      if (result && typeof result === 'object' && 'clerk_error' in result) {
        throw new Error('reverification-incomplete');
      }

      toast.success(t('password.updated'));
      resetFields();
    } catch (err) {
      if (!isReverificationCancelledError(err)) {
        const parsed = parseClerkPasswordError(err);
        if (parsed?.field === 'current') {
          setCurrentPasswordError(parsed.message);
        } else if (parsed?.field === 'new') {
          setNewPasswordError(parsed.message);
        } else {
          toast.error(passwordErrorMessage(err));
        }
      }
    } finally {
      setIsUpdating(false);
      clearPendingReverification();
    }
  }, [
    user,
    currentPassword,
    newPassword,
    passwordsMatch,
    strength.isComplete,
    t,
    resetFields,
    updatePassword,
    clearPendingReverification,
  ]);

  const handleReverificationComplete = useCallback(() => {
    const pending = pendingRef.current;
    clearPendingReverification();
    pending?.complete();
  }, [clearPendingReverification]);

  const handleReverificationCancel = useCallback(() => {
    const pending = pendingRef.current;
    clearPendingReverification();
    pending?.cancel();
  }, [clearPendingReverification]);

  const handleReverificationError = useCallback(
    (err: unknown) => {
      const parsed = parseClerkPasswordError(err);
      if (parsed?.field === 'current') {
        setCurrentPasswordError(parsed.message);
      } else if (parsed?.field === 'new') {
        setNewPasswordError(parsed.message);
      } else {
        toast.error(passwordErrorMessage(err));
      }
      handleReverificationCancel();
    },
    [handleReverificationCancel]
  );

  if (!isLoaded) return null;

  return (
    <div
      className={cn(
        'space-y-4',
        !embedded &&
          'rounded-xl border border-black/[0.04] bg-white p-4 shadow-sm transition-all hover:border-brand-copper/40 dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none'
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-brand-copper/30 bg-brand-copper/10 text-brand-copper dark:text-brand-copper-soft">
          <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
            {t('password.changeTitle')}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-zinc-500">
            {t('password.changeSubtitle')}
          </p>
        </div>
      </div>

      {passwordEnabled ? (
        pendingReverification ? (
          <ClerkSessionReverification
            level={pendingReverification.level}
            password={currentPassword.trim()}
            onComplete={handleReverificationComplete}
            onCancel={handleReverificationCancel}
            onError={handleReverificationError}
          />
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <Input
              type="password"
              label={t('password.current')}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (currentPasswordError) setCurrentPasswordError('');
              }}
              disabled={isUpdating}
              className={COPPER_FOCUS}
              error={currentPasswordError || undefined}
            />
            <div className="space-y-2">
              <Input
                type="password"
                label={t('password.new')}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (newPasswordError) setNewPasswordError('');
                }}
                disabled={isUpdating}
                className={COPPER_FOCUS}
              />
              <PasswordStrengthBar password={newPassword} error={newPasswordError || undefined} />
            </div>
            <Input
              type="password"
              label={t('password.confirmNew')}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isUpdating}
              className={COPPER_FOCUS}
              error={
                confirmPassword && !passwordsMatch ? t('errors.password.mismatch') : undefined
              }
            />
            <button
              type="submit"
              disabled={
                isUpdating ||
                !strength.isComplete ||
                !passwordsMatch ||
                !currentPassword ||
                Boolean(newPasswordError) ||
                Boolean(currentPasswordError)
              }
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-copper px-6 py-2 font-bold text-black shadow-[0_0_18px_rgba(217,70,14,0.35)] transition-all hover:bg-brand-copper-strong active:scale-[0.98] disabled:opacity-50"
            >
              {isUpdating ? (
                <TattooMachineLoader compact label={t('password.updating')} />
              ) : (
                t('password.update')
              )}
            </button>
          </form>
        )
      ) : (
        <p className="text-sm text-zinc-400">
          {t('password.socialOnly')}
        </p>
      )}
    </div>
  );
});
