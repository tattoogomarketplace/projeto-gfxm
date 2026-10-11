'use client';

import type { ReactNode } from 'react';
import { History } from 'lucide-react';
import { GlassContainer } from '@/components/ui/glass-container';
import { ReceiptCard } from '@/components/features/receipt-card';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';
import { MOCK_CLIENT_HISTORY } from '@/lib/mocks/client-history';
import type { ClientHistorySession } from '@/lib/types/client-agenda';

/**
 * ClientHistoryList — o "Livro-Caixa Visual" do cliente.
 *
 * Seção arquivada renderizada abaixo da sessão ativa: agrupa os comprovantes de
 * sessões encerradas em cartões `ReceiptCard` de estética "Archived Premium"
 * (acento dessaturado, contraste reduzido). Herda a rolagem nativa suave do
 * casco (`overflow-y-auto overscroll-none`) sem criar scroll aninhado, sem
 * quebrar o `h-[100dvh]` e sem vazar overscroll para o `body`.
 *
 * Presentacional: recebe as sessões por prop e usa mock apenas como fallback
 * enquanto a persistência real dos comprovantes não está acoplada à UI.
 */
export interface ClientHistoryListProps {
  readonly sessions?: readonly ClientHistorySession[];
  readonly className?: string;
}

export function ClientHistoryList({ sessions, className }: ClientHistoryListProps): ReactNode {
  const { t } = useI18n();
  const items = sessions ?? MOCK_CLIENT_HISTORY;

  return (
    <section
      aria-label={t('clientHistory.title')}
      className={cn('flex min-h-0 min-w-0 w-full flex-col gap-3', className)}
    >
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-black/[0.06] bg-black/[0.03] text-neutral-500 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-zinc-400">
          <History className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-tight text-neutral-700 dark:text-zinc-200">
            {t('clientHistory.title')}
          </h2>
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-zinc-400">
            {t('clientHistory.subtitle')}
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <GlassContainer className="border-dashed p-6 text-center dark:bg-white/[0.02]">
          <span className="mx-auto flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-2xl border border-black/[0.06] bg-black/[0.03] text-neutral-400 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-zinc-500">
            <History className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <p className="mt-3 text-sm font-medium text-neutral-500 dark:text-zinc-400">
            {t('clientHistory.empty')}
          </p>
        </GlassContainer>
      ) : (
        <ol className="min-w-0 w-full space-y-3">
          {items.map((session) => (
            <li key={session.agendamento.id} className="min-w-0 w-full">
              <ReceiptCard session={session} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
