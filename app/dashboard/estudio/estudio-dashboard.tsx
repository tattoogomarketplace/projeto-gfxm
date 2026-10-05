'use client';

import { useAgendamentos } from '@/hooks/use-agendamentos';
import { GlassContainer } from '@/components/ui/glass-container';
import { StudioIncomingRequests } from '@/components/features/studio-incoming-requests';
import { getRoleExperience } from '@/lib/content/role-experience';
import type { Agendamento } from '@/lib/types/database';

const EXPERIENCE = getRoleExperience('estudio').dashboard;

export default function EstudioDashboard() {
  const { data: agendamentos, isLoading } = useAgendamentos();

  return (
    <div className="min-h-screen flex flex-col dark:bg-black bg-neutral-50 p-8 text-neutral-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-1">{EXPERIENCE.heading}</h1>
      <p className="mb-6 text-sm text-neutral-600 dark:text-zinc-400">{EXPERIENCE.subtitle}</p>
      
      {isLoading ? (
        <div className="space-y-4">
           <div className="h-24 animate-pulse rounded-xl bg-neutral-200 dark:bg-graphite-200" />
        </div>
      ) : (
        <div className="grid gap-4">
          <GlassContainer className="p-6">
            <h2 className="text-xl font-bold mb-2">Total de Agendamentos</h2>
            <p className="text-4xl text-neon-orange font-bold">
              {agendamentos?.length || 0}
            </p>
          </GlassContainer>
          
          <div className="mt-6">
            <h3 className="font-bold mb-4">Visão Geral dos Artistas</h3>
            {agendamentos?.map((ag: Agendamento, index: number) => (
              <div key={ag?.id ?? `agendamento-${index}`} className="text-sm border-b border-white/10 py-2">
                Artista ID: {(ag?.tatuador_id ?? '').slice(0, 8) || '—'}... | Status: {ag?.status ?? 'pendente'}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <StudioIncomingRequests />
      </div>
    </div>
  );
}
