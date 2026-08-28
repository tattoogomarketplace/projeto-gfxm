'use client';

import { useState, useEffect } from 'react';
import { useAgendamentos } from '@/hooks/use-agendamentos';
import { GlassContainer } from '@/components/ui/glass-container';
import { perfilService } from '@/lib/services/perfil-service';
import { GeoFilter } from '@/components/shared/geo-filter';

export default function ClienteDashboard() {
  const { data: agendamentos, isLoading } = useAgendamentos();
  const [artistas, setArtistas] = useState<any[]>([]);
  const [cidade, setCidade] = useState('');

  useEffect(() => {
    perfilService.listarArtistas({ cidade }).then(setArtistas);
  }, [cidade]);

  return (
    <div className="p-8 text-white min-h-screen bg-graphite">
      <h1 className="text-2xl font-bold mb-6">Seus Agendamentos</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Encontrar Artistas</h2>
        <GeoFilter onChange={setCidade} />
        <div className="grid grid-cols-2 gap-4">
          {artistas.map(a => (
            <div key={a.id} className="p-3 bg-zinc-900 rounded-lg">{a.email}</div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-24 bg-graphite-200 animate-pulse rounded-xl" />
          <div className="h-24 bg-graphite-200 animate-pulse rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-4">
          {agendamentos?.map((ag: any) => (
            <GlassContainer key={ag.id} className="p-4">
              <h2 className="font-bold text-neon-orange">{ag.status}</h2>
              <p className="text-sm">Data: {new Date(ag.data_hora).toLocaleDateString()}</p>
            </GlassContainer>
          ))}
          {(!agendamentos || agendamentos.length === 0) && (
            <p className="text-zinc-400">Nenhum agendamento encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}

