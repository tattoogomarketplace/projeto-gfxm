'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Fingerprint,
  Images,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { ProfessionalKycPanel } from '@/components/settings/professional-kyc-panel';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useArtistViewportGuard } from '@/hooks/use-artist-viewport-guard';
import { useAuthStore } from '@/hooks/use-auth-store';
import { cn } from '@/lib/utils';
import { formatCpf, isValidCpf, onlyCpfDigits } from '@/lib/utils/cpf';
import { parseAppRole, type AppRole } from '@/lib/utils/auth-redirect';
import { useI18n } from '@/hooks/use-i18n';
import { formatAppError } from '@/lib/error-handler';
import type { MessageKey } from '@/lib/i18n/types';

type Stage = 'locked' | 'unlocked';

const BENEFITS: Array<{ icon: typeof CalendarDays; titleKey: MessageKey; descriptionKey: MessageKey }> = [
  {
    icon: CalendarDays,
    titleKey: 'kyc.benefitAgendaTitle',
    descriptionKey: 'kyc.benefitAgendaDesc',
  },
  {
    icon: Wallet,
    titleKey: 'kyc.benefitPayTitle',
    descriptionKey: 'kyc.benefitPayDesc',
  },
  {
    icon: Images,
    titleKey: 'kyc.benefitPortfolioTitle',
    descriptionKey: 'kyc.benefitPortfolioDesc',
  },
];

// `useLayoutEffect` roda antes do paint para eliminar o "flash" de conteúdo
// cortado na reentrada; no servidor caímos para `useEffect` para evitar o aviso
// de SSR. Referência ao padrão clássico "useIsomorphicLayoutEffect".
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Zera a rolagem do container da tela e de TODA a cadeia de ancestrais.
 *
 * Ao navegar no cliente, a AppShell (DashboardShell) é preservada pelo App
 * Router e continua sendo o mesmo nó de DOM — inclusive com o `scrollTop`
 * herdado da tela anterior. Como esta rota é montada por baixo dela, sem zerar
 * a cadeia inteira o cabeçalho entra fora do enquadramento e o rodapé some
 * ("clipping") em toda reentrada. Aqui reafirmamos o topo em cada montagem.
 */
function resetScrollChain(node: HTMLElement | null) {
  if (typeof window === 'undefined') return;

  window.scrollTo(0, 0);
  const scrolling = document.scrollingElement;
  if (scrolling) scrolling.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  let current: HTMLElement | null = node;
  while (current) {
    current.scrollTop = 0;
    current = current.parentElement;
  }
}

/**
 * Entrada segura do fluxo de verificação de artista.
 *
 * Esta etapa NÃO persiste mutação de papel nem de status no banco. Ao apenas
 * renderizar a tela nada muda: o usuário permanece um usuário padrão. Somente
 * depois de confirmar a identidade por reautenticação (e-mail + CPF) é que os
 * campos de envio de Documentos Pessoais são expostos. O upgrade de papel
 * `cliente -> tatuador` só ocorre após a análise da verificação (etapa seguinte).
 */
export default function SejaTatuadorPage() {
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const setRole = useAuthStore((s) => s.setRole);
  const { triggerHaptic } = useHapticFeedback();
  const { t } = useI18n();
  useArtistViewportGuard();

  const containerRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Garante que entrar/sair desta tela sempre parta do topo, sem herdar a
  // rolagem de uma visita anterior (o que empurrava o cabeçalho para fora do
  // enquadramento e "cortava" o rodapé). Dependemos de `isLoaded` porque no
  // primeiro acesso o Clerk ainda está hidratando: só quando ele resolve é que
  // o container real monta, e é aí que a cadeia de rolagem precisa ser zerada.
  useIsomorphicLayoutEffect(() => {
    resetScrollChain(containerRef.current);
    return () => resetScrollChain(containerRef.current);
  }, [isLoaded]);

  const metadataRole = parseAppRole(
    (user?.unsafeMetadata as Record<string, unknown> | undefined)?.role as string | undefined
  );
  const currentRole: AppRole = role ?? metadataRole ?? 'cliente';
  const defaultEmail = user?.primaryEmailAddress?.emailAddress ?? '';

  const [emailOverride, setEmailOverride] = useState<string | null>(null);
  const [forcedStage, setForcedStage] = useState<Stage | null>(null);
  const [cpf, setCpf] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const email = emailOverride ?? defaultEmail;
  const stage: Stage = forcedStage ?? (currentRole === 'tatuador' ? 'unlocked' : 'locked');

  const fail = (message: string) => {
    setError(message);
    setShake(true);
    triggerHaptic('heavy');
    toast.error(message);
    window.setTimeout(() => setShake(false), 480);
  };

  const focusGate = () => {
    triggerHaptic('light');
    gateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => emailRef.current?.focus(), 320);
  };

  const handleVerifyIdentity = async () => {
    if (busy) return;

    const normalizedEmail = email.trim().toLowerCase();
    const cpfDigits = onlyCpfDigits(cpf);

    if (!normalizedEmail || !normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
      fail(t('toast.identityEmail'));
      return;
    }
    if (!isValidCpf(cpfDigits)) {
      fail(t('toast.identityCpf'));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const verifyRes = await fetch('/api/auth/verify-reset-credentials', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, cpf: cpfDigits }),
      });
      const verification = (await verifyRes.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!verifyRes.ok || !verification.ok) {
        fail(verification.error ? formatAppError({ message: verification.error }, 'api') : t('toast.identityMismatch'));
        return;
      }

      triggerHaptic('success');
      setForcedStage('unlocked');
      toast.success(t('toast.identityConfirmed'));
    } catch {
      fail(t('toast.identityNetwork'));
    } finally {
      setBusy(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-none bg-background px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+3rem)] text-white sm:px-6 [-webkit-overflow-scrolling:touch]">
        <div className="flex flex-1 items-center justify-center">
          <TattooMachineLoader label={t('kyc.preparing')} />
        </div>
      </div>
    );
  }

  const firstName = (user?.firstName || '').trim();

  return (
    <div
      ref={containerRef}
      className="artist-verification-screen relative flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-none bg-background px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+4rem)] text-white sm:px-6 [-webkit-overflow-scrolling:touch]"
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col space-y-6">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              router.back();
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl text-[13px] font-semibold tracking-tight text-zinc-400 transition-colors hover:text-orange-400 active:scale-[0.98]"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
            {t('common.back')}
          </button>

          <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-white/[0.03] p-6 backdrop-blur-md sm:p-8">
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                {t('role.tatuador.title')}
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {firstName ? t('kyc.becomeTitleNamed', { name: firstName }) : t('kyc.becomeTitle')}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                {t('kyc.becomeBody')}
              </p>

              <ul className="mt-6 space-y-3">
                {BENEFITS.map(({ icon: Icon, titleKey, descriptionKey }) => (
                  <li key={titleKey} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-400">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-white">{t(titleKey)}</span>
                      <span className="block text-xs leading-relaxed text-zinc-400">
                        {t(descriptionKey)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              {stage === 'locked' ? (
                <button
                  type="button"
                  onClick={focusGate}
                  className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 text-base font-bold text-black shadow-[0_0_25px_rgba(249,115,22,0.5)] transition-all duration-300 hover:bg-orange-600 active:scale-95"
                >
                  <ShieldCheck className="h-5 w-5" strokeWidth={2} />
                  {t('kyc.startSecure')}
                </button>
              ) : null}
            </div>
          </section>

          {stage === 'locked' ? (
            <motion.div
              ref={gateRef}
              animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
              transition={{ duration: 0.42, ease: 'easeInOut' }}
              className="scroll-mt-6"
            >
              <section
                aria-labelledby="gate-title"
                className={cn(
                  'rounded-3xl border bg-white/5 p-6 backdrop-blur-md sm:p-7',
                  error ? 'border-red-500/40' : 'border-border/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
                    <Lock className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <h2 id="gate-title" className="text-lg font-bold text-white">
                      {t('kyc.securityTitle')}
                    </h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                      {t('kyc.securityBody')}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                      {t('kyc.emailLabel')}
                    </span>
                    <input
                      ref={emailRef}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      disabled={busy}
                      onChange={(event) => {
                        setEmailOverride(event.target.value);
                        setError(null);
                      }}
                      placeholder={t('kyc.emailPlaceholder')}
                      className="min-h-12 w-full rounded-xl border border-border/60 bg-black/30 px-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/40 disabled:opacity-60"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                      {t('kyc.cpfLabel')}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={cpf}
                      disabled={busy}
                      onChange={(event) => {
                        setCpf(formatCpf(event.target.value));
                        setError(null);
                      }}
                      placeholder={t('kyc.cpfPlaceholder')}
                      className="min-h-12 w-full rounded-xl border border-border/60 bg-black/30 px-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/40 disabled:opacity-60"
                    />
                  </label>

                  {error ? (
                    <p role="alert" className="text-xs leading-relaxed text-red-400">
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void handleVerifyIdentity()}
                    disabled={busy}
                    className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 text-base font-bold text-black shadow-[0_0_22px_rgba(249,115,22,0.45)] transition-all duration-300 hover:bg-orange-600 active:scale-95 disabled:opacity-60"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
                        {t('kyc.confirming')}
                      </>
                    ) : (
                      <>
                        <Fingerprint className="h-5 w-5" strokeWidth={1.75} />
                        {t('kyc.confirmIdentity')}
                      </>
                    )}
                  </button>

                  <p className="flex items-start gap-2 text-[11px] leading-relaxed text-zinc-500">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500/80" strokeWidth={1.75} />
                    {t('kyc.securityNote')}
                  </p>
                </div>
              </section>
            </motion.div>
          ) : null}

          {stage === 'unlocked' ? (
            <>
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" strokeWidth={1.75} />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                    {t('kyc.identityConfirmed')}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-100/80">
                    {t('kyc.sendDocsNow')}
                  </p>
                </div>
              </div>

              <ProfessionalKycPanel
                onApproved={async (result) => {
                  if (result.role === 'tatuador' || result.role === 'estudio') {
                    setRole(result.role);
                  } else {
                    setRole('tatuador');
                  }
                  try {
                    await user?.reload();
                  } catch {
                    // Clerk metadata pode atrasar; o banco já está promovido.
                  }
                  toast.success(t('toast.artistUnlocked'));
                  router.push('/dashboard/tatuador');
                }}
              />
            </>
          ) : null}
      </div>
    </div>
  );
}
