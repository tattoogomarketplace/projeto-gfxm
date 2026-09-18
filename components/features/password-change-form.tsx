'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';

export function PasswordChangeForm() {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const { triggerHaptic } = useHapticFeedback();

  const handleUpdate = async () => {
    setLoading(true);
    triggerHaptic('medium');
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(18);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      triggerHaptic('heavy');
      toast.error(error.message);
    } else {
      triggerHaptic('success');
      toast.success('Senha alterada com sucesso!');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4 p-6 bg-zinc-900 rounded-xl border border-zinc-800">
      <h3 className="text-lg font-bold text-white">Alterar Senha</h3>
      <input type="password" placeholder="Senha Atual" className="w-full min-h-11 bg-black p-3 rounded-lg border border-zinc-700 text-white" />
      <input type="password" placeholder="Nova Senha" onChange={(e) => setNewPassword(e.target.value)} className="w-full min-h-11 bg-black p-3 rounded-lg border border-zinc-700 text-white" />
      <button onClick={handleUpdate} disabled={loading} className="min-h-11 min-w-11 bg-orange-500 text-black font-bold px-6 py-2 rounded-lg disabled:opacity-50">Atualizar Senha</button>
    </div>
  );
}
