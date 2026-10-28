import { AgendaWorkspaceSkeleton } from '@/components/ui/destination-skeletons';

/**
 * Route-level fallback of `/dashboard/agenda`.
 *
 * Mounts the Agenda chrome (segmented control) on frame zero and overlays a
 * minimalist spinner in the content pane so hydration never blanks the tab.
 */
export default function AgendaLoading() {
  return <AgendaWorkspaceSkeleton />;
}
