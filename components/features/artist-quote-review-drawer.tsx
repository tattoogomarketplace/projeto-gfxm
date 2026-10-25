'use client';

import { useMemo, useState, useTransition } from 'react';
import { ImagePlus } from 'lucide-react';
import { approveArtistQuote } from '@/app/actions/quote';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from '@/lib/toast';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';
import { depositAmount, formatBRL } from '@/lib/utils/agenda-status';
import type { ArtistQuoteReview } from '@/lib/types/artist-quote';

export type ArtistQuoteReviewDrawerProps = {
  open: boolean;
  quote: ArtistQuoteReview | null;
  onClose: () => void;
  onApproved: (quoteId: string) => void;
};

function parseMoneyInput(raw: string): number {
  const trimmed = raw.trim().replace(/\s/g, '');
  if (!trimmed) return Number.NaN;
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed.replace(/[^\d.]/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : Number.NaN;
}

function ArtistQuoteReviewForm({
  quote,
  isPending,
  onApprove,
}: {
  quote: ArtistQuoteReview;
  isPending: boolean;
  onApprove: (totalValue: number) => void;
}) {
  const { t } = useI18n();
  const { bodyPartLabel } = portfolioLabelResolver(t);
  const [totalRaw, setTotalRaw] = useState('');

  const totalValue = useMemo(() => parseMoneyInput(totalRaw), [totalRaw]);
  const depositValue = Number.isFinite(totalValue) && totalValue > 0 ? depositAmount(totalValue) : 0;
  const canSubmit = Number.isFinite(totalValue) && totalValue > 0 && !isPending;

  const submit = () => {
    if (!canSubmit) return;
    onApprove(totalValue);
  };

  return (
    <>
      <DrawerBody className="px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-1 gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[12px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                {t('quote.client')}
              </dt>
              <dd className="truncate text-sm font-semibold text-zinc-100">{quote.clientName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[12px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                {t('portfolio.bodyPart')}
              </dt>
              <dd className="truncate text-sm font-semibold text-zinc-100">
                {quote.bodyPart ? bodyPartLabel(quote.bodyPart) : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[12px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                {t('vitrine.estimatedSize')}
              </dt>
              <dd className="truncate text-sm font-semibold tabular-nums text-zinc-100">
                {quote.estimatedSize || '—'}
              </dd>
            </div>
            {quote.priceRange ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[12px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  {t('quote.totalValue')}
                </dt>
                <dd className="truncate text-sm font-semibold tabular-nums text-zinc-100">
                  {quote.priceRange}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              {t('vitrine.referenceImage')}
            </span>
            {quote.referenceImage ? (
              <div className="relative h-40 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                <OptimizedImage
                  src={quote.referenceImage}
                  alt={t('vitrine.referenceImage')}
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="flex min-h-[8.5rem] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/40">
                <ImagePlus className="mb-2 h-6 w-6 text-zinc-500" strokeWidth={1.75} />
                <span className="text-sm font-medium text-zinc-500">
                  {t('vitrine.referenceImage')}
                </span>
              </div>
            )}
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              {t('quote.totalValue')}
            </span>
            <span className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[15px] font-semibold text-zinc-500">
                R$
              </span>
              <input
                name="totalValue"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                enterKeyHint="done"
                disabled={isPending}
                value={totalRaw}
                onChange={(event) => setTotalRaw(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    submit();
                  }
                }}
                placeholder="0,00"
                className="min-h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900/70 py-3 pl-12 pr-4 text-[15px] tabular-nums text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-500/50 disabled:opacity-60"
              />
            </span>
          </label>

          <div
            aria-live="polite"
            className="flex min-h-11 items-center justify-between rounded-xl bg-zinc-950 p-3"
          >
            <span className="text-[12px] font-medium text-zinc-400">{t('quote.depositHint')}</span>
            <span className="text-sm font-bold tabular-nums text-orange-400">
              {formatBRL(depositValue)}
            </span>
          </div>
        </div>
      </DrawerBody>

      <DrawerFooter className="px-6">
        <button
          type="button"
          disabled={!canSubmit}
          aria-busy={isPending}
          onClick={submit}
          className="relative flex min-h-12 w-full items-center justify-center rounded-2xl bg-orange-500 px-4 text-[15px] font-semibold text-white transition-transform active:scale-[0.98] disabled:pointer-events-none disabled:opacity-80"
        >
          <span className={isPending ? 'invisible' : undefined}>{t('quote.approve')}</span>
          <span
            className={`absolute inset-0 inline-flex items-center justify-center gap-2 ${isPending ? '' : 'invisible'}`}
          >
            <span
              aria-hidden
              className="h-3.5 w-3.5 shrink-0 animate-pulse rounded-full bg-white/90"
            />
            {t('quote.approving')}
          </span>
        </button>
      </DrawerFooter>
    </>
  );
}

export function ArtistQuoteReviewDrawer({
  open,
  quote,
  onClose,
  onApproved,
}: ArtistQuoteReviewDrawerProps) {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const [isPending, startTransition] = useTransition();

  const handleApprove = (totalValue: number) => {
    if (!quote) return;
    triggerHaptic('medium');
    startTransition(async () => {
      try {
        await approveArtistQuote({ quoteId: quote.id, totalValue });
        toast.success(t('quote.sent'));
        onApproved(quote.id);
      } catch (error) {
        toast.error(error);
      }
    });
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isPending) onClose();
      }}
      dismissible={!isPending}
    >
      <DrawerContent
        overlayClassName="z-[140]"
        className="z-[141] mt-24 h-auto max-h-[100dvh]"
        aria-busy={isPending}
        aria-label={t('quote.reviewTitle')}
      >
        <DrawerHeader className="px-6 pt-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-500">
            {t('quote.actionNeeded')}
          </p>
          <DrawerTitle className="mt-1 text-[17px] font-semibold tracking-tight text-zinc-100">
            {t('quote.reviewTitle')}
          </DrawerTitle>
          {quote ? (
            <DrawerDescription className="mt-1 truncate text-[13px] text-zinc-500">
              {quote.clientName}
            </DrawerDescription>
          ) : null}
        </DrawerHeader>

        {quote ? (
          <ArtistQuoteReviewForm
            key={quote.id}
            quote={quote}
            isPending={isPending}
            onApprove={handleApprove}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
