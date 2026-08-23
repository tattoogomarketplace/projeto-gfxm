import { useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase';

export function BankAccountForm({ role }: { role: 'tatuador' | 'estudio' }) {
  const [bank, setBank] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    setLoading(true);
    // Mascara o input antes de salvar no DB
    const masked = `***${bank.slice(-4)}`;
    const { error } = await supabase.from('perfis').update({ bank_account: masked }).eq('role', role);
    
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
      <button onClick={handleSave} className="bg-orange-500 px-4 py-2 rounded-lg font-bold">Salvar Dados</button>
    </div>
  );
}
