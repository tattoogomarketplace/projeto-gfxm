import { AuthFormSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of the `(auth)` group.
 *
 * Reserves the exact geometry of the sign-in card (brand wordmark, two inputs,
 * primary CTA) with the premium Dark Luxury shimmer, so the hydrated Clerk form
 * lands with zero layout shift.
 */
export default function AuthLoading() {
  return <AuthFormSkeleton />;
}
