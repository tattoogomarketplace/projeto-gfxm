'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { getPendingArtistQuotes } from '@/app/actions/quote';
import { ArtistQuoteReviewDrawer } from '@/components/features/artist-quote-review-drawer';
import { GlassContainer } from '@/components/ui/glass-container';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Skeleton } from '@/components/ui/skeleton';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { portfolioLabelResolver } from '@/lib/portfolio-metadata';
import { formatWhen } from '@/lib/utils/agenda-status';
import type { ArtistQuoteReview } from '@/lib/types/artist-quote';

function QuoteInboxSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="h-4 w-24 rounded-lg" />
      <Skeleton className="h-[96px] w-full rounded-2xl" />
      <Skeleton className="h-[96px] w-full rounded-2xl" />
    </div>
  );
}

export function ArtistQuoteInbox() {
  const { t } = useI18n();
  const { bodyPartLabel } = portfolioLabelResolver(t);
  const { triggerHaptic } = useHapticFeedback();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [quotes, setQuotes] = useState<ArtistQuoteReview[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<ArtistQuoteReview | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        const next = await getPendingArtistQuotes();
        if (!cancelled) setQuotes(next);
      } catch {
        if (!cancelled) setQuotes([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [startTransition]);

  return (
    <section className="min-w-0 w-full space-y-3">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400 dark:text-zinc-500">
        {t('quote.pending')}
      </p>
      {!loaded ? (
        <QuoteInboxSkeleton />
      ) : quotes.length === 0 ? (
        <GlassContainer className="border-dashed p-5 text-center">
          <FileText
            className="mx-auto h-5 w-5 text-orange-500 dark:text-orange-400"
            strokeWidth={1.75}
          />
          <p className="mt-2 text-sm font-medium text-neutral-600 dark:text-zinc-300">
            {t('quote.empty')}
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">{t('quote.emptyHint')}</p>
        </GlassContainer>
      ) : (
        <ul className="min-w-0 w-full space-y-3">
          {quotes.map((quote) => (
            <li key={quote.id} className="min-w-0 w-full">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSelected(quote);
                }}
                className="flex min-h-11 w-full flex-col gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/[0.06] px-4 py-3 text-left transition-transform active:scale-[0.99]"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    {quote.referenceImage ? (
                      <span className="relative h-11 w-11 min-h-11 min-w-11 shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                        <OptimizedImage
                          src={quote.referenceImage}
                          alt=""
                          className="h-full w-full"
                        />
                      </span>
                    ) : null}
                    <span className="truncate text-sm font-semibold tracking-tight text-zinc-100">
                      {quote.clientName}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center rounded-full border border-orange-500/60 bg-orange-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-400">
                    {t('quote.actionNeeded')}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                  <span className="truncate">
                    {quote.bodyPart ? bodyPartLabel(quote.bodyPart) : t('portfolio.bodyPart')}
                    {quote.estimatedSize ? ` · ${quote.estimatedSize}` : ''}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatWhen(quote.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ArtistQuoteReviewDrawer
        open={Boolean(selected)}
        quote={selected}
        onClose={() => setSelected(null)}
        onApproved={(quoteId) => {
          setQuotes((current) => current.filter((item) => item.id !== quoteId));
          setSelected(null);
          void queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
          router.refresh();
        }}
      />
    </section>
  );
}
