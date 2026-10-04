import { headers } from 'next/headers';
import { OnboardingLoadingScreen } from '@/components/features/onboarding-loading-screen';
import { isOnboardingPath } from '@/lib/utils/auth-redirect';

export default async function DashboardLoading() {
  const pathname = (await headers()).get('x-pathname') ?? '';
  if (isOnboardingPath(pathname)) {
    return <div className="min-h-dvh bg-[#121212]" />;
  }
  return <OnboardingLoadingScreen />;
}
