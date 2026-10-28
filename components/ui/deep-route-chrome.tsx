import { ArrowLeft, Bookmark, Compass } from 'lucide-react';
import { InstagramSpinnerOverlay } from '@/components/ui/instagram-spinner';
import { cn } from '@/lib/utils';

const PROFILE_SCROLL_SHELL =
  'gpu-layer mx-auto flex h-full min-h-0 w-full max-w-2xl flex-1 flex-col overflow-y-auto overscroll-none bg-transparent pb-[var(--dock-clearance)] pt-[max(1.25rem,env(safe-area-inset-top))] text-gray-900 contain-paint transform-gpu backface-hidden will-change-transform dark:text-white';

function BackGlyph() {
  return <ArrowLeft className="h-4 w-4" strokeWidth={1.9} aria-hidden />;
}

export function ArtistVitrineChrome({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      className={cn(
        'absolute inset-0 z-0 min-h-0 w-full overflow-hidden bg-zinc-950 pb-[calc(env(safe-area-inset-bottom)+6rem)] text-white',
        className
      )}
    >
      <header className="relative h-48 w-full md:h-64">
        <div className="h-full w-full bg-gradient-to-br from-zinc-800 via-zinc-950 to-orange-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-black/20" />
        <span className="absolute left-[max(1rem,env(safe-area-inset-left))] top-[calc(env(safe-area-inset-top)+0.5rem)] z-20 inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-zinc-950/70 text-white backdrop-blur-md">
          <BackGlyph />
        </span>
      </header>
      <div className="relative min-h-[24rem] w-full">
        <InstagramSpinnerOverlay />
      </div>
    </div>
  );
}

export function PublicProfileChrome({ className }: { className?: string }) {
  return (
    <div className={cn(PROFILE_SCROLL_SHELL, className)} aria-busy="true">
      <header className="relative w-full overflow-hidden rounded-3xl border border-black/[0.04] bg-white contain-paint dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="relative h-32 w-full overflow-hidden border-b border-black/[0.04] bg-neutral-100 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <span className="absolute left-4 top-4 flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-2xl border border-black/[0.05] bg-white/70 text-neutral-600 backdrop-blur-md dark:border-white/[0.06] dark:bg-black/30 dark:text-zinc-300">
            <BackGlyph />
          </span>
        </div>
      </header>
      <div className="relative min-h-[24rem] w-full flex-1">
        <InstagramSpinnerOverlay />
      </div>
    </div>
  );
}

export function ReviewDetailChrome({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      className={cn(
        'relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-transparent pb-24 text-white',
        className
      )}
    >
      <header className="sticky top-0 z-20 border-b border-white/[0.05] bg-neutral-950/70 px-4 pb-3 safe-header-pad backdrop-blur-xl backdrop-saturate-150">
        <div className="flex min-h-11 items-center gap-3">
          <span className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-zinc-300">
            <BackGlyph />
          </span>
          <span className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight">
            &nbsp;
          </span>
        </div>
      </header>
      <div className="relative min-h-[24rem] w-full flex-1">
        <InstagramSpinnerOverlay />
      </div>
    </div>
  );
}

export function MapChrome({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      className={cn('relative z-0 h-[100dvh] w-full overflow-hidden bg-zinc-950', className)}
    >
      <header className="absolute inset-x-0 top-0 z-40 bg-zinc-950/70 safe-header-pad backdrop-blur-md">
        <div className="flex min-h-11 items-center gap-3 px-4 pb-3">
          <span className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-zinc-300">
            <BackGlyph />
          </span>
          <span className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight text-white">
            &nbsp;
          </span>
        </div>
      </header>
      <div className="relative h-full w-full">
        <InstagramSpinnerOverlay />
      </div>
    </div>
  );
}

export function GaleriaChrome({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      className={cn(
        'absolute inset-0 z-0 min-h-0 w-full overflow-hidden bg-[#0a0a0c] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/20 via-[#0a0a0c] to-[#050505] pb-[var(--dock-clearance)]',
        className
      )}
    >
      <div className="relative z-0 isolate mx-auto flex h-full w-full max-w-2xl flex-col">
        <div className="relative z-40 bg-[#121212] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]">
          <div className="mb-4 flex w-full flex-row items-center rounded-2xl border border-white/5 bg-[#121212] p-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/10 p-1.5 text-orange-500">
              <Compass className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
          </div>
        </div>
        <div className="relative min-h-0 w-full flex-1">
          <InstagramSpinnerOverlay />
        </div>
      </div>
    </div>
  );
}

export function InspiracoesChrome({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      className={cn(
        'absolute inset-0 z-0 min-h-0 w-full overflow-hidden bg-[#121212] pb-[calc(env(safe-area-inset-bottom)+5rem)]',
        className
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
        <header className="pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 border-l-2 border-l-[#F97316] bg-[#121212]/70 p-3 backdrop-blur-md">
            <span className="flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl border border-orange-500/35 bg-orange-500/15 text-orange-400">
              <Bookmark className="h-4 w-4" strokeWidth={1.9} fill="currentColor" aria-hidden />
            </span>
          </div>
        </header>
        <div className="relative min-h-0 w-full flex-1">
          <InstagramSpinnerOverlay />
        </div>
      </div>
    </div>
  );
}

export function PaymentsChrome({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      className={cn('relative flex min-w-0 w-full flex-1 flex-col pt-5', className)}
    >
      <div className="grid h-11 w-full shrink-0 grid-cols-2 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-1">
        <div />
        <div className="rounded-xl bg-orange-500/80" />
      </div>
      <div className="relative mt-4 min-h-[24rem] w-full flex-1">
        <InstagramSpinnerOverlay />
      </div>
    </div>
  );
}

export function DestinationListChrome({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      className={cn(
        'relative flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 pb-24 pt-4',
        className
      )}
    >
      <header className="mb-6 h-[3.25rem] shrink-0" />
      <div className="relative min-h-[24rem] w-full flex-1">
        <InstagramSpinnerOverlay />
      </div>
    </div>
  );
}

export function CancelAppointmentChrome({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      className={cn(
        'flex h-full min-h-0 w-full flex-col overflow-hidden bg-graphite text-white',
        className
      )}
    >
      <div className="relative min-h-0 flex-1">
        <InstagramSpinnerOverlay />
      </div>
    </div>
  );
}


