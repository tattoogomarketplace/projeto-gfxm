import { ChatInboxSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/dashboard/chat`.
 *
 * Mounts the inbox chrome on frame zero and overlays a minimalist spinner in
 * the conversation pane so hydration never blanks the tab or shifts layout.
 */
export default function ChatLoading() {
  return <ChatInboxSkeleton />;
}
