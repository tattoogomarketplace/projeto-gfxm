"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export const GeoFilter = ({ onChange }: { onChange: (val: string) => void }) => {
  const [locais, setLocais] = useState<{ cidade: string; estado: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLocalidades() {
      try {
        const supabase = createClient();
        const { data, error: supabaseError } = await supabase
          .from('perfis')
          .select('cidade, estado')
          .in('role', ['tatuador', 'estudio'])
          .not('cidade', 'is', null)
          .not('estado', 'is', null)
          .order('cidade')
          .limit(1000);

        if (supabaseError) throw supabaseError;

        if (data) {
          const unique = Array.from(
            new Map(
              (data as { cidade: string; estado: string }[]).map((item) => [
                `${item.cidade}-${item.estado}`,
                item,
              ])
            ).values()
          );
          setLocais(unique);
        }
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
      className={`bg-zinc-900 border ${error ? 'border-red-500' : 'border-zinc-800'} text-white p-2 rounded-lg text-sm focus:border-orange-500 mb-6 w-full max-w-xs transition-all`}
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

