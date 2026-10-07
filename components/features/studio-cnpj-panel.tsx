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

type Compliance = StudioComplianceView;

export function StudioCnpjPanel({
  initial,
  onRegistered,
}: {
  initial: Compliance;
  onRegistered?: (next: NonNullable<Compliance>) => void;
}) {
  const { getToken } = useAuth();
  const [cnpj, setCnpj] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [compliance, setCompliance] = useState<Compliance>(initial);

  const tokenFn = () => getToken({ skipCache: true });

  const validate = async () => {
    const digits = onlyCnpjDigits(cnpj);
    if (!isValidCnpj(digits)) {
      toast.error('Informe um CNPJ válido com 14 dígitos.');
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
        throw new Error(payload.erro || 'Falha na validação do CNPJ.');
      }
      setPreview(`${payload.razaoSocial ?? 'Empresa'} · ${payload.situacao ?? ''}`);
      toast.success('CNPJ validado na Receita.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao validar CNPJ.');
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    const digits = onlyCnpjDigits(cnpj);
    if (!isValidCnpj(digits)) {
      toast.error('Informe um CNPJ válido com 14 dígitos.');
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
        throw new Error(payload.erro || 'Falha ao registrar o CNPJ.');
      }
      const next = {
        cnpjMasked: maskCnpj(digits),
        razaoSocial: payload.studio?.razaoSocial ?? null,
        enderecoOficial: payload.studio?.endereco ?? null,
        statusReceita: payload.studio?.situacao ?? 'ativa',
      };
      setCompliance(next);
      onRegistered?.(next);
      toast.success('CNPJ registrado no estúdio.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao registrar CNPJ.');
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
            Compliance fiscal
          </p>
           <h3 className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">CNPJ do estúdio</h3>
        </div>
      </div>

      {compliance?.cnpjMasked ? (
         <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-800 dark:bg-[#121212]">
           <p className="font-semibold text-neutral-900 dark:text-white">{compliance?.razaoSocial || 'Estúdio registrado'}</p>
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
             className="h-12 w-full rounded-lg border border-neutral-200 bg-white px-4 text-sm text-neutral-900 caret-neutral-900 outline-none placeholder:text-neutral-400 focus:border-amber-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:caret-white dark:placeholder:text-neutral-500"
          />
          {preview ? <p className="text-xs text-zinc-400">{preview}</p> : null}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" isLoading={loading} onClick={() => void validate()}>
              Validar CNPJ
            </Button>
            <Button type="button" isLoading={loading} onClick={() => void register()}>
              Registrar
            </Button>
          </div>
        </>
      )}
    </GlassContainer>
  );
}
