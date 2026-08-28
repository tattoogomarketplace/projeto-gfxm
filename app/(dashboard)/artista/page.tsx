'use client';

import { useAgendamentos } from '@/hooks/use-agendamentos';
import { GlassContainer } from '@/components/ui/glass-container';

export default function ArtistaDashboard() {
  const { data: agendamentos, isLoading } = useAgendamentos();

  return (
    <div className="p-8 text-white min-h-screen bg-graphite">
      <h1 className="text-2xl font-bold mb-6">Gestão de Agendamentos</h1>
      
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-24 bg-graphite-200 animate-pulse rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-4">
          {agendamentos?.map((ag: any) => (
            <GlassContainer key={ag.id} className="p-4 border-l-4 border-neon-orange">
              <div className="flex justify-between items-center">
                <h2 className="font-bold">Cliente ID: {ag.cliente_id.slice(0, 8)}...</h2>
                <span className="text-neon-orange uppercase text-xs font-bold">{ag.status}</span>
              </div>
              <p className="text-sm mt-2">Data: {new Date(ag.data_hora).toLocaleString()}</p>
            </GlassContainer>
          ))}
          {(!agendamentos || agendamentos.length === 0) && (
            <p className="text-zinc-400">Nenhum agendamento pendente.</p>
          )}
        </div>
      )}
    </div>
  );
}
