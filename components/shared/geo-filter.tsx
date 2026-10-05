"use client";

import { useEffect, useState } from 'react';
import { getCachedCidades } from '@/lib/catalogo';

export const GeoFilter = ({ onChange }: { onChange: (val: string) => void }) => {
  const [locais, setLocais] = useState<{ cidade: string; estado: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLocalidades() {
      try {
        const cached = await getCachedCidades();
        if (cached) {
          setLocais(cached);
          setLoading(false);
          return;
        }
        setLocais([]);
      } catch (err) {
        console.error("Erro ao buscar cidades:", err);
        setError("Não foi possível carregar as cidades.");
      } finally {
        setLoading(false);
      }
    }
    fetchLocalidades();
  }, []);

  return (
    <select 
      className={`mb-6 w-full max-w-xs rounded-lg border bg-white p-2 text-sm text-neutral-900 transition-all focus:border-orange-500 dark:bg-neutral-900 dark:text-white ${error ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-800'}`}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading || !!error}
    >
      <option value="">
        {loading ? 'Carregando...' : error ? 'Erro de conexão' : 'Todas as regiões'}
      </option>
      {!error && locais.map((l) => (
        <option key={`${l.cidade}-${l.estado}`} value={l.cidade}>
          {l.cidade} - {l.estado}
        </option>
      ))}
    </select>
  );
};
