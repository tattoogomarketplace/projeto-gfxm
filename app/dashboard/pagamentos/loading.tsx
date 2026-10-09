import { AgendaPaymentsSkeleton } from '@/components/features/agenda-payments-skeleton';

export default function PagamentosLoading() {
  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col pt-5">
      <AgendaPaymentsSkeleton />
    </div>
  );
}
