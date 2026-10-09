"use client";

import { useEffect, useState } from 'react';
import { getCachedCidades } from '@/lib/catalogo';
import { useI18n } from '@/hooks/use-i18n';

export const GeoFilter = ({ onChange }: { onChange: (val: string) => void }) => {
  const { t } = useI18n();
  const [locais, setLocais] = useState<{ cidade: string; estado: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
        console.error('geo.cities', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchLocalidades();
  }, []);

  return (
    <select 
      className={`mb-6 w-full max-w-xs rounded-lg border bg-white p-2 text-sm text-neutral-900 transition-all focus:border-orange-500 dark:bg-neutral-900 dark:text-white ${error ? 'border-red-500' : 'border-black/[0.04] dark:border-white/[0.05]'}`}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading || error}
    >
      <option value="">
        {loading ? t('common.loading') : error ? t('geo.connectionError') : t('geo.allRegions')}
      </option>
      {!error && locais.map((l) => (
        <option key={`${l.cidade}-${l.estado}`} value={l.cidade}>
          {l.cidade} - {l.estado}
        </option>
      ))}
    </select>
  );
};
