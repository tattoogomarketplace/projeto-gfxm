'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Lock,
  PenLine,
  ShieldCheck,
  Ticket,
  Unlock,
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
import { getRoleExperience } from '@/lib/content/role-experience';
import { calculateSplits } from '@/lib/finance';
import { BRAND_NAME } from '@/lib/i18n/brands';
import { dashboardPathForRole, type AppRole } from '@/lib/utils/auth-redirect';
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
import type { EscrowLedgerState, StudioSplitModel } from '@/lib/types/escrow';

const ENTRY_CARD_CLASS =
  'group flex min-h-11 min-w-0 w-full items-center gap-3 rounded-2xl border border-black/[0.04] bg-white px-4 py-3 text-left shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:border-orange-500/40 hover:bg-orange-500/[0.04] active:scale-[0.99] dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none';

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
    <div className="min-w-0 w-full space-y-3">
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

const RECEIPT_STATUSES: AgendaStatus[] = ['confirmado', 'concluido'];

function receiptModelForRole(role: AppRole): StudioSplitModel {
  return role === 'estudio' ? 'estudio' : 'solo';
}

function escrowStateFor(status: AgendaStatus): EscrowLedgerState {
  if (status === 'concluido') return 'released';
  if (status === 'cancelado') return 'refunded';
  return 'held';
}

function ReceiptsOverview({
  items,
  model,
  isLoading,
}: {
  items: Agendamento[];
  model: StudioSplitModel;
  isLoading?: boolean;
}) {
  const { t } = useI18n();

  const summary = useMemo(() => {
    let gross = 0;
    let held = 0;
    let released = 0;
    let secured = 0;
    for (const item of items) {
      const value = typeof item.valor_total === 'number' && Number.isFinite(item.valor_total) ? item.valor_total : 0;
      const split = calculateSplits(value, model);
      const escrow = escrowStateFor(item.status);
      gross += value;
      if (escrow === 'released') released += split.tatuador;
      else held += split.tatuador;
      if (escrow !== 'refunded') secured += depositAmount(value);
    }
    return { gross, held, released, secured };
  }, [items, model]);

  if (isLoading) {
    return (
      <div className="min-w-0 w-full space-y-3" aria-hidden>
        <Skeleton className="h-[122px] w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-[100px] rounded-2xl" />
          <Skeleton className="h-[100px] rounded-2xl" />
        </div>
        <Skeleton className="h-[64px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full space-y-3">
      <GlassContainer className="relative min-h-[122px] w-full overflow-hidden p-4">
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400 dark:text-zinc-500">
            <Lock className="h-3.5 w-3.5" strokeWidth={2} />
            {t('payments.receivable')}
          </span>
          <span className="flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 dark:text-orange-400">
            <BarChart3 className="h-4 w-4" strokeWidth={1.9} />
          </span>
        </div>
        <p className="mt-2 truncate text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
          {formatBRL(summary.held)}
        </p>
        <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-zinc-400">
          {t('payments.receiptsHeld')} · {t('payments.receiptsGross')} {formatBRL(summary.gross)}
        </p>
      </GlassContainer>

      <div className="grid grid-cols-2 gap-3">
        <GlassContainer className="min-h-[100px] min-w-0 p-3">
          <span className="flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.9} />
          </span>
          <p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-zinc-500">
            {t('payments.depositsSecured')}
          </p>
          <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-gray-900 dark:text-white">
            {formatBRL(summary.secured)}
          </p>
        </GlassContainer>
        <GlassContainer className="min-h-[100px] min-w-0 p-3">
          <span className="flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
            <Unlock className="h-4 w-4" strokeWidth={1.9} />
          </span>
          <p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-zinc-500">
            {t('payments.receiptsReleased')}
          </p>
          <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-gray-900 dark:text-white">
            {formatBRL(summary.released)}
          </p>
        </GlassContainer>
      </div>

      <div className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-black/[0.04] bg-black/[0.02] px-4 py-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
        <span className="flex h-9 w-9 min-h-9 min-w-9 shrink-0 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 dark:text-orange-400">
          <Ticket className="h-4 w-4" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
            TattooGo Pass
          </p>
          <p className="mt-0.5 truncate text-[11px] leading-relaxed text-neutral-500 dark:text-zinc-500">
            {t('pass.subtitle')}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReceiptCard({ agendamento, model }: { agendamento: Agendamento; model: StudioSplitModel }) {
  const { t } = useI18n();
  const tone = resolveTone(agendamento.status);
  const Icon = tone.icon;
  const value = typeof agendamento.valor_total === 'number' && Number.isFinite(agendamento.valor_total) ? agendamento.valor_total : 0;
  const split = calculateSplits(value, model);
  const escrow = escrowStateFor(agendamento.status);
  const escrowLabel =
    escrow === 'released'
      ? t('payments.receiptsReleased')
      : escrow === 'refunded'
        ? t('agenda.statusCanceled')
        : t('payments.receiptsHeld');
  const escrowTone =
    escrow === 'released'
      ? 'text-emerald-600 dark:text-emerald-400'
      : escrow === 'refunded'
        ? 'text-zinc-500 dark:text-zinc-400'
        : 'text-amber-600 dark:text-amber-400';

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

        <div className="mt-2 grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-zinc-500">
              {t('payments.receiptsGross')}
            </p>
            <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-gray-900 dark:text-white">
              {formatBRL(value)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-zinc-500">
              {t('role.tatuador.label')}
            </p>
            <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-gray-900 dark:text-white">
              {formatBRL(split.tatuador)}
            </p>
          </div>
        </div>

        <p className={cn('mt-3 inline-flex items-center gap-1.5 text-xs font-semibold', escrowTone)}>
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
          {escrowLabel}
        </p>
      </div>
    </GlassContainer>
  );
}

export function PaymentsPanel({ role }: { role: AppRole }) {
  const { t } = useI18n();
  const { data, isLoading } = useAgendamentos();
  const [overrides, setOverrides] = useState<Record<string, AgendaStatus>>({});

  const isStudio = role !== 'cliente';
  const experience = getRoleExperience(role).dashboard;
  const model = receiptModelForRole(role);

  const items = useMemo(() => data ?? [], [data]);
  const tracked = useMemo(
    () =>
      items.filter((item) => {
        const status = overrides[item.id] ?? item.status;
        return PAYMENT_JOURNEY_STATUSES.includes(status);
      }),
    [items, overrides]
  );
  const receipts = useMemo(
    () => items.filter((item) => RECEIPT_STATUSES.includes(item.status)),
    [items]
  );

  const handleSigned = useCallback((id: string) => {
    setOverrides((prev) => ({ ...prev, [id]: 'aguardando_sinal' }));
  }, []);

  const handlePaid = useCallback((id: string) => {
    setOverrides((prev) => ({ ...prev, [id]: 'confirmado' }));
  }, []);

  const emptyState = (
    <GlassContainer className="border-dashed p-6 text-center">
      <Wallet className="mx-auto h-6 w-6 text-orange-500 dark:text-orange-400" strokeWidth={1.75} />
      <p className="mt-3 text-sm font-medium text-neutral-600 dark:text-zinc-300">
        {t(isStudio ? 'payments.emptyReceipts' : 'payments.empty')}
      </p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">
        {t(isStudio ? 'payments.emptyReceiptsHint' : 'payments.emptyHint')}
      </p>
    </GlassContainer>
  );

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-6">
      <header className="relative min-w-0 w-full shrink-0 overflow-hidden rounded-3xl border border-black/[0.04] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500 dark:text-orange-400">
          {BRAND_NAME}
        </p>
        <h1 className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
          {isStudio ? t('payments.tabStudio') : t('payments.title')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-zinc-400">
          {isStudio ? t(experience.subtitle) : t('payments.subtitle')}
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 dark:text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} />
          {t('payments.secureNote', { brand: BRAND_NAME })}
        </p>
      </header>

      {isStudio ? (
        <>
          <ReceiptsOverview items={receipts} model={model} isLoading={isLoading} />
          {isLoading ? <PaymentsSkeleton /> : receipts.length === 0 ? emptyState : (
            <div className="space-y-4">
              {receipts.map((agendamento) => (
                <ReceiptCard key={agendamento.id} agendamento={agendamento} model={model} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <JourneyStepper />
          {isLoading ? <PaymentsSkeleton /> : tracked.length === 0 ? emptyState : (
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
        </>
      )}
    </div>
  );
}

export function PaymentsHub() {
  const { t } = useI18n();
  const router = useRouter();
  const role = useAuthStore((s) => s.role) ?? 'cliente';
  const isClient = role === 'cliente';
  const agendaLabel = isClient ? t('agenda.tabClient') : t('agenda.tabStudio');
  const paymentsLabel = isClient ? t('payments.tabClient') : t('payments.tabStudio');

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-6 pt-5">
      <SegmentedControl
        options={[
          { value: 'agenda', label: agendaLabel },
          { value: 'payments', label: paymentsLabel },
        ]}
        value="payments"
        onChange={(value) => {
          if (value === 'agenda') {
            router.push(`${dashboardPathForRole(role)}?tab=agendar`);
          }
        }}
        ariaLabel={agendaLabel}
      />

      <PaymentsPanel role={role} />
    </div>
  );
}
