'use client';

import { useState } from 'react';
import { supabase } from '@/lib/mock-services';

export function KYCForm({ userId }: { userId: string }) {
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simula a validação (sem chamar API real)
    console.log("Validando CNPJ:", cnpj);
    
    // Atualiza o status no banco manualmente como aprovado para testes
    const { error } = await supabase
      .from('perfis')
      .update({ kyc_status: 'aprovado' })
      .eq('id', userId);

    if (error) alert("Erro ao atualizar KYC: " + error.message);
    else alert("KYC Aprovado com sucesso (Modo Simulação)!");
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
      <h3 className="text-amber-500 font-bold">Verificação de Conta (Simulação)</h3>
      <input 
        type="text" 
        placeholder="CNPJ do Estúdio ou Documento" 
        className="w-full bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-white"
        onChange={(e) => setCnpj(e.target.value)}
      />
      <button 
        disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-lg"
      >
        {loading ? 'Validando...' : 'Enviar Documentos'}
      </button>
    </form>
  );
}
