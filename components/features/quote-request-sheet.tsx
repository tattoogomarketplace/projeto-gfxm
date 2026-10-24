'use client';

import { useTransition } from 'react';
import { ImagePlus } from 'lucide-react';
import { createQuoteRequest } from '@/app/actions/quote';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useI18n } from '@/hooks/use-i18n';
import { toast } from '@/lib/toast';
import { PORTFOLIO_BODY_PARTS, portfolioLabelResolver } from '@/lib/portfolio-metadata';

export type QuoteRequestSheetProps = {
  open: boolean;
  artistId: string;
  onClose: () => void;
  onSuccess: (result: { quoteId: string; chatId: string; artistId: string }) => void;
};

export function QuoteRequestSheet({
  open,
  artistId,
  onClose,
  onSuccess,
}: QuoteRequestSheetProps) {
  const { t } = useI18n();
  const { bodyPartLabel } = portfolioLabelResolver(t);
  const [isPending, startTransition] = useTransition();

  const handleAction = (formData: FormData) => {
    if (isPending) return;
    startTransition(async () => {
      try {
        const result = await createQuoteRequest(formData);
        onSuccess(result);
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
        aria-label={t('vitrine.requestQuote')}
      >
        <DrawerHeader className="px-6 pt-4 text-center">
          <DrawerTitle className="text-[17px] font-semibold tracking-tight text-zinc-100">
            {t('vitrine.requestQuote')}
          </DrawerTitle>
        </DrawerHeader>

        <DrawerBody className="px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
          <form className="mt-1 flex flex-col gap-4" action={handleAction}>
            <input type="hidden" name="artistId" value={artistId} />
            <label className="flex flex-col gap-2">
              <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                {t('portfolio.bodyPart')}
              </span>
              <select
                name="bodyPart"
                required
                defaultValue=""
                disabled={isPending}
                className="min-h-12 w-full appearance-none rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 text-[15px] text-zinc-100 outline-none focus:border-orange-500/50 disabled:opacity-60"
              >
                <option value="" disabled>
                  {t('portfolio.bodyPart')}
                </option>
                {PORTFOLIO_BODY_PARTS.map((part) => (
                  <option key={part} value={part}>
                    {bodyPartLabel(part)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                {t('vitrine.estimatedSize')}
              </span>
              <input
                name="estimatedSize"
                type="text"
                required
                maxLength={40}
                inputMode="text"
                autoComplete="off"
                disabled={isPending}
                placeholder={t('vitrine.estimatedSizePlaceholder')}
                className="min-h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 text-[15px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-500/50 disabled:opacity-60"
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                {t('vitrine.referenceImage')}
              </span>
              <div className="flex min-h-[8.5rem] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/40">
                <ImagePlus className="mb-2 h-6 w-6 text-zinc-500" strokeWidth={1.75} />
                <span className="text-sm font-medium text-zinc-500">
                  {t('vitrine.referenceImage')}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              aria-busy={isPending}
              className="relative mt-2 flex min-h-12 w-full items-center justify-center rounded-2xl bg-orange-500 px-4 text-[15px] font-semibold text-white transition-transform active:scale-[0.98] disabled:pointer-events-none disabled:opacity-80"
            >
              <span className={isPending ? 'invisible' : undefined}>
                {t('vitrine.sendToArtist')}
              </span>
              <span
                className={`absolute inset-0 inline-flex items-center justify-center gap-2 ${isPending ? '' : 'invisible'}`}
              >
                <span
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 animate-pulse rounded-full bg-white/90"
                />
                {t('vitrine.sendingQuote')}
              </span>
            </button>
          </form>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
