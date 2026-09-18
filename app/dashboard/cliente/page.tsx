'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/mock-services';
import { maskEmail } from '@/lib/utils/security';
import { GeoFilter } from '@/components/shared/geo-filter';
import { perfilService } from '@/lib/services/perfil-service';
import { ChatBox } from '@/components/features/chat/chat-box';
import { PortfolioCard } from '@/components/features/portfolio-card';
import { getCachedFeed } from '@/lib/catalogo';
import type { AgendamentoResumo, ArtistaResumo, FeedItem } from '@/lib/types/database';
import { useUiStore } from '@/hooks/use-ui-store';
import { resolveDisplayName } from '@/lib/utils/display-name';
export default function ClienteDashboard() {
  const [profile, setProfile] = useState<{ id: string; email: string; fullName: string } | null>(null);
  const [agendamentos, setAgendamentos] = useState<AgendamentoResumo[]>([]);
  const [artistas, setArtistas] = useState<ArtistaResumo[]>([]);
  const [cidade, setCidade] = useState('');
  const [chatPeer, setChatPeer] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: p } = await supabase.from('perfis').select('id, email').eq('id', user.id).maybeSingle();
      const { data: a } = await supabase.from('agendamentos').select('id, data_hora, status').eq('cliente_id', user.id);

      setProfile({
        id: p?.id || user.id,
        email: p?.email || user.email || '',
        fullName: resolveDisplayName(user.user_metadata),
      });
      setAgendamentos(a || []);
    }
    load();
  }, []);

  useEffect(() => {
    perfilService.listarArtistas({ cidade }).then(setArtistas).catch(() => setArtistas([]));
  }, [cidade]);

  useEffect(() => {
    getCachedFeed().then(setFeed).catch(() => setFeed([]));
  }, []);

  const activeTab = useUiStore((s) => s.activeTab);

  if (!profile) return <div className="text-white p-10">Carregando painel de elite...</div>;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-6 bg-[#121212] min-h-full text-white">
      <div className="glass-panel p-6 rounded-3xl mb-6">
        <h1 className="text-2xl font-bold text-amber-500">Bem-vindo, {profile.fullName}</h1>
        <p className="text-zinc-400">Email: {maskEmail(profile.email)}</p>
      </div>
      {activeTab === 'chat' || activeTab === 'portfolio' ? (
        <>
          {activeTab === 'chat' ? (
            <>
              <h2 className="text-xl font-bold mb-4">Encontrar Artistas</h2>
              <GeoFilter onChange={setCidade} />
              <div className="grid grid-cols-2 gap-4 mb-8">
                {artistas.map((a) => (
                  <button key={a.id} onClick={() => setChatPeer(a.id)} className="p-3 bg-zinc-900 rounded-lg text-left min-h-11 active:scale-95">
                    {a.email}
                  </button>
                ))}
              </div>
              {chatPeer && <div className="mb-8"><ChatBox destinatarioId={chatPeer} /></div>}
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {feed.map((item) => (
                <PortfolioCard key={item.id} id={item.id} imageUrl={item.url_imagem} artistName={item.estilo} initialLikes={item.likes_count || 0} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold mb-4">Meus Agendamentos</h2>
          <div className="space-y-4">
            {agendamentos.length > 0 ? agendamentos.map((a) => (
              <div key={a.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex min-h-11 items-center justify-between">
                <span>{new Date(a.data_hora).toLocaleDateString()}</span>
                <span className="text-amber-500 font-bold">{a.status}</span>
              </div>
            )) : (
              <div className="text-zinc-600 italic">Nenhum agendamento encontrado.</div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

