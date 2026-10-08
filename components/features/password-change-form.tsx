'use client';

import { memo, useCallback, useRef, useState } from 'react';
import { toast } from '@/lib/toast';
import { useSession, useUser } from '@clerk/nextjs';
import type { SessionVerificationLevel } from '@clerk/nextjs/types';
import { ShieldCheck } from 'lucide-react';
import { Input } from '@/components/input';
import { PasswordStrengthBar } from '@/components/features/password-strength-bar';
import { ClerkSessionReverification } from '@/components/features/clerk-session-reverification';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { useI18n } from '@/hooks/use-i18n';
import { getPasswordStrength } from '@/lib/utils/password-strength';
import {
  extractReverificationLevel,
  isReverificationError,
  passwordErrorMessage,
} from '@/lib/error-handler';
import { cn } from '@/lib/utils';

type PasswordChangeFormProps = {
  embedded?: boolean;
};

const COPPER_FOCUS =
  'focus:border-brand-copper focus:ring-brand-copper/60 dark:focus:border-brand-copper dark:focus:ring-brand-copper/60';

type ClerkErrorShape = {
  errors?: Array<{ code?: string; longMessage?: string; message?: string }>;
};

function firstError(err: unknown) {
  const errors = (err as ClerkErrorShape | null | undefined)?.errors;
  return Array.isArray(errors) ? errors[0] : undefined;
}

/**
 * Alteração de senha 100% customizada. Antes de mutar a senha, conduz a
 * reverificação nativa do Clerk pelo SDK (startVerification) reutilizando o
 * componente `ClerkSessionReverification`; nenhuma janela nativa do Clerk é
 * exibida. Erros são convertidos em feedback amigável e imediato.
 */
export const PasswordChangeForm = memo(function PasswordChangeForm({
  embedded = false,
}: PasswordChangeFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyLevel, setVerifyLevel] = useState<SessionVerificationLevel | undefined>(undefined);
  const [verifyNonce, setVerifyNonce] = useState(0);
  const { isLoaded, user } = useUser();
  const { session } = useSession();
  const { t } = useI18n();
  const escalatedRef = useRef(false);

  const strength = getPasswordStrength(newPassword);
  const passwordsMatch = Boolean(newPassword) && newPassword === confirmPassword;
  const passwordEnabled = Boolean(user?.passwordEnabled);

  const resetFields = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }, []);

  const submitUpdate = useCallback(async () => {
    if (!user) {
      toast.error(t('errors.sessionExpired'));
      setIsVerifying(false);
      return;
    }
    setIsUpdating(true);
    try {
      await user.updatePassword({
        currentPassword: currentPassword.trim(),
        newPassword,
        signOutOfOtherSessions: true,
      });
      toast.success('Senha atualizada com sucesso.');
      resetFields();
      setIsVerifying(false);
    } catch (err) {
      if (isReverificationError(err) && !escalatedRef.current) {
        // A verificação proativa não bastou (ex.: nível maior exigido).
        // Escala uma única vez com o nível devolvido pelo Clerk.
        escalatedRef.current = true;
        setVerifyLevel(extractReverificationLevel(err) as SessionVerificationLevel | undefined);
        setVerifyNonce((nonce) => nonce + 1);
        setIsVerifying(true);
        return;
      }
      if (firstError(err)?.code === 'form_password_incorrect') {
        toast.error(t('errors.clerk.passwordIncorrect'));
      } else {
        toast.error(passwordErrorMessage(err));
      }
      setIsVerifying(false);
    } finally {
      setIsUpdating(false);
    }
  }, [user, currentPassword, newPassword, t, resetFields]);

  const handleUpdate = useCallback(() => {
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
    if (!session) {
      toast.error(t('errors.sessionExpired'));
      return;
    }
    escalatedRef.current = false;
    setVerifyLevel(undefined);
    setVerifyNonce((nonce) => nonce + 1);
    setIsVerifying(true);
  }, [user, currentPassword, newPassword, passwordsMatch, strength.isComplete, session, t]);

  const handleVerified = useCallback(() => {
    void submitUpdate();
  }, [submitUpdate]);

  const handleCancelReverification = useCallback(() => {
    setIsVerifying(false);
  }, []);

  const handleReverificationError = useCallback(
    (err: unknown) => {
      if (firstError(err)?.code === 'form_password_incorrect') {
        toast.error(t('errors.clerk.passwordIncorrect'));
      } else {
        toast.error(passwordErrorMessage(err));
      }
      setIsVerifying(false);
    },
    [t]
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
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">Alterar senha</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-zinc-500">
            Confirmação segura da sua identidade. Outras sessões serão encerradas após a troca.
          </p>
        </div>
      </div>

      {passwordEnabled ? (
        isVerifying ? (
          <ClerkSessionReverification
            key={verifyNonce}
            level={verifyLevel}
            password={currentPassword.trim()}
            onComplete={handleVerified}
            onCancel={handleCancelReverification}
            onError={handleReverificationError}
          />
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleUpdate();
            }}
          >
            <Input
              type="password"
              label="Senha atual"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isUpdating}
              className={COPPER_FOCUS}
            />
            <div className="space-y-2">
              <Input
                type="password"
                label="Nova senha"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isUpdating}
                className={COPPER_FOCUS}
              />
              <PasswordStrengthBar password={newPassword} />
            </div>
            <Input
              type="password"
              label="Confirmar nova senha"
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
              disabled={isUpdating || !strength.isComplete || !passwordsMatch || !currentPassword}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-copper px-6 py-2 font-bold text-black shadow-[0_0_18px_rgba(217,70,14,0.35)] transition-all hover:bg-brand-copper-strong active:scale-[0.98] disabled:opacity-50"
            >
              {isUpdating ? (
                <TattooMachineLoader compact label="Atualizando" />
              ) : (
                'Atualizar Senha'
              )}
            </button>
          </form>
        )
      ) : (
        <p className="text-sm text-zinc-400">
          Esta conta não possui senha local (login social). A alteração de senha não se aplica a
          este acesso.
        </p>
      )}
    </div>
  );
});
