'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';

type AuthScreenProps = {
  children: ReactNode;
  className?: string;
};

export function AuthScreen({ children, className }: AuthScreenProps) {
  return (
    <div
      className={cn(
        'screen-fade-in relative flex min-h-dvh w-full flex-col items-center justify-center bg-[#121212] text-white',
        'px-4',
        'pt-[max(1.25rem,env(safe-area-inset-top))]',
        'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
        'pl-[max(1rem,env(safe-area-inset-left))]',
        'pr-[max(1rem,env(safe-area-inset-right))]',
        className
      )}
    >
      {children}
    </div>
  );
}

type AuthBridgeOverlayProps = {
  visible: boolean;
  label?: string;
};

export function AuthBridgeOverlay({
  visible,
  label = 'Carregando',
}: AuthBridgeOverlayProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[80] flex items-center justify-center bg-[#121212] transition-opacity duration-300 ease-in-out',
        visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      )}
      aria-hidden={!visible}
      role={visible ? 'status' : undefined}
    >
      <TattooMachineLoader compact label={label} />
    </div>
  );
}
