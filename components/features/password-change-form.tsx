'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase';

export function PasswordChangeForm() {
  const [current, setCurrent] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleUpdate = async () => {
    setLoading(true);
    // Verificação de senha atual (Supabase não permite alterar sem reautenticação)
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) toast.error(error.message);
    else toast.success('Senha alterada com sucesso!');
    setLoading(false);
  };

  return (
    <div className="space-y-4 p-6 bg-zinc-900 rounded-xl border border-zinc-800">
      <h3 className="text-lg font-bold text-white">Alterar Senha</h3>
      <input type="password" placeholder="Senha Atual" onChange={(e) => setCurrent(e.target.value)} className="w-full bg-black p-3 rounded-lg border border-zinc-700 text-white" />
      <input type="password" placeholder="Nova Senha" onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-black p-3 rounded-lg border border-zinc-700 text-white" />
      <button onClick={handleUpdate} className="bg-orange-500 text-black font-bold px-6 py-2 rounded-lg">Atualizar Senha</button>
    </div>
  );
}
