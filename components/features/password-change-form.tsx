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
    <div className="space-y-4 p-6 bg-zinc-900 rounded-xl border border-zinc-800">
      <h3 className="text-lg font-bold text-white">Alterar Senha</h3>
      <input type="password" placeholder="Senha Atual" onChange={(e) => setCurrentPassword(e.target.value)} className="w-full bg-black p-3 rounded-lg border border-zinc-700 text-white" />
      <input type="password" placeholder="Nova Senha" onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-black p-3 rounded-lg border border-zinc-700 text-white" />
      <button onClick={handleUpdate} disabled={loading} className="bg-orange-500 text-black font-bold px-6 py-2 rounded-lg disabled:opacity-50">Atualizar Senha</button>
    </div>
  );
}
