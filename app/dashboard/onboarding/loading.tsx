import { OnboardingSkeleton } from '@/components/features/onboarding-skeleton';

/**
 * Route-level fallback of `/dashboard/onboarding`.
 *
 * Reserves the exact geometry of the hydrated role-selection screen (avatar
 * medallion, narrative copy, role cards and CTA) with the premium shimmer.
 */
export default function OnboardingLoading() {
  return <OnboardingSkeleton />;
}
