'use client';

import { useCallback, useState, type ReactNode } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  ScanLine,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { GlassContainer } from '@/components/ui/glass-container';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/lib/toast';
import { TattooOTPVerification } from '@/components/features/tattoo-otp';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { getRoleExperience } from '@/lib/content/role-experience';
import {
  DEPOSIT_LABEL_KEY,
  depositAmount,
  formatBRL,
  formatWhen,
  groupStudioRoster,
  isSessionToday,
  resolveDepositState,
  type DepositVisualState,
} from '@/lib/utils/agenda-status';
import { cn } from '@/lib/utils';
import type { MessageKey } from '@/lib/i18n/types';
import type { AppRole } from '@/lib/utils/auth-redirect';
import type { Agendamento } from '@/lib/types/database';

type DepositTone = {
  readonly pill: string;
  readonly accent: string;
  readonly icon: typeof ShieldCheck;
};

const DEPOSIT_TONES: Record<DepositVisualState, DepositTone> = {
  held: {
    pill: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    accent: 'from-emerald-500 to-teal-500',
    icon: ShieldCheck,
  },
  paid: {
    pill: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300',
    accent: 'from-emerald-400 to-emerald-600',
    icon: CheckCircle2,
  },
  awaiting: {
    pill: 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300',
    accent: 'from-amber-500 to-orange-500',
    icon: Clock3,
  },
  canceled: {
    pill: 'border-zinc-400/30 bg-zinc-400/10 text-zinc-500 dark:text-zinc-400',
    accent: 'from-zinc-400 to-zinc-500',
    icon: XCircle,
  },
};

function StudioAgendaSkeleton() {
  return (
    <div className="min-w-0 w-full flex-1 space-y-6" aria-hidden>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24 rounded-lg" />
        <Skeleton className="h-[116px] w-full rounded-2xl" />
        <Skeleton className="h-[116px] w-full rounded-2xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24 rounded-lg" />
        <Skeleton className="h-[116px] w-full rounded-2xl" />
      </div>
    </div>
  );
}

function DepositPill({ state, labelKey }: { state: DepositVisualState; labelKey: MessageKey }) {
  const { t } = useI18n();
  const tone = DEPOSIT_TONES[state];
  const Icon = tone.icon;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
        tone.pill
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {t(labelKey)}
    </span>
  );
}

function SessionTokenSheet({
  open,
  panelId,
  onValidated,
}: {
  open: boolean;
  panelId: string;
  onValidated: () => void;
}) {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();

  const handleVerify = useCallback(
    async (code: string) => {
      if (code.trim().length !== 6) return false;
      triggerHaptic('medium');
      return true;
    },
    [triggerHaptic]
  );

  return (
    <div
      id={panelId}
      className={cn(
        'grid transition-[grid-template-rows] duration-300 ease-out',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="mt-4 space-y-3 border-t border-black/[0.04] pt-4 dark:border-white/[0.05]">
          <p className="flex items-center justify-center gap-1.5 text-center text-xs leading-relaxed text-neutral-500 dark:text-zinc-400">
            <ScanLine className="h-4 w-4 shrink-0 text-orange-500 dark:text-orange-400" strokeWidth={2} />
            {t('agenda.tokenSheetHint')}
          </p>
          <TattooOTPVerification
            onVerify={handleVerify}
            onSuccess={() => {
              triggerHaptic('success');
              toast.success(t('agenda.statusConfirmed'));
              onValidated();
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StudioSessionCard({ agendamento }: { agendamento: Agendamento }) {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const depositState = resolveDepositState(agendamento);
  const tone = DEPOSIT_TONES[depositState];
  const canValidate = isSessionToday(agendamento.data_hora) && depositState !== 'canceled';
  const [open, setOpen] = useState(false);
  const panelId = `studio-token-${agendamento.id}`;

  const toggleToken = useCallback(() => {
    triggerHaptic('light');
    setOpen((prev) => !prev);
  }, [triggerHaptic]);

  return (
    <GlassContainer className="relative w-full overflow-hidden p-4">
      <span
        aria-hidden
        className={cn('absolute left-0 top-0 h-full w-1 bg-gradient-to-b', tone.accent)}
      />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-3">
          <DepositPill state={depositState} labelKey={DEPOSIT_LABEL_KEY[depositState]} />
          <span className="shrink-0 text-xs font-medium text-neutral-500 dark:text-zinc-400">
            {formatWhen(agendamento.data_hora)}
          </span>
        </div>

        <p className="mt-3 truncate text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
          {t('dashboard.clientId', {
            id: (agendamento.cliente_id ?? '').slice(0, 8) || '—',
          })}
        </p>
        <div className="mt-0.5 flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-500 dark:text-zinc-400">
            {formatBRL(agendamento.valor_total)}
          </p>
          <p className="text-[11px] font-medium tabular-nums text-neutral-400 dark:text-zinc-500">
            {t('payments.depositLabel')}: {formatBRL(depositAmount(agendamento.valor_total))}
          </p>
        </div>

        {canValidate ? (
          <button
            type="button"
            onClick={toggleToken}
            aria-expanded={open}
            aria-controls={panelId}
            className="apple-press mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 text-sm font-semibold text-orange-600 hover:brightness-110 dark:text-orange-300"
          >
            <ScanLine className="h-4 w-4" strokeWidth={2} />
            {t('agenda.validateSession')}
          </button>
        ) : null}

        <SessionTokenSheet
          open={open}
          panelId={panelId}
          onValidated={() => setOpen(false)}
        />
      </div>
    </GlassContainer>
  );
}

function RosterSection({
  titleKey,
  items,
}: {
  titleKey: MessageKey;
  items: Agendamento[];
}) {
  const { t } = useI18n();
  if (items.length === 0) return null;
  return (
    <section className="min-w-0 w-full space-y-3">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400 dark:text-zinc-500">
        {t(titleKey)}
      </p>
      <ul className="min-w-0 w-full space-y-3">
        {items.map((agendamento, index) => (
          <li key={agendamento.id ?? `agendamento-${index}`} className="min-w-0 w-full">
            <StudioSessionCard agendamento={agendamento} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Agenda do Estúdio — leitura operacional para tatuadores e estúdios.
 *
 * Roster fluido `Hoje` e `Próximos` com selo financeiro do sinal (retido/pago
 * em esmeralda, aguardando em âmbar) e CTA de validação via token nos
 * agendamentos do dia (preparação para o TattooGo Pass). Compartilha a
 * geometria rígida da timeline do cliente (`flex-1`, `min-h-0`) para que a
 * troca de papel e a resolução de dados nunca movam o layout.
 */
export function StudioAgendaView({
  role,
  agendamentos,
  isLoading,
}: {
  role: AppRole;
  agendamentos?: Agendamento[];
  isLoading?: boolean;
}): ReactNode {
  const { t } = useI18n();
  const experience = getRoleExperience(role).dashboard;
  const roster = groupStudioRoster(agendamentos);
  const isEmpty = roster.today.length === 0 && roster.upcoming.length === 0;

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-start gap-3">
        <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.22)] dark:text-orange-400">
          <CalendarClock className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            {t(experience.heading)}
          </h2>
          <p className="mt-0.5 text-sm text-neutral-600 dark:text-zinc-400">
            {t(experience.subtitle)}
          </p>
        </div>
      </div>

      {isLoading ? (
        <StudioAgendaSkeleton />
      ) : isEmpty ? (
        <GlassContainer className="border-dashed p-6 text-center">
          <CalendarClock
            className="mx-auto h-6 w-6 text-orange-500 dark:text-orange-400"
            strokeWidth={1.75}
          />
          <p className="mt-3 text-sm font-medium text-neutral-600 dark:text-zinc-300">
            {t('agenda.empty')}
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">{t('agenda.emptyHint')}</p>
        </GlassContainer>
      ) : (
        <div className="min-w-0 w-full flex-1 space-y-6">
          <RosterSection titleKey="agenda.today" items={roster.today} />
          <RosterSection titleKey="agenda.upcoming" items={roster.upcoming} />
        </div>
      )}
    </div>
  );
}
