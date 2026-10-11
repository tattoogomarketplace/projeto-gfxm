'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from '@/lib/toast';
import { Building2 } from 'lucide-react';
import { GlassContainer } from '@/components/ui/glass-container';
import { Button } from '@/components/ui/button';
import { formatCnpj, isValidCnpj, maskCnpj, onlyCnpjDigits } from '@/lib/utils/cnpj';
import { authedFetch } from '@/lib/utils/authed-fetch';
import type { StudioComplianceView } from '@/lib/types/studio-affiliation';
import { useI18n } from '@/hooks/use-i18n';
import { formatAppError } from '@/lib/error-handler';

type Compliance = StudioComplianceView;

export function StudioCnpjPanel({
  initial,
  onRegistered,
}: {
  initial: Compliance;
  onRegistered?: (next: NonNullable<Compliance>) => void;
}) {
  const { getToken } = useAuth();
  const { t } = useI18n();
  const [cnpj, setCnpj] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [compliance, setCompliance] = useState<Compliance>(initial);

  const tokenFn = () => getToken({ skipCache: true });

  const validate = async () => {
    const digits = onlyCnpjDigits(cnpj);
    if (!isValidCnpj(digits)) {
      toast.error(t('toast.cnpjInvalid14'));
      return;
    }
    setLoading(true);
    try {
      const res = await authedFetch(
        '/api/studios/validate-cnpj',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cnpj: digits }),
        },
        tokenFn
      );
      const payload = (await res.json().catch(() => ({}))) as {
        sucesso?: boolean;
        erro?: string;
        razaoSocial?: string;
        situacao?: string;
      };
      if (!res.ok || !payload.sucesso) {
        throw new Error(payload.erro || t('toast.cnpjValidateFailed'));
      }
      setPreview(`${payload.razaoSocial ?? t('studio.companyFallback')} · ${payload.situacao ?? ''}`);
      toast.success(t('toast.cnpjValidated'));
    } catch (err) {
      toast.error(formatAppError(err, 'api'));
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    const digits = onlyCnpjDigits(cnpj);
    if (!isValidCnpj(digits)) {
      toast.error(t('toast.cnpjInvalid14'));
      return;
    }
    setLoading(true);
    try {
      const res = await authedFetch(
        '/api/studios/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cnpj: digits }),
        },
        tokenFn
      );
      const payload = (await res.json().catch(() => ({}))) as {
        sucesso?: boolean;
        erro?: string;
        studio?: { razaoSocial?: string; endereco?: string; situacao?: string };
      };
      if (!res.ok || !payload.sucesso) {
        throw new Error(payload.erro || t('toast.cnpjRegisterFailed'));
      }
      const next = {
        cnpjMasked: maskCnpj(digits),
        razaoSocial: payload.studio?.razaoSocial ?? null,
        enderecoOficial: payload.studio?.endereco ?? null,
        statusReceita: payload.studio?.situacao ?? 'ativa',
      };
      setCompliance(next);
      onRegistered?.(next);
      toast.success(t('toast.cnpjRegistered'));
    } catch (err) {
      toast.error(formatAppError(err, 'api'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassContainer className="space-y-4 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
          <Building2 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">
            {t('studio.fiscalBadge')}
          </p>
           <h3 className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">{t('studio.cnpjTitle')}</h3>
        </div>
      </div>

      {compliance?.cnpjMasked ? (
         <div className="rounded-xl border border-black/[0.04] bg-neutral-50 p-4 text-sm dark:border-white/[0.05] dark:bg-white/[0.03]">
           <p className="font-semibold text-neutral-900 dark:text-white">{compliance?.razaoSocial || t('studio.registered')}</p>
          <p className="mt-1 text-zinc-400">{compliance?.cnpjMasked}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-emerald-300">
            {compliance?.statusReceita || 'ativa'}
          </p>
          {compliance?.enderecoOficial ? (
            <p className="mt-2 text-xs text-zinc-500">{compliance.enderecoOficial}</p>
          ) : null}
        </div>
      ) : (
        <>
          <input
            value={cnpj}
            onChange={(event) => setCnpj(formatCnpj(event.target.value))}
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
             className="h-12 w-full rounded-lg border border-black/[0.04] bg-white px-4 text-sm text-neutral-900 caret-neutral-900 outline-none placeholder:text-neutral-400 focus:border-amber-500 dark:border-white/[0.05] dark:bg-neutral-900 dark:text-white dark:caret-white dark:placeholder:text-neutral-500"
          />
          {preview ? <p className="text-xs text-zinc-400">{preview}</p> : null}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" isLoading={loading} onClick={() => void validate()}>
              {t('studio.validateCnpj')}
            </Button>
            <Button type="button" isLoading={loading} onClick={() => void register()}>
              {t('studio.register')}
            </Button>
          </div>
        </>
      )}
    </GlassContainer>
  );
}
