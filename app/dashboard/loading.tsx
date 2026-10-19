import { AppRouteSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/dashboard/*`.
 *
 * O `/dashboard` é o DESPACHANTE de papel: o destino (cliente, tatuador ou
 * estúdio) ainda não é conhecido neste frame. Pintar aqui o Feed de Descoberta
 * do cliente fazia o tatuador/estúdio ver a Home errada por um instante. O
 * skeleton genérico preserva a geometria do casco (header + dock já resolvidos)
 * com a mesma linguagem Dark Luxury, e a rota de destino aplica o skeleton
 * específico do papel assim que o redirecionamento resolve.
 */
export default function DashboardLoading() {
  return <AppRouteSkeleton />;
}
