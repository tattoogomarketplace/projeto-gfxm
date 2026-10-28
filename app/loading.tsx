'use client';

import { BootShellSkeleton } from '@/components/layout/boot-shell-skeleton';

/**
 * Root route-level loading boundary.
 *
 * Last-resort fallback. Uses the same AppShell header geometry and the
 * destination-route skeleton (via BootShellSkeleton) so authenticated
 * dashboard entry never paints a second, generic screen.
 */
export default function Loading() {
  return <BootShellSkeleton />;
}
