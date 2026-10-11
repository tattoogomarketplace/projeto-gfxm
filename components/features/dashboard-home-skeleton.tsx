'use client';

import { memo } from 'react';
import { usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/hooks/use-auth-store';
import { normalizeAppRole } from '@/lib/utils/auth-redirect';

/**
 * Ghost layout of the role dashboards ("Início").
 *
 * This is the single skeleton authority for the startup handoff. It is rendered
 * on the very first frame (while `/dashboard` resolves the profile) and by the
 * route-level `<Suspense>` fallbacks, so the App Shell — top header + bottom
 * dock — paints instantly without waiting for page data.
 *
 * Every block reserves the exact geometry of its hydrated counterpart: the
 * Flash Notes rail (circle avatar + label), the Quick Access bento, the activity
 * feed and the Discover carousels. That is what guarantees Absolute Zero Layout
 * Shifting the instant the real data streams in. No spinner, no text loader.
 */

const CAROUSEL_CLASS =
  '-mx-4 flex min-w-0 w-full snap-x snap-mandatory gap-4 overflow-hidden px-4 pb-4 sm:-mx-6 sm:px-6';

const ROOT_CLASS = 'min-w-0 w-full flex-1 bg-transparent pt-5';

function ArtistCardSkeleton() {
  return (
    <div className="w-64 shrink-0 snap-start">
      <Skeleton className="h-44 w-full rounded-2xl" />
    </div>
  );
}

function StyleCardSkeleton() {
  return (
    <div className="w-36 shrink-0 snap-start">
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

function SectionHeaderSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex items-end justify-between gap-3 px-0.5">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-8 w-8 min-h-8 min-w-8 rounded-xl" />
        <Skeleton className={wide ? 'h-4 w-40 rounded-full' : 'h-4 w-32 rounded-full'} />
      </div>
      <Skeleton className="h-3 w-14 rounded-full" />
    </div>
  );
}

/**
 * Mirror of `HomeDiscover` (cliente) — hero card, featured artists, trending
 * styles and the gallery entry card.
 */
function DiscoverSkeleton() {
  return (
    <div className={`${ROOT_CLASS} space-y-7`}>
      <header className="relative min-w-0 w-full overflow-hidden rounded-3xl border border-black/[0.04] bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-7 w-2/3 max-w-[12rem] rounded-full" />
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-4/5 rounded-full" />
        </div>
      </header>

      <section className="min-w-0 w-full space-y-3">
        <SectionHeaderSkeleton />
        <div className={CAROUSEL_CLASS}>
          <ArtistCardSkeleton />
          <ArtistCardSkeleton />
          <ArtistCardSkeleton />
        </div>
      </section>

      <section className="min-w-0 w-full space-y-3">
        <SectionHeaderSkeleton />
        <div className={CAROUSEL_CLASS}>
          <StyleCardSkeleton />
          <StyleCardSkeleton />
          <StyleCardSkeleton />
          <StyleCardSkeleton />
        </div>
      </section>

      <div className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-black/[0.04] bg-white px-4 py-3 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <Skeleton className="h-11 w-11 min-h-11 min-w-11 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-28 rounded-full" />
          <Skeleton className="h-3 w-40 max-w-full rounded-full" />
        </div>
        <Skeleton className="h-5 w-5 min-h-5 min-w-5 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Mirror of `ArtistStudioHub` (tatuador / estudio) — Flash Notes rail with the
 * circular avatar broadcast ring, the Quick Access bento grid and the studio
 * activity feed.
 */
function AtelierHubSkeleton() {
  return (
    <div className={`${ROOT_CLASS} flex flex-col gap-6`}>
      <section className="relative shrink-0 px-[max(0.25rem,env(safe-area-inset-left,0px))] pr-[max(0.25rem,env(safe-area-inset-right,0px))]">
        <div className="mb-2 flex items-center gap-2 px-1">
          <Skeleton className="h-3.5 w-3.5 rounded-full" />
          <Skeleton className="h-3.5 w-24 rounded-full" />
        </div>
        <div className="flex min-h-[5.25rem] gap-3 overflow-x-auto overscroll-x-contain pb-1 pt-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`flash-skeleton-${index}`}
              className="flex w-[clamp(4.25rem,20vw,4.75rem)] shrink-0 flex-col items-center gap-1.5"
            >
              <Skeleton className="h-14 w-14 min-h-14 min-w-14 rounded-full" />
              <Skeleton className="h-2.5 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </section>

      <section className="min-w-0 w-full" aria-hidden>
        <div className="mb-3 flex items-center gap-2 px-1">
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
          <Skeleton className="h-3 w-28 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="col-span-2 min-h-[7.5rem] rounded-2xl" />
          <Skeleton className="min-h-[7.5rem] rounded-2xl" />
          <Skeleton className="min-h-[7.5rem] rounded-2xl" />
          <Skeleton className="col-span-2 min-h-[7.5rem] rounded-2xl" />
        </div>
      </section>

      <section className="min-w-0 w-full" aria-hidden>
        <div className="mb-3 flex items-center gap-2 px-1">
          <Skeleton className="h-3.5 w-3.5 rounded-full" />
          <Skeleton className="h-3 w-20 rounded-full" />
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-[4.25rem] w-full rounded-2xl" />
            <Skeleton className="h-[4.25rem] w-full rounded-2xl" />
          </div>
          <Skeleton className="h-[5.5rem] w-full rounded-2xl" />
          <Skeleton className="h-[3.75rem] w-full rounded-2xl" />
          <Skeleton className="h-[3.75rem] w-full rounded-2xl" />
        </div>
      </section>
    </div>
  );
}

function DashboardHomeSkeletonBase({ role }: { role?: string | null }) {
  const pathname = usePathname();
  const storeRole = useAuthStore((state) => state.role);

  // Papel derivado da rota (síncrono, primeiro frame). Sem isso, uma abertura a
  // frio em `/dashboard/tatuador` pintava o skeleton de cliente e só depois
  // trocava para o Atelier — exatamente o layout shift que estamos erradicando.
  const routeRole = pathname.startsWith('/dashboard/tatuador')
    ? 'tatuador'
    : pathname.startsWith('/dashboard/estudio')
      ? 'estudio'
      : pathname.startsWith('/dashboard/cliente')
        ? 'cliente'
        : null;

  const resolvedRole = normalizeAppRole(role ?? routeRole ?? storeRole);

  return (
    <div aria-hidden aria-busy="true">
      {resolvedRole === 'cliente' ? <DiscoverSkeleton /> : <AtelierHubSkeleton />}
    </div>
  );
}

export const DashboardHomeSkeleton = memo(DashboardHomeSkeletonBase);
