'use client';

import { cn } from '@/lib/utils';

type MachineState = 'idle' | 'buzzing' | 'error' | 'success';

interface TattooMachineAnimationPlaceholderProps {
  state?: MachineState;
  className?: string;
}

export function TattooMachineAnimationPlaceholder({
  state = 'idle',
  className,
}: TattooMachineAnimationPlaceholderProps) {
  const isBuzzing = state === 'buzzing';
  const isError = state === 'error';
  const isSuccess = state === 'success';

  return (
    <div
      className={cn(
        'relative mx-auto flex h-28 w-full max-w-[220px] items-center justify-center',
        className
      )}
      aria-hidden="true"
    >
      {/*
        Future Lottie drop-in:
        1. Save the tattoo-machine animation JSON at public/lottie/tattoo-machine.json
        2. Install lottie-react
        3. Replace this placeholder body with:
           <Lottie animationData={require('@/../public/lottie/tattoo-machine.json')} loop={state === 'buzzing'} />
        Bind play to each OTP keystroke and stop/complete on success or error.
      */}
      <div
        className={cn(
          'relative flex h-24 w-24 items-center justify-center rounded-2xl border-2 bg-[#0a0a0a]',
          isError
            ? 'border-red-600 shadow-[0_0_22px_rgba(220,38,38,0.45)] tattoo-machine-shake'
            : isSuccess
              ? 'border-[#F97316] shadow-[0_0_22px_rgba(249,115,22,0.5)]'
              : 'border-[#F97316]/50 shadow-[0_0_16px_rgba(249,115,22,0.28)]',
          isBuzzing && 'tattoo-machine-buzz'
        )}
      >
        <div className="absolute inset-2 overflow-hidden rounded-xl bg-zinc-950">
          <div
            className={cn(
              'h-full w-full origin-bottom bg-gradient-to-t',
              isError
                ? 'from-red-800 via-red-600 to-rose-400 tattoo-machine-fill-failed'
                : 'from-orange-700 via-[#F97316] to-amber-400',
              isBuzzing && 'tattoo-machine-fill',
              isSuccess && 'opacity-100',
              state === 'idle' && 'opacity-40'
            )}
          />
        </div>
        <div
          className={cn(
            'absolute -right-1.5 top-1/2 h-4 w-2.5 -translate-y-1/2 rounded-r-sm',
            isError ? 'bg-red-600' : 'bg-[#F97316]',
            isBuzzing && 'tattoo-machine-buzz'
          )}
        />
      </div>
    </div>
  );
}
