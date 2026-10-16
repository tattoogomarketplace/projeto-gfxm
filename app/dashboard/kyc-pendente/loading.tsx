import { KycPendingSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/dashboard/kyc-pendente`.
 *
 * Reserva a geometria exata do estado de KYC (hero de benefícios, cartão de
 * status e painel de documentos) com o shimmer Dark Luxury, para que a tela
 * hidratada caia com Zero Layout Shift.
 */
export default function KycPendenteLoading() {
  return <KycPendingSkeleton />;
}
