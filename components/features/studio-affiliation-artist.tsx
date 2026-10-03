'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { Building2, MapPin, Search } from 'lucide-react';
import { GlassContainer } from '@/components/ui/glass-container';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { authedFetch } from '@/lib/utils/authed-fetch';
import type { StudioCard } from '@/lib/types/studio-affiliation';

type Pedido = {
  id: string;
  status: string;
  expires_at: string;
  created_at: string;
  estudio: StudioCard;
};

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Em análise pelo estúdio',
  aceito: 'Aceito',
  recusado: 'Recusado',
  expirado: 'Expirado',
};

export function StudioAffiliationArtist() {
  const { getToken } = useAuth();
  const [query, setQuery] = useState('');
  const [studios, setStudios] = useState<StudioCard[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [vinculo, setVinculo] = useState<StudioCard | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const tokenFn = useCallback(() => getToken({ skipCache: true }), [getToken]);

  const loadMine = useCallback(async () => {
    const res = await authedFetch('/api/studios/affiliation', {}, tokenFn);
    const payload = (await res.json().catch(() => ({}))) as {
      vinculo?: StudioCard | null;
      pedidos?: Pedido[];
    };
    if (res.ok) {
      setVinculo(payload.vinculo ?? null);
      setPedidos(payload.pedidos ?? []);
    }
  }, [tokenFn]);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        await loadMine();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [loadMine]);

  const search = async () => {
    setSearching(true);
    try {
      const qs = new URLSearchParams();
      if (query.trim()) qs.set('q', query.trim());
      const res = await authedFetch(
        `/api/studios/search${qs.toString() ? `?${qs.toString()}` : ''}`,
        {},
        tokenFn
      );
      const payload = (await res.json().catch(() => ({}))) as {
        studios?: StudioCard[];
        erro?: string;
      };
      if (!res.ok) {
        throw new Error(payload.erro || 'Falha na busca de estúdios.');
      }
      setStudios(payload.studios ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha na busca.');
    } finally {
      setSearching(false);
    }
  };

  const requestLink = async (estudioId: string) => {
    setRequestingId(estudioId);
    try {
      const res = await authedFetch(
        '/api/studios/affiliation',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estudio_id: estudioId }),
        },
        tokenFn
      );
      const payload = (await res.json().catch(() => ({}))) as { erro?: string; reused?: boolean };
      if (!res.ok) throw new Error(payload.erro || 'Não foi possível enviar o pedido.');
      toast.success(payload.reused ? 'Pedido já estava pendente.' : 'Pedido enviado ao estúdio.');
      await loadMine();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao solicitar afiliação.');
    } finally {
      setRequestingId(null);
    }
  };

  const cancelPedido = async (conviteId: string) => {
    try {
      const res = await authedFetch(
        '/api/studios/affiliation',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ convite_id: conviteId, action: 'cancel' }),
        },
        tokenFn
      );
      const payload = (await res.json().catch(() => ({}))) as { erro?: string };
      if (!res.ok) throw new Error(payload.erro || 'Não foi possível cancelar.');
      toast.message('Pedido cancelado.');
      await loadMine();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao cancelar.');
    }
  };

  if (loading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <GlassContainer className="space-y-5 p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">
          Afiliação de estúdio
        </p>
        <h3 className="mt-1 text-lg font-bold text-white">Conectar-se a um estúdio verificado</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Sua conta permanece independente. A afiliação só compartilha métricas de curtidas e
          agenda — sem submissão administrativa.
        </p>
      </div>

      {vinculo ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-xs uppercase tracking-wider text-emerald-300">Vinculado</p>
          <p className="mt-1 font-semibold text-white">{vinculo?.nome ?? 'Estúdio'}</p>
          <p className="text-xs text-zinc-400">
            {[vinculo?.cidade, vinculo?.estado].filter(Boolean).join(' / ') || 'Local não informado'}
          </p>
        </div>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar estúdio por nome ou cidade"
              className="h-12 w-full rounded-lg border border-white/10 bg-black/30 pl-10 pr-3 text-sm text-white outline-none focus:border-amber-500"
            />
          </div>
          <Button type="submit" isLoading={searching} className="shrink-0">
            Buscar
          </Button>
        </form>
      )}

      {!vinculo && studios.length > 0 ? (
        <ul className="space-y-3">
          {(studios ?? []).map((studio) => (
            <li
              key={studio?.id ?? studio?.nome}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate font-semibold text-white">
                  <Building2 className="h-4 w-4 text-amber-500" />
                  {studio?.nome ?? 'Estúdio'}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
                  <MapPin className="h-3 w-3" />
                  {[studio?.cidade, studio?.estado].filter(Boolean).join(' / ') || 'Brasil'}
                  {studio?.cnpjMasked ? ` · ${studio.cnpjMasked}` : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                isLoading={requestingId === studio?.id}
                disabled={Boolean(requestingId) || !studio?.id}
                onClick={() => studio?.id && void requestLink(studio.id)}
              >
                Solicitar
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {pedidos.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Seus pedidos</p>
          {(pedidos ?? []).map((pedido) => (
            <div
              key={pedido?.id ?? pedido?.estudio?.nome}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-white">{pedido?.estudio?.nome ?? 'Estúdio'}</p>
                <p className="text-xs text-zinc-500">
                  {STATUS_LABEL[pedido?.status ?? ''] ?? pedido?.status ?? 'pendente'}
                </p>
              </div>
              {pedido?.status === 'pendente' ? (
                <button
                  type="button"
                  className="min-h-11 text-xs text-zinc-400 underline-offset-4 hover:text-amber-400 hover:underline"
                  onClick={() => pedido?.id && void cancelPedido(pedido.id)}
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </GlassContainer>
  );
}
