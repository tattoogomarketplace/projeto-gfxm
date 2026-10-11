'use client';

import { useQuery } from '@tanstack/react-query';
import type { PortfolioItemDto } from '@/lib/portfolio-metadata';

/**
 * TATTOOGO MK — MÍDIA DO PERFIL
 *
 * Carrega a grade de publicações do próprio usuário. Somente tatuadores
 * possuem vitrine (`/api/tatuador/portfolio`); perfis de cliente/estúdio são
 * servidos por estados vazios elegantes sem gerar erro de rede. Nenhuma escrita
 * ou mutação acontece aqui — a leitura é estritamente passiva.
 */
async function fetchOwnerPortfolio(): Promise<PortfolioItemDto[]> {
  try {
    const res = await fetch('/api/tatuador/portfolio', { cache: 'no-store' });
    if (!res.ok) return [];
    const payload = (await res.json().catch(() => ({}))) as {
      sucesso?: boolean;
      items?: PortfolioItemDto[];
    };
    if (payload?.sucesso === false) return [];
    return Array.isArray(payload.items) ? payload.items : [];
  } catch {
    return [];
  }
}

export function useProfileMedia(enabled: boolean) {
  return useQuery({
    queryKey: ['profile-media', 'portfolio'],
    queryFn: fetchOwnerPortfolio,
    enabled,
    staleTime: 60 * 1000,
  });
}
