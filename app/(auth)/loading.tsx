import { AuthScreen } from '@/components/layout/auth-screen';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Auth route loading boundary.
 *
 * Skeleton mirror of the auth form layout — no spinner, no "loading" text. The
 * immersive tattoo-machine animation is reserved for the OTP activation flow,
 * never for route transitions.
 */
export default function AuthLoading() {
  return (
    <AuthScreen>
      <div className="w-full space-y-6" aria-hidden aria-busy="true">
        <Skeleton className="mx-auto h-16 w-16 min-h-16 min-w-16 rounded-full" />
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-7 w-52 max-w-full rounded-full" />
          <Skeleton className="h-4 w-64 max-w-full rounded-full" />
        </div>
        <div className="space-y-3 pt-2">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      </div>
    </AuthScreen>
  );
}
