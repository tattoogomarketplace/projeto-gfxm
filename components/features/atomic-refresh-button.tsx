'use client';

import { useCallback, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { InstagramSpinner } from '@/components/ui/instagram-spinner';
import { OrganicInkGlow } from '@/components/ui/organic-ink-glow';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

const TITANIUM_SHADOW =
  'drop-shadow(0px 1px 1.5px rgba(0,0,0,0.9)) drop-shadow(0px 4px 10px rgba(0,0,0,0.5))';
const SPIN_MS = 550;
const MIN_SYNC_MS = 480;
const SPIN_EASE = [0.22, 1, 0.36, 1] as const;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function AtomicRefreshButton({
  holoId,
  className,
}: {
  holoId: string;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const { triggerHaptic } = useHapticFeedback();
  const [syncing, setSyncing] = useState(false);
  const [spinNonce, setSpinNonce] = useState(0);
  const syncingRef = useRef(false);

  const isolatePointer = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  }, []);

  const handleRefresh = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (syncingRef.current) return;
      syncingRef.current = true;
      triggerHaptic('medium');
      setSpinNonce((current) => current + 1);
      setSyncing(true);
      try {
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['gallery', 'feed'] }),
          wait(MIN_SYNC_MS),
        ]);
      } catch {
        void 0;
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    },
    [queryClient, triggerHaptic]
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-30 transform-gpu">
      <button
        type="button"
        data-no-dismiss
        onPointerDown={isolatePointer}
        onClick={handleRefresh}
        disabled={syncing}
        aria-label="Atualizar feed"
        aria-busy={syncing}
        className={cn(
          'pointer-events-auto absolute z-30 flex h-11 min-h-11 w-11 min-w-11 items-center justify-center overflow-visible rounded-full',
          'bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]',
          'border border-white/10 bg-white/5 backdrop-blur-xl transform-gpu will-change-transform',
          'shadow-[0_1px_1px_rgba(255,255,255,0.08)_inset,0_8px_24px_rgba(0,0,0,0.28)]',
          'disabled:opacity-100',
          className
        )}
        style={{ filter: TITANIUM_SHADOW }}
      >
        {syncing ? <OrganicInkGlow className="opacity-80" /> : null}
        <motion.span
          key={spinNonce}
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: SPIN_MS / 1000, ease: SPIN_EASE }}
          className="relative z-10 inline-flex transform-gpu will-change-transform"
        >
          <RefreshCw
            className="h-4 w-4"
            stroke={`url(#${holoId})`}
            strokeWidth={2}
            fill="none"
          />
        </motion.span>
      </button>

      <AnimatePresence>
        {syncing ? (
          <motion.div
            key="ink-sync"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-x-0 top-0 z-[25] flex justify-center transform-gpu will-change-transform"
            style={{ paddingTop: 'max(4.25rem, calc(env(safe-area-inset-top, 0px) + 2.75rem))' }}
            role="status"
            aria-live="polite"
            aria-label="Sincronizando feed"
          >
            <span className="relative flex h-11 w-11 items-center justify-center text-white/80">
              <InstagramSpinner size={28} />
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
