'use client';

import { memo } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';

type AuthScreenProps = {
  children: ReactNode;
  className?: string;
};

function AuthScreenBase({ children, className }: AuthScreenProps) {
  return (
    <div
      className={cn(
        'form-page screen-fade-in relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-foreground select-none',
        className
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-none px-4 pb-36 pt-[max(1.25rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] [-webkit-overflow-scrolling:touch]">
        <div className="my-auto flex w-full max-w-md flex-col items-center">
          {children}
        </div>
      </div>
    </div>
  );
}

type AuthBridgeOverlayProps = {
  visible: boolean;
  label?: string;
};

function AuthBridgeOverlayBase({
  visible,
  label = 'Carregando',
}: AuthBridgeOverlayProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[80] flex items-center justify-center bg-background transition-opacity duration-300 ease-in-out',
        visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      )}
      aria-hidden={!visible}
      role={visible ? 'status' : undefined}
    >
      <TattooMachineLoader compact label={label} />
    </div>
  );
}

export const AuthScreen = memo(AuthScreenBase);
export const AuthBridgeOverlay = memo(AuthBridgeOverlayBase);
