import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const PROFILE_SCROLL_SHELL =
  'gpu-layer flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-none bg-transparent pb-[max(10rem,env(safe-area-inset-bottom))] pt-5 text-gray-900 contain-paint transform-gpu backface-hidden will-change-transform dark:text-white';

function Shell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn(className)} aria-hidden aria-busy="true">
      {children}
    </div>
  );
}

export function ArtistHubSkeleton({ className }: { className?: string }) {
  return (
    <Shell className={cn('flex min-w-0 w-full flex-1 flex-col gap-6 pt-5', className)}>
      <div className="flex gap-3 overflow-hidden">
        <Skeleton className="h-[4.6rem] w-[3.6rem] shrink-0 rounded-2xl" />
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-[4.6rem] w-[3.6rem] shrink-0 rounded-full" />
        ))}
      </div>

      <section className="min-w-0 w-full">
        <div className="mb-3 flex items-center gap-2 px-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="col-span-2 h-[7.5rem] rounded-2xl" />
          <Skeleton className="h-[7.5rem] rounded-2xl" />
          <Skeleton className="h-[7.5rem] rounded-2xl" />
          <Skeleton className="col-span-2 h-[7.5rem] rounded-2xl" />
        </div>
      </section>

      <section className="min-w-0 w-full">
        <div className="mb-3 flex items-center gap-2 px-1">
          <Skeleton className="h-3.5 w-3.5 rounded-full" />
          <Skeleton className="h-3 w-20 rounded-full" />
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-[4.25rem] rounded-2xl" />
            <Skeleton className="h-[4.25rem] rounded-2xl" />
          </div>
          <Skeleton className="h-[5.5rem] rounded-2xl" />
          <Skeleton className="h-[3.75rem] rounded-2xl" />
          <Skeleton className="h-[3.75rem] rounded-2xl" />
        </div>
      </section>
    </Shell>
  );
}

const DISCOVER_ASPECTS = [
  'aspect-[4/5]',
  'aspect-square',
  'aspect-[3/4]',
  'aspect-[4/5]',
  'aspect-square',
  'aspect-[3/4]',
] as const;

export function HomeDiscoverSkeleton({ className }: { className?: string }) {
  return (
    <Shell className={cn('min-w-0 w-full flex-1 space-y-7 pb-4 pt-5', className)}>
      <Skeleton className="h-36 w-full rounded-3xl" />

      <section className="min-w-0 w-full space-y-3">
        <div className="flex items-end justify-between gap-3 px-0.5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-4 w-32 rounded-full" />
          </div>
          <Skeleton className="h-3 w-14 rounded-full" />
        </div>
        <div className="flex gap-3 overflow-hidden pb-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-[9.25rem] w-[9rem] shrink-0 rounded-2xl" />
          ))}
        </div>
      </section>

      <div className="flex gap-2 overflow-hidden py-3">
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton
            key={index}
            className={cn('h-9 shrink-0 rounded-full', index === 0 ? 'w-16' : 'w-24')}
          />
        ))}
      </div>

      <section className="min-w-0 w-full space-y-3">
        <div className="flex items-end justify-between gap-3 px-0.5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-4 w-28 rounded-full" />
          </div>
          <Skeleton className="h-3 w-14 rounded-full" />
        </div>
        <div className="columns-2 gap-4">
          {DISCOVER_ASPECTS.map((aspect, index) => (
            <Skeleton
              key={index}
              className={cn('mb-4 w-full break-inside-avoid rounded-xl', aspect)}
            />
          ))}
        </div>
      </section>
    </Shell>
  );
}

export function StudioDashboardSkeleton({ className }: { className?: string }) {
  return (
    <Shell className={cn('flex w-full flex-1 flex-col pt-5', className)}>
      <Skeleton className="h-7 w-56 rounded-lg" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full rounded-full" />
      <div className="mt-6 space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
      <div className="mt-8 space-y-3">
        <Skeleton className="h-4 w-40 rounded-full" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </Shell>
  );
}

export function ProfileSkeleton({
  className,
  showFooterAction = true,
}: {
  className?: string;
  showFooterAction?: boolean;
}) {
  return (
    <div className={cn(PROFILE_SCROLL_SHELL, className)} aria-hidden aria-busy="true">
      <header className="relative w-full overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] contain-paint dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none">
        <Skeleton className="h-32 w-full rounded-none" />
        <div className="relative px-5 pb-5">
          <div className="flex items-end gap-4">
            <Skeleton className="-mt-12 h-20 w-20 min-h-20 min-w-20 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2 pb-1">
              <Skeleton className="h-6 w-40 rounded-md" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex flex-col items-center gap-1.5">
                <Skeleton className="h-6 w-12 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 h-4 w-full rounded-md" />
          <Skeleton className="mt-2 h-4 w-2/3 rounded-md" />
          <Skeleton className="mt-4 h-11 w-full rounded-xl" />
        </div>
      </header>

      <div className="mt-5 flex gap-3 px-1">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex w-[76px] shrink-0 flex-col items-center gap-2">
            <Skeleton className="h-[68px] w-[68px] rounded-full" />
            <Skeleton className="h-3 w-14 rounded-md" />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="mt-4 grid grid-cols-3 gap-[3px] sm:gap-1">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="aspect-square w-full rounded-[10px]" />
          ))}
        </div>
      </div>

      {showFooterAction ? (
        <div className="mt-auto pt-8">
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ) : null}
    </div>
  );
}

export function PublicProfileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(PROFILE_SCROLL_SHELL, className)} aria-hidden aria-busy="true">
      <div className="mb-4 flex items-center gap-3 px-1">
        <Skeleton className="h-11 w-11 min-h-11 min-w-11 rounded-xl" />
        <Skeleton className="h-4 w-32 rounded-full" />
      </div>
      <Skeleton className="h-36 w-full rounded-3xl" />
      <div className="mt-5 flex gap-3 px-1">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex w-[76px] shrink-0 flex-col items-center gap-2">
            <Skeleton className="h-[68px] w-[68px] rounded-full" />
            <Skeleton className="h-3 w-14 rounded-md" />
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="mt-4 grid grid-cols-3 gap-[3px] sm:gap-1">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
            <Skeleton key={index} className="aspect-square w-full rounded-[10px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatInboxSkeleton({ className }: { className?: string }) {
  return (
    <Shell className={cn('relative flex h-full max-h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden', className)}>
      <div className="shrink-0">
        <div className="border-b border-black/[0.04] bg-black/[0.03] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md dark:border-white/[0.06] dark:bg-black/60">
          <div className="flex min-h-11 items-center gap-2 px-3 pb-3">
            <Skeleton className="h-11 w-11 min-h-11 min-w-11 shrink-0 rounded-full" />
            <Skeleton className="h-11 min-h-11 flex-1 rounded-full" />
          </div>
        </div>
        <div className="px-3 pb-3 pt-3">
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
      </div>

      <div className="relative grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-3 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden lg:rounded-2xl lg:border lg:border-black/[0.04] lg:bg-white dark:lg:border-white/[0.05] dark:lg:bg-white/[0.03]">
          <div className="flex items-center gap-2 border-b border-black/[0.04] px-4 py-3 dark:border-white/[0.05]">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-28 rounded-full" />
          </div>
          <div className="space-y-2 p-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </aside>
        <section className="hidden min-h-0 min-w-0 overflow-hidden lg:flex">
          <Skeleton className="h-full w-full rounded-2xl" />
        </section>
      </div>
    </Shell>
  );
}

export function AgendaPaymentsSkeleton({ className }: { className?: string }) {
  return (
    <Shell className={cn('flex min-w-0 w-full flex-1 flex-col pt-5', className)}>
      <div className="grid w-full shrink-0 grid-cols-2 rounded-2xl border border-black/[0.04] bg-neutral-100 p-1 dark:border-white/[0.05] dark:bg-white/10">
        <Skeleton className="h-11 rounded-xl" />
        <Skeleton className="h-11 rounded-xl" />
      </div>
      <div className="mt-4 min-h-0 w-full flex-1 space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </Shell>
  );
}

export function GalleryGridSkeleton({ className }: { className?: string }) {
  return (
    <Shell className={cn('relative flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden', className)}>
      <div className="relative min-h-0 flex-1 overflow-hidden px-4 pt-5">
        <div className="space-y-4">
          <Skeleton className="h-[4.25rem] w-full rounded-2xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <div className="columns-1 gap-4 sm:columns-2">
            <Skeleton className="mb-4 h-80 w-full break-inside-avoid rounded-2xl" />
            <Skeleton className="mb-4 h-64 w-full break-inside-avoid rounded-2xl" />
            <Skeleton className="mb-4 h-72 w-full break-inside-avoid rounded-2xl" />
            <Skeleton className="mb-4 h-56 w-full break-inside-avoid rounded-2xl" />
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function AuthFormSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'form-page screen-fade-in relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-foreground',
        className
      )}
      aria-hidden
      aria-busy="true"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-none px-4 pb-36 pt-[max(1.25rem,env(safe-area-inset-top))] [-webkit-overflow-scrolling:touch]">
        <div className="my-auto flex w-full max-w-md flex-col items-center">
          <div className="w-full max-w-sm space-y-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-9 w-44 rounded-lg" />
              <Skeleton className="h-4 w-52 rounded-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-[3.25rem] w-full rounded-lg" />
              <Skeleton className="h-[3.25rem] w-full rounded-lg" />
            </div>
            <Skeleton className="h-[3.25rem] w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppRouteSkeleton({ className }: { className?: string }) {
  return (
    <Shell className={cn('flex h-full min-h-0 w-full flex-1 flex-col px-4 pt-5', className)}>
      <Skeleton className="h-7 w-52 rounded-lg" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full rounded-full" />
      <div className="mt-6 space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </Shell>
  );
}
