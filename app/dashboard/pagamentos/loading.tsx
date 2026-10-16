import { AgendaPaymentsSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/dashboard/pagamentos`.
 *
 * Mirrors the Agenda/Payments workspace geometry (two-segment tab control plus
 * the card slots) inside the shell, so the hydrated workspace lands with zero
 * layout shift.
 */
export default function PagamentosLoading() {
  return <AgendaPaymentsSkeleton />;
}
