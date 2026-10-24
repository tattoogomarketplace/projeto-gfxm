'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { OptimizedImage } from '@/components/ui/optimized-image';

export type SpotlightClient = {
  username: string;
  avatarUrl?: string | null;
};

type SpotlightModalProps = {
  client: SpotlightClient | null;
  onClose: () => void;
};

const clientMountedSubscribe = () => () => {};

function formatHandle(username: string): string {
  const handle = username.trim().replace(/^@+/, '');
  return handle ? `@${handle}` : '@visitante';
}

export function SpotlightModal({ client, onClose }: SpotlightModalProps) {
  const mounted = useSyncExternalStore(clientMountedSubscribe, () => true, () => false);
  const open = Boolean(client);
  const handle = client ? formatHandle(client.username) : '';
  const initial = handle.replace(/^@/, '').charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && client ? (
        <motion.div
          key="spotlight-modal"
          role="dialog"
          aria-modal="true"
          aria-label={handle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#000000]/80 backdrop-blur-2xl"
          onClick={onClose}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[70%] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#FF6600]/40 via-[#121212]/0 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[62%] w-[38%] -translate-x-1/2 bg-[linear-gradient(to_bottom,rgba(255,102,0,0.28)_0%,rgba(255,102,0,0.08)_42%,transparent_100%)] blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[18%] h-64 w-64 -translate-x-1/2 rounded-full bg-[#FF6600]/20 blur-3xl animate-pulse"
          />

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.85 }}
            className="relative z-10 flex flex-col items-center px-6"
            onClick={(event) => event.stopPropagation()}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-6 rounded-full bg-[#FF6600]/25 blur-2xl"
              />
              {client.avatarUrl ? (
                <OptimizedImage
                  src={client.avatarUrl}
                  alt={handle}
                  className="h-32 w-32 overflow-hidden rounded-full object-cover ring-2 ring-[#FF6600]/50 shadow-[0_0_50px_rgba(255,102,0,0.6)]"
                />
              ) : (
                <span className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-zinc-900 text-4xl font-semibold uppercase text-white ring-2 ring-[#FF6600]/50 shadow-[0_0_50px_rgba(255,102,0,0.6)]">
                  {initial}
                </span>
              )}
            </motion.div>
            <p className="mt-8 text-center text-[22px] font-bold tracking-wide text-white [text-shadow:0_0_24px_rgba(255,255,255,0.45)]">
              {handle}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
