import { AgendaPaymentsSkeleton } from '@/components/features/agenda-payments-skeleton';

export default function PagamentosLoading() {
  return (
    <div className="relative flex h-full max-h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden pt-5">
      <AgendaPaymentsSkeleton />
    </div>
  );
}
