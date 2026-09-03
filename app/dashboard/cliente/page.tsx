'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/mock-services';
import { maskEmail } from '@/lib/utils/security';
import { GeoFilter } from '@/components/shared/geo-filter';
import { perfilService } from '@/lib/services/perfil-service';
import { ChatBox } from '@/components/features/chat/chat-box';
import { PortfolioCard } from '@/components/features/portfolio-card';
export default function ClienteDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [artistas, setArtistas] = useState<any[]>([]);
  const [cidade, setCidade] = useState('');
  const [chatPeer, setChatPeer] = useState<string | null>(null);
  const [feed, setFeed] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: p } = await supabase.from('perfis').select('*').eq('id', user.id).single();
      const { data: a } = await supabase.from('agendamentos').select('*').eq('cliente_id', user.id);

      setProfile(p);
      setAgendamentos(a || []);
    }
    load();
  }, []);

  useEffect(() => {
    perfilService.listarArtistas({ cidade }).then(setArtistas).catch(() => setArtistas([]));
  }, [cidade]);

  useEffect(() => {
    supabase.from('portfolios').select('id, url_imagem, likes_count, estilo').order('created_at', { ascending: false }).limit(24)
      .then(({ data }) => setFeed(data || []));
  }, []);

  if (!profile) return <div className="text-white p-10">Carregando painel de elite...</div>;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-[#121212] min-h-screen text-white">
      <div className="backdrop-blur-md bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl mb-8">
        <h1 className="text-2xl font-bold text-amber-500">Bem-vindo, {profile.email.split('@')[0]}</h1>
        <p className="text-zinc-400">Email: {maskEmail(profile.email)}</p>
      </div>
      <h2 className="text-xl font-bold mb-4">Encontrar Artistas</h2>
      <GeoFilter onChange={setCidade} />
      <div className="grid grid-cols-2 gap-4 mb-8">
        {artistas.map((a) => (
          <button key={a.id} onClick={() => setChatPeer(a.id)} className="p-3 bg-zinc-900 rounded-lg text-left min-h-11">
            {a.email}
          </button>
        ))}
      </div>
      {chatPeer && <div className="mb-8"><ChatBox destinatarioId={chatPeer} /></div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {feed.map((item) => (
          <PortfolioCard key={item.id} id={item.id} imageUrl={item.url_imagem} artistName={item.estilo} initialLikes={item.likes_count || 0} />
        ))}
      </div>
      <h2 className="text-xl font-bold mb-4">Meus Agendamentos</h2>
      <div className="space-y-4">
        {agendamentos.length > 0 ? agendamentos.map((a) => (
          <div key={a.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between">
            <span>{new Date(a.data_hora).toLocaleDateString()}</span>
            <span className="text-amber-500 font-bold">{a.status}</span>
          </div>
        )) : (
          <div className="text-zinc-600 italic">Nenhum agendamento encontrado.</div>
        )}
      </div>
    </motion.div>
  );
}

