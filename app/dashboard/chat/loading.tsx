import { MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/lib/i18n';

export default function ChatLoading() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden bg-background pt-3 transform-gpu transition-opacity duration-200">
      <div className="relative grid min-h-[32rem] flex-1 gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none">
          <div className="flex items-center gap-2 border-b border-black/[0.04] px-4 py-3 dark:border-white/[0.05]">
            <MessageCircle className="h-4 w-4 text-orange-500 dark:text-orange-400" />
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">{t('chat.conversations')}</p>
          </div>
          <div className="relative min-h-0 flex-1 space-y-2 overflow-hidden p-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </aside>
        <section className="hidden min-h-0 lg:flex">
          <Skeleton className="h-[28rem] min-h-[28rem] w-full rounded-2xl" />
        </section>
      </div>
    </div>
  );
}
