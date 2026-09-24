'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// TODO: Migrar lógica para Prisma e Clerk
// import { createClient } from '@/lib/supabase';
import { KYCForm } from '@/components/features/kyc-form';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';

type KycStatus = 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado';

const COPY: Record<KycStatus, { title: string; body: string }> = {
  pendente: {
    title: 'Conta em análise',
    body: 'Envie seus documentos sanitários para liberar agenda, portfólio e recebimentos. Sua conta de tatuador é independente do estúdio.',
  },
  em_analise: {
    title: 'Documentos em análise',
    body: 'Recebemos seu envio. A bancada fica bloqueada até a homologação. Você pode complementar o CNPJ abaixo se necessário.',
  },
  rejeitado: {
    title: 'KYC rejeitado',
    body: 'Houve inconsistência nos documentos. Revise o CNPJ e reenvie para nova análise.',
  },
  aprovado: {
    title: 'KYC aprovado',
    body: 'Sua bancada está liberada. Redirecionando para o painel do artista.',
  },
};

export default function KycPendentePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<KycStatus>('pendente');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getUser();
      const user = sessionData.user;
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: perfil } = await supabase
        .from('perfis')
        .select('id, role, kyc_status, deleted_at')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!perfil || perfil.deleted_at) {
        router.push('/login');
        return;
      }

      if (perfil.role !== 'tatuador') {
        router.push(dashboardPathForRole(perfil.role));
        return;
      }

      const kyc = (perfil.kyc_status || 'pendente') as KycStatus;
      if (kyc === 'aprovado') {
        router.push('/dashboard/tatuador');
        return;
      }

      setUserId(user.id);
      setStatus(kyc);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#121212]">
        <TattooMachineLoader label="Verificando KYC" />
      </div>
    );
  }

  const copy = COPY[status] || COPY.pendente;

  return (
    <div className="min-h-dvh bg-[#121212] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-500 mb-3">TattooGo MK</p>
          <h1 className="text-2xl font-bold mb-3">{copy.title}</h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">{copy.body}</p>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-6">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            Status: {status.replace('_', ' ')}
          </div>
          {userId ? <KYCForm userId={userId} /> : null}
        </div>
        <p className="text-center text-xs text-zinc-500">
          Já homologado?{' '}
          <Link href="/dashboard/tatuador" className="text-amber-500 hover:underline">
            Ir para o painel
          </Link>
        </p>
      </div>
    </div>
  );
}
