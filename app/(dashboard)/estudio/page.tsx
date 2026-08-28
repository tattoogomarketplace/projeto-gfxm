'use client';

import { useAgendamentos } from '@/hooks/use-agendamentos';
import { GlassContainer } from '@/components/ui/glass-container';

export default function EstudioDashboard() {
  const { data: agendamentos, isLoading } = useAgendamentos();

  return (
    <div className="p-8 text-white min-h-screen bg-graphite">
      <h1 className="text-2xl font-bold mb-6">Métricas do Estúdio</h1>
      
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-24 bg-graphite-200 animate-pulse rounded-xl" />
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
            {agendamentos?.map((ag: any) => (
              <div key={ag.id} className="text-sm border-b border-white/10 py-2">
                Artista ID: {ag.tatuador_id.slice(0, 8)}... | Status: {ag.status}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
