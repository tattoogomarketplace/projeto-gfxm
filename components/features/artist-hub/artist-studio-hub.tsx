'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { FlashNotesCarousel } from '@/components/chat/flash-notes-carousel';
import { PortfolioUpload } from '@/components/features/portfolio-upload';
import { Skeleton } from '@/components/ui/skeleton';
import { HubActivityFeed } from '@/components/features/artist-hub/hub-activity-feed';
import { HubQuickAccess } from '@/components/features/artist-hub/hub-quick-access';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';

type HubView = 'hub' | 'portfolio';

/**
 * STUDIO HUB — orquestrador da aba "Início" do tatuador.
 *
 * Reconstroi a entrada profissional num painel central nativo (padrão
 * Instagram/Uber): Flash Notes no topo, bento-box de acesso rápido
 * glassmórfico e feed de atividade do estúdio. A navegação entre o hub e o
 * portfólio (masonry da Fase 8) usa `useTransition` para manter o frame atual
 * pintado até o próximo estar pronto — zero layout shifting. "Gestão de Ganhos"
 * roteia para o workspace financeiro existente (`/dashboard/pagamentos`).
 */
export function ArtistStudioHub({
  tatuadorId,
  artistName = '',
}: {
  tatuadorId?: string;
  artistName?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const [view, setView] = useState<HubView>('hub');
  const [, startTransition] = useTransition();

  const openPortfolio = useCallback(() => {
    startTransition(() => setView('portfolio'));
  }, []);

  const backToHub = useCallback(() => {
    triggerHaptic('light');
    startTransition(() => setView('hub'));
  }, [triggerHaptic]);

  const openEarnings = useCallback(() => {
    router.push('/dashboard/pagamentos');
  }, [router]);

  if (view === 'portfolio') {
    return (
      <div className="min-w-0 w-full space-y-4">
        <header className="flex items-start gap-3">
          <button
            type="button"
            onClick={backToHub}
            aria-label={t('hub.backHome')}
            className="flex h-11 w-11 min-h-11 min-w-11 shrink-0 transform-gpu items-center justify-center rounded-xl border border-black/[0.04] bg-white/[0.03] text-gray-900 backdrop-blur-xl transition-transform duration-150 active:scale-95 dark:border-white/[0.05] dark:text-white"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.portfolio')}</h1>
            <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-400">
              {t('dashboard.portfolioSubtitle')}
            </p>
          </div>
        </header>

        {tatuadorId ? (
          <PortfolioUpload tatuadorId={tatuadorId} artistName={artistName} />
        ) : (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-full flex-col gap-6">
      <FlashNotesCarousel />
      <HubQuickAccess onOpenPortfolio={openPortfolio} onOpenEarnings={openEarnings} />
      <HubActivityFeed />
    </div>
  );
}

export default ArtistStudioHub;
