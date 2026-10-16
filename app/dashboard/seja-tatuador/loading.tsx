import { ArtistVerificationSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/dashboard/seja-tatuador`.
 *
 * Reserva a geometria exata do fluxo de verificação de artista (voltar, hero
 * de benefícios, gate de identidade e painel de documentos) com o shimmer Dark
 * Luxury, para que a tela hidratada caia com Zero Layout Shift.
 */
export default function SejaTatuadorLoading() {
  return <ArtistVerificationSkeleton />;
}
