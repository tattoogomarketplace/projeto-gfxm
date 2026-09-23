import { getCachedArtistas } from '@/lib/catalogo';

export const perfilService = {
  async listarArtistas(filtros?: { cidade?: string; estado?: string }) {
    const cached = await getCachedArtistas(filtros);
    return cached || [];
  }
};
