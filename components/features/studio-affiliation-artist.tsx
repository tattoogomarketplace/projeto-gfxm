'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from '@/lib/toast';
import { Building2, MapPin, Search } from 'lucide-react';
import { GlassContainer } from '@/components/ui/glass-container';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { authedFetch } from '@/lib/utils/authed-fetch';
import type { StudioCard } from '@/lib/types/studio-affiliation';
import { useI18n } from '@/hooks/use-i18n';
import { formatAppError } from '@/lib/error-handler';
import type { MessageKey } from '@/lib/i18n';

type Pedido = {
  id: string;
  status: string;
  expires_at: string;
  created_at: string;
  estudio: StudioCard;
};

const STATUS_KEY: Record<string, MessageKey> = {
  pendente: 'studio.statusPending',
  aceito: 'studio.statusAccepted',
  recusado: 'studio.statusRejected',
  expirado: 'studio.statusExpired',
};

export function StudioAffiliationArtist() {
  const { getToken } = useAuth();
  const { t } = useI18n();
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
        throw new Error(payload.erro || t('toast.searchFailed'));
      }
      setStudios(payload.studios ?? []);
    } catch (err) {
      toast.error(formatAppError(err, 'api'));
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
      if (!res.ok) throw new Error(payload.erro || t('toast.affiliateFailed'));
      toast.success(payload.reused ? t('toast.requestPending') : t('toast.requestSent'));
      await loadMine();
    } catch (err) {
      toast.error(formatAppError(err, 'api'));
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
      if (!res.ok) throw new Error(payload.erro || t('toast.cancelFailed'));
      toast.message(t('toast.requestCancelled'));
      await loadMine();
    } catch (err) {
      toast.error(formatAppError(err, 'api'));
    }
  };

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  return (
    <GlassContainer className="space-y-5 p-5 sm:p-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
          {t('studio.affiliationBadge')}
        </p>
        <h3 className="mt-1 text-[17px] font-semibold tracking-tight text-neutral-900 dark:text-white">
          {t('studio.affiliationTitle')}
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-neutral-600 dark:text-zinc-400">
          {t('studio.affiliationHint')}
        </p>
      </div>

      {vinculo ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-xs uppercase tracking-wider text-emerald-300">{t('studio.linked')}</p>
          <p className="mt-1 font-semibold text-neutral-900 dark:text-white">{vinculo?.nome ?? t('studio.fallback')}</p>
          <p className="text-xs text-zinc-400">
            {[vinculo?.cidade, vinculo?.estado].filter(Boolean).join(' / ') || t('studio.locationUnknown')}
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
              placeholder={t('studio.searchPlaceholder')}
              className="h-12 w-full rounded-lg border border-black/[0.04] bg-white pl-10 pr-3 text-sm text-neutral-900 caret-neutral-900 outline-none placeholder:text-neutral-400 focus:border-amber-500 dark:border-white/[0.05] dark:bg-neutral-900 dark:text-white dark:caret-white dark:placeholder:text-neutral-500"
            />
          </div>
          <Button type="submit" isLoading={searching} className="shrink-0">
            {t('common.search')}
          </Button>
        </form>
      )}

      {!vinculo && studios.length > 0 ? (
        <ul className="space-y-3">
          {(studios ?? []).map((studio) => (
            <li
              key={studio?.id ?? studio?.nome}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.04] bg-neutral-50 p-3 dark:border-white/[0.05] dark:bg-white/[0.03]"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate font-semibold text-neutral-900 dark:text-white">
                  <Building2 className="h-4 w-4 text-amber-500" />
                  {studio?.nome ?? t('studio.fallback')}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
                  <MapPin className="h-3 w-3" />
                  {[studio?.cidade, studio?.estado].filter(Boolean).join(' / ') || t('studio.locationUnknown')}
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
                {t('studio.request')}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {pedidos.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t('studio.yourRequests')}</p>
          {(pedidos ?? []).map((pedido) => (
            <div
              key={pedido?.id ?? pedido?.estudio?.nome}
              className="flex items-center justify-between gap-3 rounded-lg border border-black/[0.04] px-3 py-2 text-sm dark:border-white/[0.05]"
            >
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">{pedido?.estudio?.nome ?? t('studio.fallback')}</p>
                <p className="text-xs text-zinc-500">
                  {STATUS_KEY[pedido?.status ?? ''] ? t(STATUS_KEY[pedido?.status ?? '']) : pedido?.status ?? t('studio.statusPending')}
                </p>
              </div>
              {pedido?.status === 'pendente' ? (
                <button
                  type="button"
                  className="min-h-11 text-xs text-zinc-400 underline-offset-4 hover:text-amber-400 hover:underline"
                  onClick={() => pedido?.id && void cancelPedido(pedido.id)}
                >
                  {t('common.cancel')}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </GlassContainer>
  );
}
