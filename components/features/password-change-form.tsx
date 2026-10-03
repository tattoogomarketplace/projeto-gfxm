'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';

export function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  const handleUpdate = async () => {
    setLoading(true);
    try {
      if (!user) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      await user.updatePassword({ newPassword, currentPassword: currentPassword || undefined });
      toast.success('Senha alterada com sucesso!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao alterar a senha.');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-zinc-950/50 p-4 transition-all hover:border-orange-500/40">
      <h3 className="text-lg font-bold text-orange-400">Alterar Senha</h3>
      <input type="password" placeholder="Senha Atual" onChange={(e) => setCurrentPassword(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black p-3 text-white outline-none transition-colors focus:border-orange-500/50" />
      <input type="password" placeholder="Nova Senha" onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black p-3 text-white outline-none transition-colors focus:border-orange-500/50" />
      <button onClick={handleUpdate} disabled={loading} className="min-h-11 rounded-xl bg-orange-500 px-6 py-2 font-bold text-black shadow-[0_0_18px_rgba(249,115,22,0.3)] transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-50">Atualizar Senha</button>
    </div>
  );
}
