'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';

export function BankAccountForm({ role }: { role: 'tatuador' | 'estudio' }) {
  const [bank, setBank] = useState('');
  const [loading, setLoading] = useState(false);
  const { isLoaded, user } = useUser();

  const handleSave = async () => {
    setLoading(true);
    const raw = String(bank ?? '');
    const digits = raw.replace(/\D/g, '');
    const masked = digits.length >= 4 ? `***${digits.slice(-4)}` : `***${raw.slice(-4) || ''}`;
    const payload = {
      tipo: role,
      masked: masked || '***',
      last4: digits.slice(-4) || raw.slice(-4) || '',
    };

    if (!user) {
      toast.error('Sessao expirada. Faca login novamente.');
      setLoading(false);
      return;
    }

    try {
      await user?.updateMetadata({
        unsafeMetadata: {
          bank_account: payload,
        },
      });
      toast.success('Conta bancária registrada com segurança.');
    } catch {
      toast.error('Erro ao salvar conta.');
    }
    setLoading(false);
  };

  if (!isLoaded) return null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-[#121212]">
      <h3 className="mb-4 font-bold text-neutral-900 dark:text-white">Dados Bancários (Seguros)</h3>
      <input 
        type="text" 
        placeholder="Número da Conta (mascarado ao salvar)"
        className="mb-4 w-full rounded-lg border border-neutral-200 bg-white p-3 text-neutral-900 dark:border-neutral-800 dark:bg-[#121212] dark:text-white"
        onChange={(e) => setBank(e.target.value)}
      />
      <button onClick={handleSave} disabled={loading} className="bg-orange-500 px-4 py-2 rounded-lg font-bold disabled:opacity-50">Salvar Dados</button>
    </div>
  );
}
