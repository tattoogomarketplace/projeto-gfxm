'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { GaleriaHealingFilter, GaleriaItem, GaleriaQuery } from '@/lib/types/galeria';

async function fetchGaleria(query: GaleriaQuery): Promise<GaleriaItem[]> {
  const params = new URLSearchParams();
  if (query.style) params.set('style', query.style);
  if (query.bodyPart) params.set('bodyPart', query.bodyPart);
  if (query.healed === 'healed') params.set('healed', 'true');
  if (query.healed === 'fresh') params.set('healed', 'false');

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/galeria${suffix}`, { cache: 'no-store' });
  const payload = (await res.json().catch(() => ({}))) as {
    sucesso?: boolean;
    items?: GaleriaItem[];
    erro?: string;
  };

  if (!res.ok || payload.sucesso === false) {
    throw new Error(payload.erro || 'Falha ao carregar a galeria.');
  }

  return Array.isArray(payload.items) ? payload.items : [];
}

export function useGaleria(query: GaleriaQuery) {
  const healed: GaleriaHealingFilter = query.healed ?? 'all';
  return useQuery({
    queryKey: ['galeria', query.style ?? '', query.bodyPart ?? '', healed],
    queryFn: () => fetchGaleria(query),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}
