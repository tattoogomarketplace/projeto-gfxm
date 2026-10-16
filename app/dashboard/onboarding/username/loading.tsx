import { UsernameOnboardingSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/dashboard/onboarding/username`.
 *
 * Reaproveita o loader premium do onboarding de identidade (ring laranja sobre
 * o gradiente radial Deep Graphite). Como é o MESMO componente consumido pelo
 * Suspense interno da página, o handoff loader -> formulário é um frame
 * contínuo, sem salto de layout (CLS = 0).
 */
export default function UsernameOnboardingLoading() {
  return <UsernameOnboardingSkeleton />;
}
