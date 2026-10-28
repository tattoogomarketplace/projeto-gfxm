import type { ReactNode } from 'react';
import { Settings } from 'lucide-react';
import { BrandLogo } from '@/components/brand/brand-logo';
import { InstagramSpinnerOverlay } from '@/components/ui/instagram-spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const PROFILE_SCROLL_SHELL =
  'gpu-layer mx-auto flex h-full min-h-0 w-full max-w-2xl flex-1 flex-col overflow-y-auto overscroll-none bg-transparent pb-[var(--dock-clearance)] pt-[max(1.25rem,env(safe-area-inset-top))] text-gray-900 contain-paint transform-gpu backface-hidden will-change-transform dark:text-white';

function Shell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn(className)} aria-hidden aria-busy="true">
      {children}
    </div>
  );
}

export function ArtistHubSkeleton({ className }: { className?: string }) {
  return (
    <Shell className={cn('mx-auto flex min-w-0 w-full max-w-2xl flex-1 flex-col gap-6 pt-5', className)}>
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
    <Shell className={cn('mx-auto min-w-0 w-full max-w-2xl flex-1 space-y-7 pb-4', className)}>
      <div className="-mx-4 min-w-0 sm:-mx-6">
        <div className="sticky top-0 z-30 w-full border-b border-white/5 bg-[#121212]/90 pb-3 backdrop-blur-2xl">
          <div
            data-ptr-slot
            className="relative isolate flex h-0 w-full shrink-0 items-start justify-center overflow-hidden bg-[#121212] contain-paint"
            aria-hidden
          />
          <div className="relative w-full bg-transparent pt-2">
            <div className="mb-2 flex items-center gap-2 px-4">
              <Skeleton className="h-3.5 w-3.5 rounded-full" />
              <Skeleton className="h-2.5 w-24 rounded-full" />
            </div>
            <div className="flex min-h-[5.25rem] gap-3 overflow-hidden px-4">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex w-[clamp(4.25rem,20vw,4.75rem)] shrink-0 flex-col items-center gap-1.5">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <Skeleton className="h-2.5 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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

      <section className="min-w-0 w-full space-y-3">
        <div className="flex items-center justify-between gap-3 px-0.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-md" />
            <Skeleton className="h-4 w-28 rounded-full" />
          </div>
          <Skeleton className="h-3 w-14 rounded-full" />
        </div>
        <div className="flex gap-3 overflow-hidden pb-2">
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="aspect-[9/16] w-[10.5rem] shrink-0 rounded-2xl" />
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
}: {
  className?: string;
  showFooterAction?: boolean;
}) {
  return (
    <div className={cn(PROFILE_SCROLL_SHELL, className)} aria-busy="true">
      <div className="relative min-h-0 w-full flex-1">
        <InstagramSpinnerOverlay />
      </div>
    </div>
  );
}

export function ClientIdentitySkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-0 flex min-h-0 w-full flex-col overflow-hidden bg-zinc-950 pb-[var(--dock-clearance)] pt-[max(env(safe-area-inset-top),1.5rem)] text-zinc-100',
        className
      )}
      aria-busy="true"
    >
      <header className="relative shrink-0 px-[max(1.5rem,env(safe-area-inset-right))]">
        <Settings
          aria-hidden
          className="absolute right-0 top-[0.5rem] h-5 w-5 text-orange-400/70"
          strokeWidth={1.75}
        />
      </header>
      <div className="relative min-h-0 w-full flex-1">
        <InstagramSpinnerOverlay />
      </div>
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
    <div
      className={cn(
        'relative flex h-full max-h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden bg-zinc-950 text-zinc-100',
        className
      )}
      aria-busy="true"
    >
      <div className="shrink-0">
        <header className="sticky top-0 z-40 shrink-0 border-b border-zinc-900 bg-zinc-950/90 px-4 pb-2 pt-[max(env(safe-area-inset-top),_1.5rem)] backdrop-blur-xl">
          <div className="flex min-h-11 items-center gap-2">
            <div className="h-10 min-h-10 min-w-0 flex-1 rounded-full border border-zinc-800 bg-zinc-900" />
            <div className="h-11 w-11 min-h-11 min-w-11 shrink-0 rounded-xl" />
          </div>
          <div className="pt-3">
            <div className="grid h-11 w-full grid-cols-2 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-1">
              <div className="rounded-xl bg-orange-500/15" />
              <div />
            </div>
          </div>
        </header>
      </div>

      <div className="relative grid min-h-0 min-w-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-4 lg:p-3">
        <aside className="relative flex min-h-0 min-w-0 flex-col overflow-hidden lg:rounded-2xl lg:border lg:border-zinc-800 lg:bg-zinc-950">
          <InstagramSpinnerOverlay />
        </aside>
        <section className="relative hidden min-h-0 min-w-0 overflow-hidden lg:flex lg:rounded-2xl lg:border lg:border-zinc-800">
          <InstagramSpinnerOverlay />
        </section>
      </div>
    </div>
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
      className={cn('w-full max-w-sm space-y-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8', className)}
      aria-hidden
      aria-busy="true"
    >
      <div className="space-y-4">
        <Skeleton className="h-[3.25rem] w-full rounded-lg" />
        <Skeleton className="h-[3.25rem] w-full rounded-lg" />
      </div>
      <Skeleton className="h-[3.25rem] w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
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

export function ArtistVerificationSkeleton({ className }: { className?: string }) {
  return (
    <Shell
      className={cn(
        'relative flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-none bg-background px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+4rem)] text-white sm:px-6 [-webkit-overflow-scrolling:touch]',
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col space-y-6">
        <Skeleton className="h-11 w-24 rounded-xl" />

        <section className="rounded-3xl border border-border/50 bg-white/[0.03] p-6 backdrop-blur-md sm:p-8">
          <Skeleton className="h-6 w-36 rounded-full" />
          <Skeleton className="mt-4 h-9 w-3/4 max-w-[20rem] rounded-lg" />
          <Skeleton className="mt-3 h-4 w-full rounded-full" />
          <Skeleton className="mt-2 h-4 w-5/6 rounded-full" />

          <ul className="mt-6 space-y-3">
            {[0, 1, 2].map((index) => (
              <li key={index} className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 min-h-9 min-w-9 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 rounded-full" />
                  <Skeleton className="h-3 w-full max-w-[18rem] rounded-full" />
                </span>
              </li>
            ))}
          </ul>

          <Skeleton className="mt-7 h-14 w-full rounded-2xl" />
        </section>

        <section className="rounded-3xl border border-border/50 bg-white/5 p-6 backdrop-blur-md sm:p-7">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 min-h-11 min-w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-44 rounded-full" />
              <Skeleton className="h-3 w-full max-w-[20rem] rounded-full" />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </section>
      </div>
    </Shell>
  );
}

export function KycPendingSkeleton({ className }: { className?: string }) {
  return (
    <Shell
      className={cn(
        'flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background text-white',
        className
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]">
        <div className="mx-auto w-full max-w-lg space-y-6 pb-8">
          <section className="rounded-2xl border border-border/50 bg-white/[0.03] p-6 backdrop-blur-md sm:p-8">
            <Skeleton className="h-3 w-28 rounded-full" />
            <Skeleton className="mt-3 h-8 w-3/4 max-w-[16rem] rounded-full" />
            <Skeleton className="mt-3 h-4 w-full rounded-full" />
            <Skeleton className="mt-2 h-4 w-4/5 rounded-full" />
            <ul className="mt-6 space-y-3">
              {[0, 1, 2].map((index) => (
                <li key={index} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 min-h-8 min-w-8 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-32 rounded-full" />
                    <Skeleton className="h-3 w-full max-w-[18rem] rounded-full" />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <div className="rounded-2xl border border-border/50 bg-white/5 p-6 backdrop-blur-md sm:p-8">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="mt-3 h-7 w-2/3 max-w-[14rem] rounded-full" />
            <Skeleton className="mt-3 h-4 w-full rounded-full" />
            <Skeleton className="mt-2 h-4 w-5/6 rounded-full" />
            <div className="mt-6 flex items-center gap-2">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-3 w-40 rounded-full" />
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-white/5 p-5 backdrop-blur-md sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-5 w-40 rounded-full" />
                <Skeleton className="h-3 w-full max-w-[20rem] rounded-full" />
              </div>
              <Skeleton className="h-8 w-24 shrink-0 rounded-full" />
            </div>
            <div className="mt-5 space-y-4">
              {[0, 1].map((index) => (
                <div key={index} className="rounded-2xl border border-border/50 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-11 w-11 min-h-11 min-w-11 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-40 rounded-full" />
                      <Skeleton className="h-3 w-full max-w-[18rem] rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="mt-4 h-28 w-full rounded-2xl" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-5 h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function AiChatSkeleton({ className }: { className?: string }) {
  return (
    <Shell
      className={cn(
        'relative z-10 mx-auto flex h-full min-h-0 w-full max-w-app flex-1 flex-col overflow-hidden',
        className
      )}
    >
      <div className="glass-chrome safe-header-pad z-40 shrink-0 border-b border-black/[0.04] dark:border-white/[0.05]">
        <div className="flex min-h-11 items-center gap-2 px-4 pb-3">
          <Skeleton className="h-6 w-16 rounded-lg" />
          <Skeleton className="mx-auto h-4 w-20 rounded-full" />
          <Skeleton className="h-6 w-11 rounded-lg" />
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-none px-4 pt-4 pb-36 [-webkit-overflow-scrolling:touch]">
        <section className="glass-panel relative overflow-hidden rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Skeleton className="h-11 w-11 min-h-11 min-w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-4 w-40 rounded-full" />
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-app -translate-x-1/2 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2">
        <div className="glass-panel flex items-center gap-2 rounded-2xl px-3 py-2">
          <Skeleton className="h-11 min-h-11 min-w-0 flex-1 rounded-xl" />
          <Skeleton className="h-11 w-11 min-h-11 min-w-11 shrink-0 rounded-full" />
        </div>
      </div>
    </Shell>
  );
}

export function UsernameOnboardingSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Preparando sua identidade..."
      className={cn(
        'relative flex h-full min-h-[100dvh] w-full flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto overscroll-none bg-[#121212] px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]',
        className
      )}
    >
      <div className="relative flex flex-col items-center gap-6">
        <BrandLogo size="lg" className="h-auto px-0" />
        <span className="relative flex h-16 w-16 items-center justify-center">
          <span aria-hidden className="absolute inset-0 rounded-full border border-white/[0.06]" />
          <span
            aria-hidden
            className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-orange-500/30 border-t-orange-500 [animation-duration:1.1s]"
          />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.85)]" />
        </span>
        <div className="w-full space-y-2 text-center">
          <Skeleton className="mx-auto h-4 w-52 rounded-full" />
        </div>
      </div>
    </div>
  );
}
