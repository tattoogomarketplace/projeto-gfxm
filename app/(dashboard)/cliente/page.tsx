'use client';

import { useState, useEffect } from 'react';
import { useAgendamentos } from '@/hooks/use-agendamentos';
import { GlassContainer } from '@/components/ui/glass-container';
import { perfilService } from '@/lib/services/perfil-service';
import { GeoFilter } from '@/components/shared/geo-filter';
import { ChatBox } from '@/components/features/chat/chat-box';
import { PortfolioCard } from '@/components/features/portfolio-card';
import { createClient } from '@/lib/supabase';

export default function ClienteDashboard() {
  const { data: agendamentos, isLoading } = useAgendamentos();
  const [artistas, setArtistas] = useState<any[]>([]);
  const [cidade, setCidade] = useState('');
  const [chatPeer, setChatPeer] = useState<string | null>(null);
  const [feed, setFeed] = useState<any[]>([]);

  useEffect(() => {
    perfilService.listarArtistas({ cidade }).then(setArtistas);
  }, [cidade]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('portfolios')
      .select('id, url_imagem, likes_count, tatuador_id, estilo')
      .order('created_at', { ascending: false })
      .limit(24)
      .then(({ data }) => setFeed(data || []));
  }, []);

  return (
    <div className="p-8 text-white min-h-screen bg-graphite">
      <h1 className="text-2xl font-bold mb-6">Seus Agendamentos</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Encontrar Artistas</h2>
        <GeoFilter onChange={setCidade} />
        <div className="grid grid-cols-2 gap-4">
          {artistas.map(a => (
            <button key={a.id} onClick={() => setChatPeer(a.id)} className="p-3 bg-zinc-900 rounded-lg text-left min-h-11">
              {a.email}
              {a.cidade ? <span className="block text-xs text-zinc-500">{a.cidade}/{a.estado}</span> : null}
            </button>
          ))}
        </div>
        {chatPeer && (
          <div className="mt-4">
            <ChatBox destinatarioId={chatPeer} />
          </div>
        )}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {feed.map((item) => (
            <PortfolioCard
              key={item.id}
              id={item.id}
              imageUrl={item.url_imagem}
              artistName={item.estilo}
              initialLikes={item.likes_count || 0}
            />
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

