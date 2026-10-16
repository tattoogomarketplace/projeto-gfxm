import { ChatInboxSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/dashboard/chat`.
 *
 * Mirrors the inbox chrome (glass header + search, category tabs, conversation
 * list) and the desktop split view, so the hydrated workspace lands with zero
 * layout shift.
 */
export default function ChatLoading() {
  return <ChatInboxSkeleton />;
}
