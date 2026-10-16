import { AiChatSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/dashboard/ai`.
 *
 * Reserva a geometria exata do Atelier IA (header glass, cartão de boas-vindas
 * e composer fixo) com o shimmer Dark Luxury, para que a tela hidratada caia
 * com Zero Layout Shift.
 */
export default function DashboardAiLoading() {
  return <AiChatSkeleton />;
}
