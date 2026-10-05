'use client';

import { Toaster } from 'sonner';

export function LuxuryToaster() {
  return (
    <Toaster
      position="top-center"
      theme="system"
      visibleToasts={3}
      duration={4200}
      offset={18}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-[min(92vw,22rem)] items-start gap-3 rounded-2xl border border-[#F97316]/35 bg-white/90 px-4 py-3 text-sm font-medium text-neutral-900 shadow-[0_12px_40px_rgba(249,115,22,0.18)] backdrop-blur-xl dark:border-[#F97316]/40 dark:bg-[#121212]/88 dark:text-white',
          title: 'text-sm font-semibold leading-snug text-neutral-900 dark:text-white',
          description: 'mt-0.5 text-xs leading-relaxed text-neutral-600 dark:text-zinc-400',
          actionButton:
            'rounded-lg bg-[#F97316] px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_14px_rgba(249,115,22,0.35)]',
          cancelButton:
            'rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:border-neutral-700 dark:text-zinc-300',
          error: 'border-red-500/40 dark:border-red-500/45',
          success: 'border-[#F97316]/50',
          warning: 'border-amber-400/50',
        },
      }}
    />
  );
}
