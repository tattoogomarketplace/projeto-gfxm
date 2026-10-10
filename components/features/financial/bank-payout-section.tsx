'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import {
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  Landmark,
  Loader2,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { GlassContainer } from '@/components/ui/glass-container';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from '@/lib/toast';
import { formatBRL } from '@/lib/utils/agenda-status';
import { cn } from '@/lib/utils';

export interface LinkedBankAccount {
  bankName: string;
  last4: string;
}

const SIMULATED_BANK: LinkedBankAccount = { bankName: 'Nubank', last4: '1234' };
const ONBOARDING_DELAY_MS = 900;
const WITHDRAW_DELAY_MS = 1400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function readLinkedBank(value: unknown): LinkedBankAccount | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const digits = typeof record.last4 === 'string' ? record.last4.replace(/\D/g, '') : '';
  if (!digits) return null;
  const bankName =
    typeof record.bankName === 'string' && record.bankName.trim()
      ? record.bankName.trim()
      : 'Nubank';
  return { bankName, last4: digits.slice(-4) };
}

export function BankPayoutSection({
  available,
  onWithdraw,
}: {
  available: number;
  onWithdraw: (amount: number) => void;
}) {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const { user } = useUser();

  const metadataBank = useMemo(() => {
    const metadata = (user?.unsafeMetadata ?? user?.publicMetadata ?? {}) as Record<string, unknown>;
    return readLinkedBank(metadata.bank_account);
  }, [user]);

  const [simulatedBank, setSimulatedBank] = useState<LinkedBankAccount | null>(null);
  const bank = simulatedBank ?? metadataBank;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [isConnecting, startConnect] = useTransition();
  const [isWithdrawing, startWithdraw] = useTransition();

  const normalizedAvailable = Number.isFinite(available) && available > 0 ? available : 0;
  const hasBalance = normalizedAvailable > 0;
  const canWithdraw = bank !== null && hasBalance && !isWithdrawing;

  const handleConnect = useCallback(() => {
    if (isConnecting || bank) return;
    triggerHaptic('medium');
    startConnect(async () => {
      await delay(ONBOARDING_DELAY_MS);
      setSimulatedBank(SIMULATED_BANK);
      triggerHaptic('success');
      toast.success(t('payments.bankConnectSuccess'), {
        description: t('payments.bankConnectSuccessHint'),
      });
    });
  }, [bank, isConnecting, startConnect, t, triggerHaptic]);

  const openSheet = useCallback(() => {
    if (!canWithdraw) return;
    triggerHaptic('light');
    setSheetOpen(true);
  }, [canWithdraw, triggerHaptic]);

  const closeSheet = useCallback(() => {
    if (isWithdrawing) return;
    setSheetOpen(false);
  }, [isWithdrawing]);

  const confirmWithdraw = useCallback(() => {
    if (!canWithdraw) return;
    triggerHaptic('medium');
    startWithdraw(async () => {
      await delay(WITHDRAW_DELAY_MS);
      triggerHaptic('success');
      toast.success(t('payments.withdrawSuccess'), {
        description: t('payments.withdrawSuccessHint'),
      });
      onWithdraw(normalizedAvailable);
      setSheetOpen(false);
    });
  }, [canWithdraw, normalizedAvailable, onWithdraw, startWithdraw, t, triggerHaptic]);

  const withdrawHint = !bank
    ? t('payments.withdrawNeedsBank')
    : hasBalance
      ? t('payments.withdrawArrivalValue')
      : t('payments.withdrawNoBalance');

  return (
    <div className="min-w-0 w-full space-y-3">
      <GlassContainer className="relative w-full overflow-hidden p-4">
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400 dark:text-zinc-500">
            <Landmark className="h-3.5 w-3.5" strokeWidth={2} />
            {t('payments.bankTitle')}
          </span>
          {bank ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              <BadgeCheck className="h-3 w-3" strokeWidth={2.2} />
              {t('payments.bankConnected')}
            </span>
          ) : null}
        </div>

        <div className="mt-3">
          {bank ? (
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-orange-500 text-sm font-bold text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)]">
                {bank.bankName.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
                  {bank.bankName}
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-neutral-500 dark:text-zinc-400">
                  •••• {bank.last4}
                </p>
              </div>
              <CheckCircle2
                className="h-5 w-5 shrink-0 text-emerald-500 dark:text-emerald-400"
                strokeWidth={2}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-neutral-500 dark:text-zinc-400">
                {t('payments.bankNotConnectedHint')}
              </p>
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="apple-press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 text-sm font-semibold text-orange-600 transition-all hover:brightness-110 disabled:opacity-60 dark:text-orange-300"
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
                ) : (
                  <Landmark className="h-4 w-4" strokeWidth={2} />
                )}
                {isConnecting ? t('payments.withdrawProcessing') : t('payments.connectBank')}
              </button>
              <p className="inline-flex items-center gap-1.5 text-[10px] font-medium text-neutral-400 dark:text-zinc-500">
                <Lock className="h-3 w-3" strokeWidth={2} />
                {t('payments.connectBankHint')}
              </p>
            </div>
          )}
        </div>
      </GlassContainer>

      <div className="space-y-2">
        <button
          type="button"
          onClick={openSheet}
          disabled={!canWithdraw}
          className={cn(
            'apple-press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-all',
            canWithdraw
              ? 'bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-[0_0_18px_rgba(249,115,22,0.35)] hover:from-orange-400 hover:to-orange-600'
              : 'cursor-not-allowed border border-black/[0.04] bg-black/[0.03] text-neutral-400 dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-zinc-500'
          )}
        >
          <ArrowUpRight className="h-4 w-4" strokeWidth={2.4} />
          {t('payments.withdraw')}
        </button>
        <p className="inline-flex w-full items-center justify-center gap-1.5 text-center text-[11px] font-medium text-neutral-500 dark:text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} />
          {withdrawHint}
        </p>
      </div>

      <AnimatePresence>
        {sheetOpen && bank ? (
          <motion.div
            key="withdraw-sheet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeSheet}
            role="dialog"
            aria-modal="true"
            aria-label={t('payments.withdrawTitle')}
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center"
          >
            <motion.div
              initial={{ y: 48, opacity: 0.6, scale: 0.99 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 48, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 34, mass: 0.9 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-5 shadow-2xl dark:border-white/[0.08] dark:bg-[#141414]"
            >
              <span
                aria-hidden
                className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-black/10 dark:bg-white/15"
              />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-500 dark:text-orange-400">
                    {t('payments.withdraw')}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                    {t('payments.withdrawTitle')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeSheet}
                  disabled={isWithdrawing}
                  aria-label={t('common.close')}
                  className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-black/[0.04] text-neutral-500 transition-colors hover:border-orange-500/40 hover:text-orange-500 disabled:opacity-50 dark:border-white/[0.05] dark:text-zinc-400"
                >
                  <X className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-500/[0.06] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-zinc-500">
                  {t('payments.withdrawAmount')}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
                  {formatBRL(normalizedAvailable)}
                </p>
              </div>

              <dl className="mt-3 divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                <div className="flex items-center justify-between gap-3 py-3">
                  <dt className="shrink-0 text-xs text-neutral-500 dark:text-zinc-400">
                    {t('payments.withdrawDestination')}
                  </dt>
                  <dd className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {bank.bankName} •••• {bank.last4}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-3">
                  <dt className="shrink-0 text-xs text-neutral-500 dark:text-zinc-400">
                    {t('payments.withdrawArrival')}
                  </dt>
                  <dd className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                    {t('payments.withdrawArrivalValue')}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={confirmWithdraw}
                disabled={isWithdrawing}
                className="apple-press mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-orange-500 to-orange-600 px-4 text-sm font-bold text-white shadow-[0_0_18px_rgba(249,115,22,0.35)] transition-all hover:from-orange-400 hover:to-orange-600 disabled:opacity-70"
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
                    {t('payments.withdrawProcessing')}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" strokeWidth={2} />
                    {t('payments.withdrawConfirm')}
                  </>
                )}
              </button>

              <p className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-center text-[10px] font-medium text-neutral-400 dark:text-zinc-500">
                <Lock className="h-3 w-3" strokeWidth={2} />
                {t('payments.bankSecure')}
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
