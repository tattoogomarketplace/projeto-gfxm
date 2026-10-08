'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  PenLine,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { GlassContainer } from '@/components/ui/glass-container';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TattooOTPVerification } from '@/components/features/tattoo-otp';
import { useAgendamentos } from '@/hooks/use-agendamentos';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { BRAND_NAME } from '@/lib/i18n/brands';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';
import {
  depositAmount,
  formatBRL,
  formatWhen,
  PAYMENT_JOURNEY_STATUSES,
  resolveTone,
  type AgendaStatus,
} from '@/lib/utils/agenda-status';
import { cn } from '@/lib/utils';
import type { Agendamento } from '@/lib/types/database';

const ENTRY_CARD_CLASS =
  'group flex min-h-11 w-full items-center gap-3 rounded-2xl border border-black/[0.04] bg-white px-4 py-3 text-left shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:border-orange-500/40 hover:bg-orange-500/[0.04] active:scale-[0.99] dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none';

export function PaymentsEntryCard({ href = '/dashboard/pagamentos' }: { href?: string }) {
  const { t } = useI18n();
  return (
    <Link href={href} className={ENTRY_CARD_CLASS}>
      <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
        <Wallet className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
          {t('payments.title')}
        </span>
        <span className="mt-0.5 block text-xs text-zinc-500">{t('payments.entryHint')}</span>
      </span>
      <ChevronRight
        className="h-5 w-5 min-h-5 min-w-5 text-zinc-500 transition-colors group-hover:text-orange-400"
        strokeWidth={1.75}
      />
    </Link>
  );
}

function PaymentsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
    </div>
  );
}

function JourneyStepper() {
  const { t } = useI18n();
  return (
    <div className="w-full space-y-3">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400 dark:text-zinc-500">
        {t('payments.journey')}
      </p>
      <ol className="grid w-full grid-cols-3 gap-2">
        {PAYMENT_JOURNEY_STATUSES.map((status, index) => {
          const tone = resolveTone(status);
          const Icon = tone.icon;
          return (
            <li
              key={status}
              className="relative w-full overflow-hidden rounded-2xl border border-black/[0.04] bg-white p-3 dark:border-white/[0.05] dark:bg-white/[0.03]"
            >
              <span
                aria-hidden
                className={cn('absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r', tone.accent)}
              />
              <span
                className={cn(
                  'flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded-xl border',
                  tone.pill
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                {String(index + 1).padStart(2, '0')}
              </p>
              <p className="mt-0.5 text-xs font-semibold leading-tight text-gray-900 dark:text-white">
                {t(tone.labelKey)}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SignatureBlock({
  agendamento,
  onSigned,
}: {
  agendamento: Agendamento;
  onSigned: (id: string) => void;
}) {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const [open, setOpen] = useState(false);

  const handleVerify = useCallback(async (code: string) => {
    if (code.trim().length !== 6) return false;
    triggerHaptic('medium');
    return true;
  }, [triggerHaptic]);

  return (
    <div className="mt-3 space-y-3">
      <button
        type="button"
        onClick={() => {
          triggerHaptic('light');
          setOpen((prev) => !prev);
        }}
        className="apple-press inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 text-sm font-semibold text-orange-600 hover:brightness-110 dark:text-orange-300"
      >
        <PenLine className="h-4 w-4" strokeWidth={2} />
        {t('agenda.signDocument')}
      </button>
      {open ? (
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.04] p-4">
          <p className="mb-3 text-center text-xs text-neutral-500 dark:text-zinc-400">
            {t('agenda.statusActionRequiredHint')}
          </p>
          <TattooOTPVerification
            onVerify={handleVerify}
            onSuccess={() => {
              toast.success(t('payments.signed'));
              onSigned(agendamento.id);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function GatewayBlock({
  agendamento,
  onPaid,
}: {
  agendamento: Agendamento;
  onPaid: (id: string) => void;
}) {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const sinal = depositAmount(agendamento.valor_total);

  const settle = (method: 'google' | 'card') => {
    triggerHaptic('medium');
    toast.success(t('payments.paid'), {
      description: `${t('payments.depositLabel')} · ${formatBRL(sinal)} · ${method === 'google' ? t('payments.googlePay') : t('payments.creditCard')}`,
    });
    onPaid(agendamento.id);
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-neutral-500 dark:text-zinc-400">
        {t('payments.depositLabel')}: {formatBRL(sinal)}
      </p>
      <button
        type="button"
        onClick={() => settle('google')}
        className="apple-press inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
      >
        <Wallet className="h-4 w-4" strokeWidth={2} />
        {t('payments.googlePay')}
      </button>
      <button
        type="button"
        onClick={() => settle('card')}
        className="apple-press inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 text-sm font-bold text-black shadow-[0_0_18px_rgba(249,115,22,0.3)] hover:bg-orange-600"
      >
        <CreditCard className="h-4 w-4" strokeWidth={2} />
        {t('payments.creditCard')}
      </button>
    </div>
  );
}

function PaymentSessionCard({
  agendamento,
  localStatus,
  onSigned,
  onPaid,
}: {
  agendamento: Agendamento;
  localStatus: AgendaStatus;
  onSigned: (id: string) => void;
  onPaid: (id: string) => void;
}) {
  const { t } = useI18n();
  const tone = resolveTone(localStatus);
  const Icon = tone.icon;

  return (
    <GlassContainer className="relative w-full overflow-hidden p-4">
      <span
        aria-hidden
        className={cn('absolute left-0 top-0 h-full w-1 bg-gradient-to-b', tone.accent)}
      />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
              tone.pill
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            {t(tone.labelKey)}
          </span>
          <span className="shrink-0 text-xs font-medium text-neutral-500 dark:text-zinc-400">
            {formatWhen(agendamento.data_hora)}
          </span>
        </div>
        <p className="mt-3 text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
          {t('agenda.session')}
        </p>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-zinc-400">
          {formatBRL(agendamento.valor_total)}
        </p>
        {localStatus === 'rascunho' ? (
          <SignatureBlock agendamento={agendamento} onSigned={onSigned} />
        ) : null}
        {localStatus === 'aguardando_sinal' ? (
          <GatewayBlock agendamento={agendamento} onPaid={onPaid} />
        ) : null}
        {localStatus === 'confirmado' ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
            {t('agenda.statusConfirmed')}
          </p>
        ) : null}
      </div>
    </GlassContainer>
  );
}

export function PaymentsHub() {
  const { t } = useI18n();
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const { data, isLoading } = useAgendamentos();
  const [overrides, setOverrides] = useState<Record<string, AgendaStatus>>({});

  const items = useMemo(() => data ?? [], [data]);
  const tracked = useMemo(
    () =>
      items.filter((item) => {
        const status = overrides[item.id] ?? item.status;
        return PAYMENT_JOURNEY_STATUSES.includes(status);
      }),
    [items, overrides]
  );

  const handleSigned = useCallback((id: string) => {
    setOverrides((prev) => ({ ...prev, [id]: 'aguardando_sinal' }));
  }, []);

  const handlePaid = useCallback((id: string) => {
    setOverrides((prev) => ({ ...prev, [id]: 'confirmado' }));
  }, []);

  return (
    <div className="w-full flex-1 space-y-6 pt-5">
      <SegmentedControl
        options={[
          { value: 'agenda', label: t('nav.schedule') },
          { value: 'pagamentos', label: t('payments.title') },
        ]}
        value="pagamentos"
        onChange={(value) => {
          if (value === 'agenda') {
            router.push(`${dashboardPathForRole(role)}?tab=agendar`);
          }
        }}
        ariaLabel={t('nav.schedule')}
      />

      <header className="relative w-full overflow-hidden rounded-3xl border border-black/[0.04] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500 dark:text-orange-400">
          {BRAND_NAME}
        </p>
        <h1 className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
          {t('payments.title')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-zinc-400">
          {t('payments.subtitle')}
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 dark:text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} />
          {t('payments.secureNote')}
        </p>
      </header>

      <JourneyStepper />

      {isLoading ? (
        <PaymentsSkeleton />
      ) : tracked.length === 0 ? (
        <GlassContainer className="border-dashed p-6 text-center">
          <Wallet className="mx-auto h-6 w-6 text-orange-500 dark:text-orange-400" strokeWidth={1.75} />
          <p className="mt-3 text-sm font-medium text-neutral-600 dark:text-zinc-300">
            {t('agenda.empty')}
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">{t('agenda.emptyHint')}</p>
        </GlassContainer>
      ) : (
        <div className="space-y-4">
          {tracked.map((agendamento) => (
            <PaymentSessionCard
              key={agendamento.id}
              agendamento={agendamento}
              localStatus={overrides[agendamento.id] ?? agendamento.status}
              onSigned={handleSigned}
              onPaid={handlePaid}
            />
          ))}
        </div>
      )}
    </div>
  );
}
