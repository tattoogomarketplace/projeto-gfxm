'use client';

import { useUser } from '@clerk/nextjs';
import { Sparkles } from 'lucide-react';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { getOnboardingLoadingMessage } from '@/lib/content/role-experience';

function resolveRole(user: ReturnType<typeof useUser>['user']): string | null {
  const publicRole = user?.publicMetadata?.role;
  const unsafeRole = user?.unsafeMetadata?.role;
  if (typeof publicRole === 'string') return publicRole;
  if (typeof unsafeRole === 'string') return unsafeRole;
  return null;
}

export function OnboardingLoadingScreen({
  variant = 'machine',
  compact = false,
  children,
}: {
  variant?: 'machine' | 'sparkles';
  compact?: boolean;
  children?: React.ReactNode;
}) {
  const { user } = useUser();
  const message = getOnboardingLoadingMessage(resolveRole(user));

  if (variant === 'sparkles') {
    return (
      <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#121212] px-6 text-center text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(249,115,22,0.18),transparent_60%)]"
        />
        <div className="relative flex flex-col items-center gap-6">
          <span className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 rounded-full border-2 border-orange-500/20" />
            <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-orange-500/60 border-t-orange-500 shadow-[0_0_28px_rgba(249,115,22,0.55)]" />
            <Sparkles className="h-7 w-7 text-orange-400" strokeWidth={1.75} />
          </span>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">
              TattooGo MK
            </p>
            <h1 className="text-xl font-bold tracking-tight text-white">{message}</h1>
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-zinc-400">
              Estamos finalizando a criação do seu perfil. Isso leva só um instante.
            </p>
          </div>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#121212] px-6 text-center text-white">
      <TattooMachineLoader compact={compact} label={message} />
    </div>
  );
}
