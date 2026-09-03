'use client';

import { useState } from 'react';
import { PII_Masking } from '@/lib/utils/masking';

export function KYCForm({ userId }: { userId: string }) {
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    let formatted = rawValue;

    if (rawValue.length > 14) return;

    if (rawValue.length > 2) {
      formatted = rawValue.replace(/^(\d{2})(\d{3})(\d{0,3})(\d{0,4})(\d{0,2})/, '$1.$2.$3/$4-$5');
      formatted = formatted.replace(/\/$/, '').replace(/-$/, '');
    }
    setCnpj(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/estudio/validar-cnpj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, cnpj: cnpj.replace(/\D/g, '') })
      });

      const result = await response.json();

      if (result.sucesso) {
        alert("Documentos enviados para análise.");
      } else {
        alert("Erro: " + (result.erro || "Falha na validação."));
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
        className="w-full bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-white focus:border-amber-500 outline-none transition-all"
        onChange={handleCNPJChange}
        required
      />
      <button 
        disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold py-3 rounded-lg transition-colors"
      >
        {loading ? 'Processando...' : 'Enviar Documentos'}
      </button>
    </form>
  );
}

