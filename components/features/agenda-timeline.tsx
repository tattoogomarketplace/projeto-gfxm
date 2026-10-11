'use client';

import type { ReactNode } from 'react';
import { ClientTimelineTracker } from '@/components/features/client-timeline-tracker';
import type { Agendamento } from '@/lib/types/database';

/**
 * Vertical agenda timeline for the client dashboard.
 *
 * Thin, backward-compatible facade over `ClientTimelineTracker`: the workspace
 * keeps importing `AgendaTimeline` with the exact same props while the journey
 * rendering (progressive status nodes, badges and expandable detail) lives in
 * the dedicated tracker component.
 */
export function AgendaTimeline({
  agendamentos,
  isLoading,
}: {
  agendamentos?: Agendamento[];
  isLoading?: boolean;
}): ReactNode {
  return <ClientTimelineTracker agendamentos={agendamentos} isLoading={isLoading} />;
}
