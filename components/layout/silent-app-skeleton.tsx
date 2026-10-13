/**
 * Silent structural skeleton — the single boot surface.
 *
 * Rendered identically by `app/loading.tsx` and the `<ClerkLoading>` layer of
 * the Root Layout so the Next.js hydration gap and the auth resolution paint the
 * exact same static geometry. No logo, no wordmark, no spinner, no text and no
 * animation: only the Deep Graphite canvas plus the bottom navigation dock
 * structure of the final shell.
 *
 * Boot sequence: native iOS splash -> invisible skeleton -> authenticated UI.
 * This component is the only frame allowed between those two states, which is
 * what guarantees Absolute Zero Layout Shift.
 */

const NAV_ITEM_COUNT = 4;

export function SilentAppSkeleton() {
  return (
    <div
      aria-hidden
      aria-busy="true"
      className="fixed inset-0 z-[70] flex h-[100dvh] min-h-[100dvh] w-full flex-col overflow-hidden overscroll-none touch-none bg-zinc-950"
    >
      <div className="min-h-0 flex-1" />

      <nav className="glass-chrome fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-[60] mx-auto flex max-w-md transform-gpu items-center rounded-2xl border border-white/[0.05] px-1 py-1.5 shadow-2xl md:hidden">
        <ul className="grid h-11 w-full grid-cols-4">
          {Array.from({ length: NAV_ITEM_COUNT }, (_, index) => (
            <li key={index} className="flex">
              <div className="flex min-h-11 w-full min-w-11 flex-col items-center justify-center gap-1">
                <span className="h-5 w-5 rounded-full bg-white/5" />
                <span className="h-1.5 w-8 rounded-full bg-white/5" />
              </div>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
