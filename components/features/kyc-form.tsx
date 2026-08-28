'use client';

import { useState } from 'react';
import { PII_Masking } from '@/lib/utils/masking';

export function KYCForm({ userId }: { userId: string }) {
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/kyc/enviar-documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, cnpj })
      });

      const result = await response.json();

      if (result.sucesso) {
        alert("Documentos enviados para análise.");
      } else {
        alert("Erro: " + result.erro);
      }
    } catch (err) {
      alert("Falha na comunicação com o servidor.");
    } finally {
    setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
      <h3 className="text-amber-500 font-bold">Verificação de Conta (KYC)</h3>
      <input 
        type="text" 
        value={cnpj}
        placeholder="00.000.000/0000-00"
        className="w-full bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-white"
        onChange={(e) => setCnpj(e.target.value)}
      />
      <button 
        disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-lg"
      >
        {loading ? 'Processando...' : 'Enviar Documentos'}
      </button>
    </form>
  );
}

