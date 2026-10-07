'use client';

import { memo, useCallback, useState } from 'react';
import { toast } from '@/lib/toast';
import { useUser } from '@clerk/nextjs';
import { ShieldCheck } from 'lucide-react';
import { Input } from '@/components/input';
import { PasswordStrengthBar } from '@/components/features/password-strength-bar';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { useI18n } from '@/hooks/use-i18n';
import { getPasswordStrength } from '@/lib/utils/password-strength';
import { cn } from '@/lib/utils';

type PasswordChangeFormProps = {
  embedded?: boolean;
};

export const PasswordChangeForm = memo(function PasswordChangeForm({
  embedded = false,
}: PasswordChangeFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { isLoaded, user } = useUser();
  const { t } = useI18n();

  const strength = getPasswordStrength(newPassword);
  const passwordsMatch = Boolean(newPassword) && newPassword === confirmPassword;
  const passwordEnabled = Boolean(user?.passwordEnabled);

  const handleUpdate = useCallback(async () => {
    if (!user) {
      toast.error(t('errors.sessionExpired'));
      return;
    }
    if (!currentPassword.trim()) {
      toast.error(t('errors.password.currentRequired'));
      return;
    }
    if (!getPasswordStrength(newPassword).isComplete) {
      toast.error(t('errors.clerk.passwordWeak'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('errors.password.mismatch'));
      return;
    }
    if (newPassword === currentPassword) {
      toast.error(t('errors.password.sameAsCurrent'));
      return;
    }

    setLoading(true);
    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: true,
      });
      toast.success('Senha atualizada com sucesso.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.fromError(err, 'password');
    } finally {
      setLoading(false);
    }
  }, [user, currentPassword, newPassword, confirmPassword, t]);

  if (!isLoaded) return null;

  return (
    <div
      className={cn(
        'space-y-4',
        !embedded &&
          'rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-orange-500/40 dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none'
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 dark:text-orange-400">
          <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">Alterar senha</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-zinc-500">
            Gestão segura via Clerk. Outras sessões serão encerradas após a troca.
          </p>
        </div>
      </div>

      {passwordEnabled ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleUpdate();
          }}
        >
          <Input
            type="password"
            label="Senha atual"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={loading}
          />
          <div className="space-y-2">
            <Input
              type="password"
              label="Nova senha"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />
            <PasswordStrengthBar password={newPassword} />
          </div>
          <Input
            type="password"
            label="Confirmar nova senha"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            error={
              confirmPassword && !passwordsMatch ? t('errors.password.mismatch') : undefined
            }
          />
          <button
            type="submit"
            disabled={loading || !strength.isComplete || !passwordsMatch || !currentPassword}
            className="min-h-11 w-full rounded-xl bg-orange-500 px-6 py-2 font-bold text-black shadow-[0_0_18px_rgba(249,115,22,0.3)] transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <TattooMachineLoader compact label="Atualizando" /> : 'Atualizar Senha'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-zinc-400">
          Esta conta não possui senha local. Defina ou gerencie credenciais no painel seguro do
          Clerk.
        </p>
      )}
    </div>
  );
});
