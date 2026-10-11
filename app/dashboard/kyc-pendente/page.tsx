'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Calendar, ShieldCheck, Sparkles } from 'lucide-react';
import { ProfessionalKycPanel, type KycStatusValue } from '@/components/features/professional-kyc-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { dashboardPathForRole, isOnboardingComplete, normalizeAppRole } from '@/lib/utils/auth-redirect';
import { BRAND_NAME } from '@/lib/i18n/brands';
import { useI18n } from '@/hooks/use-i18n';
import type { MessageKey } from '@/lib/i18n/types';

type KycStatus = KycStatusValue;

const FEATURES: Array<{ icon: typeof Calendar; titleKey: MessageKey; descriptionKey: MessageKey }> = [
  {
    icon: Calendar,
    titleKey: 'kyc.benefitAgendaTitle',
    descriptionKey: 'kyc.benefitAgendaDesc',
  },
  {
    icon: ShieldCheck,
    titleKey: 'kyc.benefitPayTitle',
    descriptionKey: 'kyc.benefitPayDesc',
  },
  {
    icon: Sparkles,
    titleKey: 'kyc.benefitPortfolioTitle',
    descriptionKey: 'kyc.benefitPortfolioDesc',
  },
];

const COPY: Record<KycStatus, { titleKey: MessageKey; bodyKey: MessageKey }> = {
  pendente: {
    titleKey: 'kyc.copyPendingTitle',
    bodyKey: 'kyc.copyPendingBody',
  },
  em_analise: {
    titleKey: 'kyc.copyReviewTitle',
    bodyKey: 'kyc.copyReviewBody',
  },
  rejeitado: {
    titleKey: 'kyc.copyRejectedTitle',
    bodyKey: 'kyc.copyRejectedBody',
  },
  aprovado: {
    titleKey: 'kyc.copyApprovedTitle',
    bodyKey: 'kyc.copyApprovedRedirect',
  },
  nao_aplicavel: {
    titleKey: 'kyc.copyNaTitle',
    bodyKey: 'kyc.copyNaRedirect',
  },
};

const STATUS_LABEL_KEY: Record<KycStatus, MessageKey> = {
  pendente: 'kyc.statusPending',
  em_analise: 'kyc.statusReview',
  rejeitado: 'kyc.statusRejected',
  aprovado: 'kyc.statusApproved',
  nao_aplicavel: 'kyc.statusNa',
};

export default function KycPendentePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const { t } = useI18n();
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
          router.push('/dashboard/onboarding/username?flow=tatuador');
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
        router.push('/dashboard/onboarding/username?flow=tatuador');
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
      <div
        className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background text-white"
        aria-hidden
        aria-busy="true"
      >
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-6 [-webkit-overflow-scrolling:touch] sm:px-6">
          <div className="mx-auto w-full max-w-lg space-y-6 pb-8">
            <section className="rounded-2xl border border-border/50 bg-white/[0.03] p-6 backdrop-blur-md sm:p-8">
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="mt-3 h-8 w-3/4 max-w-[16rem] rounded-full" />
              <Skeleton className="mt-3 h-4 w-full rounded-full" />
              <Skeleton className="mt-2 h-4 w-4/5 rounded-full" />
              <ul className="mt-6 space-y-3">
                {[0, 1, 2].map((index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 min-h-8 min-w-8 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-32 rounded-full" />
                      <Skeleton className="h-3 w-full max-w-[18rem] rounded-full" />
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="rounded-2xl border border-border/50 bg-white/5 p-6 backdrop-blur-md sm:p-8">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="mt-3 h-7 w-2/3 max-w-[14rem] rounded-full" />
              <Skeleton className="mt-3 h-4 w-full rounded-full" />
              <Skeleton className="mt-2 h-4 w-5/6 rounded-full" />
              <div className="mt-6 flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-3 w-40 rounded-full" />
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-white/5 p-5 backdrop-blur-md sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="h-5 w-40 rounded-full" />
                  <Skeleton className="h-3 w-full max-w-[20rem] rounded-full" />
                </div>
                <Skeleton className="h-8 w-24 shrink-0 rounded-full" />
              </div>
              <div className="mt-5 space-y-4">
                {[0, 1].map((index) => (
                  <div key={index} className="rounded-2xl border border-border/50 bg-white/5 p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-11 w-11 min-h-11 min-w-11 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-40 rounded-full" />
                        <Skeleton className="h-3 w-full max-w-[18rem] rounded-full" />
                      </div>
                    </div>
                    <Skeleton className="mt-4 h-28 w-full rounded-2xl" />
                  </div>
                ))}
              </div>
              <Skeleton className="mt-5 h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const copy = COPY[status] || COPY.pendente;

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background text-white">
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-6 [-webkit-overflow-scrolling:touch] sm:px-6">
        <div className="mx-auto w-full max-w-lg space-y-6 pb-8">
          <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-white/[0.03] p-6 backdrop-blur-md sm:p-8">
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">
                {t('role.tatuador.title')}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t('kyc.heroTitle')}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                {t('kyc.heroBody')}
              </p>
              <ul className="mt-6 space-y-3">
                {FEATURES.map(({ icon: Icon, titleKey, descriptionKey }) => (
                  <li key={titleKey} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-orange-500/25 bg-orange-500/10 text-orange-400">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-white">{t(titleKey)}</span>
                      <span className="block text-xs leading-relaxed text-zinc-400">{t(descriptionKey)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div className="rounded-2xl border border-border/50 bg-white/5 p-6 backdrop-blur-md sm:p-8">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-amber-500">{BRAND_NAME}</p>
            <h2 className="mb-3 text-2xl font-bold">{t(copy.titleKey)}</h2>
            <p className="mb-6 text-sm leading-relaxed text-zinc-400">{t(copy.bodyKey)}</p>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              {t('kyc.statusLabel', { title: t(STATUS_LABEL_KEY[status]) })}
            </div>
          </div>

          <ProfessionalKycPanel
            status={status}
            onStatusChange={(next) => {
              setStatus(next);
              if (next === 'aprovado') {
                router.push('/dashboard/onboarding/username?flow=tatuador');
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
