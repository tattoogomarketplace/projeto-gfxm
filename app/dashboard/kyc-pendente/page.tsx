'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Calendar, ShieldCheck, Sparkles } from 'lucide-react';
import { ProfessionalKycPanel, type KycStatusValue } from '@/components/features/professional-kyc-panel';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { dashboardPathForRole, isOnboardingComplete, normalizeAppRole } from '@/lib/utils/auth-redirect';

type KycStatus = KycStatusValue;

const FEATURES: Array<{ icon: typeof Calendar; title: string; description: string }> = [
  {
    icon: Calendar,
    title: 'Agenda inteligente',
    description: 'Organize sessões, horários e disponibilidade em um só lugar.',
  },
  {
    icon: ShieldCheck,
    title: 'Pagamentos seguros',
    description: 'Receba com split automático e proteção antifraude.',
  },
  {
    icon: Sparkles,
    title: 'Portfólio em destaque',
    description: 'Mostre sua arte para clientes de todo o país.',
  },
];

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
      <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background">
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto overscroll-none px-4 py-6 [-webkit-overflow-scrolling:touch]">
          <TattooMachineLoader label="Verificando Documentos Pessoais" />
        </div>
      </div>
    );
  }

  const copy = COPY[status] || COPY.pendente;

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background text-white">
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-6 [-webkit-overflow-scrolling:touch] sm:px-6">
        <div className="mx-auto w-full max-w-lg space-y-6 pb-8">
          <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-orange-500/10 via-transparent to-transparent p-6 sm:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl"
            />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">
                Atelier Digital
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Eleve a sua arte ao{' '}
                <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                  próximo nível.
                </span>
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                Junte-se à elite. Desbloqueie sua agenda inteligente, receba pagamentos seguros e
                mostre seu portfólio para o mundo.
              </p>
              <ul className="mt-6 space-y-3">
                {FEATURES.map(({ icon: Icon, title, description }) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-orange-500/25 bg-orange-500/10 text-orange-400">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-white">{title}</span>
                      <span className="block text-xs leading-relaxed text-zinc-400">{description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div className="rounded-2xl border border-border/50 bg-white/5 p-6 backdrop-blur-md sm:p-8">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-amber-500">TattooGo MK</p>
            <h2 className="mb-3 text-2xl font-bold">{copy.title}</h2>
            <p className="mb-6 text-sm leading-relaxed text-zinc-400">{copy.body}</p>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              Status: {status.replace('_', ' ')}
            </div>
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
