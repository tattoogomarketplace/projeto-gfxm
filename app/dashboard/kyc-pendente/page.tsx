'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { ProfessionalKycPanel, type KycStatusValue } from '@/components/features/professional-kyc-panel';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { dashboardPathForRole, isOnboardingComplete, normalizeAppRole } from '@/lib/utils/auth-redirect';

type KycStatus = KycStatusValue;

const COPY: Record<KycStatus, { title: string; body: string }> = {
  pendente: {
    title: 'Conta em análise',
    body: 'Envie seus documentos sanitários para liberar agenda, portfólio e recebimentos. Sua conta de tatuador é independente do estúdio.',
  },
  em_analise: {
    title: 'Documentos em análise',
    body: 'Recebemos seu envio. A bancada fica bloqueada até a homologação. Você pode reenviar um documento mais nítido se quiser.',
  },
  rejeitado: {
    title: 'Documentos Pessoais rejeitados',
    body: 'Houve inconsistência nos documentos. Envie um documento oficial nítido para nova análise.',
  },
  aprovado: {
    title: 'Documentos Pessoais aprovados',
    body: 'Sua bancada está liberada. Redirecionando para o painel do artista.',
  },
  nao_aplicavel: {
    title: 'Verificação não aplicável',
    body: 'A verificação de Documentos Pessoais é exclusiva de tatuadores e estúdios. Redirecionando para o seu painel.',
  },
};

export default function KycPendentePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [status, setStatus] = useState<KycStatus>('pendente');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) {
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      const metadata = (user.unsafeMetadata || user.publicMetadata || {}) as Record<string, unknown>;
      try {
        const response = await fetch('/api/perfil/ensure', { cache: 'no-store' });
        if (cancelled) return;
        // 401 com sessão Clerk viva = token ainda travado/inicializando.
        // Cai no fallback por metadata em vez de redirecionar ou lançar.
        if (response.status === 401) {
          throw new Error('session-initializing');
        }
        const payload = await response.json().catch(() => ({}));
        if (!payload?.perfil || payload?.needsOnboarding || !isOnboardingComplete(payload.perfil)) {
          router.push('/dashboard/onboarding');
          return;
        }
        const role = normalizeAppRole(payload?.perfil?.role || (metadata?.role as string));
        if (role !== 'tatuador') {
          router.push(dashboardPathForRole(role));
          return;
        }
        const kyc = (payload?.perfil?.kyc_status as KycStatus) || 'pendente';
        if (kyc === 'aprovado') {
          router.push('/dashboard/tatuador');
          return;
        }
        setStatus(kyc);
        setLoading(false);
        return;
      } catch {
        if (cancelled) return;
      }

      const role = normalizeAppRole(metadata?.role as string);
        if (role !== 'tatuador') {
          router.push(dashboardPathForRole(role));
          return;
        }

        const kyc = (metadata?.kyc_status as KycStatus) || 'pendente';
      if (kyc === 'aprovado') {
        router.push('/dashboard/tatuador');
        return;
      }

      setStatus(kyc);
      setLoading(false);
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, router]);

  if (loading || !isLoaded || !isSignedIn || !user) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-none px-4 pb-36 [-webkit-overflow-scrolling:touch]">
          <TattooMachineLoader label="Verificando Documentos Pessoais" />
        </div>
      </div>
    );
  }

  const copy = COPY[status] || COPY.pendente;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-white">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-none px-4 pb-36 pt-4 [-webkit-overflow-scrolling:touch]">
      <div className="w-full max-w-lg space-y-6">
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-500 mb-3">TattooGo MK</p>
          <h1 className="text-2xl font-bold mb-3">{copy.title}</h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">{copy.body}</p>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-6">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            Status: {status.replace('_', ' ')}
          </div>
          <ProfessionalKycPanel
            status={status}
            onStatusChange={(next) => {
              setStatus(next);
              if (next === 'aprovado') {
                router.push('/dashboard/tatuador');
              }
            }}
          />
        </div>
        <p className="text-center text-xs text-zinc-500">
          Já homologado?{' '}
          <Link href="/dashboard/tatuador" className="text-amber-500 hover:underline">
            Ir para o painel
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
