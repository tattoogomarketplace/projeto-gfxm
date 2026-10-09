'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from '@/lib/toast';
import { GlassContainer } from '@/components/ui/glass-container';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { authedFetch } from '@/lib/utils/authed-fetch';
import { StudioCnpjPanel } from '@/components/features/studio-cnpj-panel';
import type { StudioArtistRow, StudioComplianceView } from '@/lib/types/studio-affiliation';
import { useI18n } from '@/hooks/use-i18n';
import { formatAppError } from '@/lib/error-handler';
import type { MessageKey } from '@/lib/i18n';

type ArtistRow = StudioArtistRow;

type Pedido = {
  id: string;
  status: string;
  created_at: string;
  tatuador: ArtistRow;
};

type Compliance = StudioComplianceView;

const KYC_STATUS_KEY: Record<string, MessageKey> = {
  pendente: 'kyc.statusPending',
  enviado: 'kyc.statusSent',
  em_analise: 'kyc.statusReview',
  aprovado: 'kyc.statusApproved',
  rejeitado: 'kyc.statusRejected',
  na: 'kyc.statusNa',
};

function kycStatusLabel(status: string | null | undefined, t: (key: MessageKey) => string): string {
  const key = KYC_STATUS_KEY[status ?? ''] ?? 'kyc.statusPending';
  return t(key);
}

export function StudioIncomingRequests() {
  const { getToken } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [pendentes, setPendentes] = useState<Pedido[]>([]);
  const [artistas, setArtistas] = useState<ArtistRow[]>([]);
  const [compliance, setCompliance] = useState<Compliance>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const tokenFn = useCallback(() => getToken({ skipCache: true }), [getToken]);

  const load = useCallback(async () => {
    const res = await authedFetch('/api/studios/affiliation', {}, tokenFn);
    const payload = (await res.json().catch(() => ({}))) as {
      pendentes?: Pedido[];
      artistas?: ArtistRow[];
      compliance?: Compliance;
      erro?: string;
    };
    if (!res.ok) {
      throw new Error(payload.erro || t('toast.studioLoadFailed'));
    }
    setPendentes(payload.pendentes ?? []);
    setArtistas(payload.artistas ?? []);
    setCompliance(payload.compliance ?? null);
  }, [tokenFn, t]);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          toast.error(formatAppError(err, 'api'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const decide = async (conviteId: string, action: 'accept' | 'reject') => {
    setActingId(conviteId);
    try {
      const res = await authedFetch(
        '/api/studios/affiliation',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ convite_id: conviteId, action }),
        },
        tokenFn
      );
      const payload = (await res.json().catch(() => ({}))) as { erro?: string };
      if (!res.ok) throw new Error(payload.erro || t('toast.decideFailed'));
      toast.success(action === 'accept' ? t('toast.artistLinked') : t('toast.requestRejected'));
      await load();
    } catch (err) {
      toast.error(formatAppError(err, 'api'));
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="screen-fade-in space-y-3 transition-opacity duration-300 ease-in-out">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StudioCnpjPanel initial={compliance} onRegistered={(next) => setCompliance(next)} />

      <GlassContainer className="space-y-4 p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">
            {t('studio.incomingBadge')}
          </p>
          <h3 className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">{t('studio.incomingTitle')}</h3>
        </div>
        {pendentes.length === 0 ? (
          <p className="text-sm text-zinc-400">{t('studio.noPending')}</p>
        ) : (
          <ul className="space-y-3">
            {(pendentes ?? []).map((pedido) => (
              <li
                key={pedido?.id ?? pedido?.tatuador?.id}
                className="flex flex-col gap-3 rounded-xl border border-black/[0.04] bg-neutral-50 p-3 dark:border-white/[0.05] dark:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">{pedido?.tatuador?.nome || t('studio.artistFallback')}</p>
                  <p className="text-xs text-zinc-500">
                    {[pedido?.tatuador?.cidade, pedido?.tatuador?.estado].filter(Boolean).join(' / ') ||
                      t('studio.locationUnknown')}{' '}
                    · {t('studio.docsLabel')} {kycStatusLabel(pedido?.tatuador?.kyc_status, t)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    isLoading={actingId === pedido?.id}
                    disabled={!pedido?.id}
                    onClick={() => pedido?.id && void decide(pedido.id, 'reject')}
                  >
                    {t('studio.reject')}
                  </Button>
                  <Button
                    type="button"
                    isLoading={actingId === pedido?.id}
                    disabled={!pedido?.id}
                    onClick={() => pedido?.id && void decide(pedido.id, 'accept')}
                  >
                    {t('studio.accept')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassContainer>

      <GlassContainer className="space-y-3 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{t('studio.partners')}</h3>
        {artistas.length === 0 ? (
          <p className="text-sm text-zinc-400">{t('studio.noPartners')}</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {(artistas ?? []).map((artista) => (
              <li key={artista?.id ?? artista?.nome} className="flex items-center justify-between py-2 text-sm">
                <span className="text-neutral-900 dark:text-white">{artista?.nome || t('studio.artistFallback')}</span>
                <span className="text-xs uppercase tracking-wider text-zinc-500">
                  {kycStatusLabel(artista?.kyc_status, t)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </GlassContainer>
    </div>
  );
}
