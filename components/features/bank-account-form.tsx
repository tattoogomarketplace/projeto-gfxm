'use client';

import { useState } from 'react';
import { toast } from 'sonner';
// TODO: Migrar lógica para Prisma e Clerk
// import { createClient } from '@/lib/supabase';

export function BankAccountForm({ role }: { role: 'tatuador' | 'estudio' }) {
  const [bank, setBank] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    setLoading(true);
    const digits = bank.replace(/\D/g, '');
    const masked = digits.length >= 4 ? `***${digits.slice(-4)}` : `***${bank.slice(-4)}`;
    const payload = {
      tipo: role,
      masked,
      last4: digits.slice(-4) || bank.slice(-4),
    };

    const { data: sessionData } = await supabase.auth.getUser();
    const userId = sessionData.user?.id;
    if (!userId) {
      toast.error('Sessao expirada. Faca login novamente.');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('perfis')
      .update({ bank_account: payload })
      .eq('id', userId)
      .eq('role', role);

    if (error) toast.error('Erro ao salvar conta.');
    else toast.success('Conta bancária registrada com segurança.');
    setLoading(false);
  };

  return (
    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
      <h3 className="text-white font-bold mb-4">Dados Bancários (Seguros)</h3>
      <input 
        type="text" 
        placeholder="Número da Conta (mascarado ao salvar)"
        className="w-full bg-black p-3 rounded-lg border border-zinc-700 text-white mb-4"
        onChange={(e) => setBank(e.target.value)}
      />
      <button onClick={handleSave} disabled={loading} className="bg-orange-500 px-4 py-2 rounded-lg font-bold disabled:opacity-50">Salvar Dados</button>
    </div>
  );
}
