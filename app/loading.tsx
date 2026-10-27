import { BrandLogo } from '@/components/brand/brand-logo';
import { AppRouteSkeleton } from '@/components/ui/route-skeletons';

/**
 * Root route-level loading boundary.
 *
 * Renders a premium Dark Luxury skeleton (deep graphite canvas + official
 * TattooGo MK logo) that reserves the generic content geometry until the
 * segment resolves. Never a blank/black canvas.
 */
export default function Loading() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#121212]">
      <header className="z-50 shrink-0 border-b border-white/[0.05] bg-[#121212] pt-[env(safe-area-inset-top)]">
        <div className="relative h-14 min-h-14 max-h-14 w-full shrink-0">
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <BrandLogo className="h-auto w-auto px-0" size="sm" />
          </div>
        </div>
      </header>
      <AppRouteSkeleton />
    </div>
  );
}
