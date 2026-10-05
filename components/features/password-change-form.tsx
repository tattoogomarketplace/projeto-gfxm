'use client';

import { memo, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

type PasswordChangeFormProps = {
  embedded?: boolean;
};

export const PasswordChangeForm = memo(function PasswordChangeForm({
  embedded = false,
}: PasswordChangeFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { isLoaded, user } = useUser();

  const handleUpdate = useCallback(async () => {
    setLoading(true);
    try {
      if (!user) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      await user.updatePassword({ newPassword, currentPassword: currentPassword || undefined });
      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao alterar a senha.');
    }
    setLoading(false);
  }, [user, newPassword, currentPassword]);

  if (!isLoaded) return null;

  return (
    <div
      className={cn(
        'space-y-4',
        !embedded &&
          'rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-orange-500/40 dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none'
      )}
    >
      <h3 className="text-lg font-bold text-orange-500 dark:text-orange-400">Alterar Senha</h3>
      <input
        type="password"
        placeholder="Senha Atual"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        className="w-full rounded-lg border border-neutral-200 bg-white p-3 text-neutral-900 outline-none transition-colors focus:border-orange-500/50 dark:border-neutral-800 dark:bg-[#121212] dark:text-white"
      />
      <input
        type="password"
        placeholder="Nova Senha"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-full rounded-lg border border-neutral-200 bg-white p-3 text-neutral-900 outline-none transition-colors focus:border-orange-500/50 dark:border-neutral-800 dark:bg-[#121212] dark:text-white"
      />
      <button
        type="button"
        onClick={() => void handleUpdate()}
        disabled={loading}
        className="min-h-11 rounded-xl bg-orange-500 px-6 py-2 font-bold text-black shadow-[0_0_18px_rgba(249,115,22,0.3)] transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50"
      >
        Atualizar Senha
      </button>
    </div>
  );
});
