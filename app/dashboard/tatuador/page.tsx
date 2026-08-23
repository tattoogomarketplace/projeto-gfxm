'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/mock-services';
import { PortfolioUpload } from '@/components/features/portfolio-upload';
import { ChatBox } from '@/components/features/chat/chat-box';

export default function TatuadorDashboard() {
  const [portfolio, setPortfolio] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
  const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('portfolios').select('*').eq('tatuador_id', user.id);
      setPortfolio(data || []);
    }
    load();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 p-6 bg-[#121212] min-h-screen text-white">
      <header>
        <h1 className="text-3xl font-bold text-amber-500">Painel do Artista</h1>
        <p className="text-zinc-400">Gerencie seus agendamentos, chat e portfólio.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gestão de Portfólio / Agendamentos */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 h-125">
          <h2 className="text-lg font-semibold text-white mb-4">Agenda do Dia</h2>
          <PortfolioUpload tatuadorId="me" />

          <div className="mt-8 grid grid-cols-2 gap-4">
            {portfolio.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.05 }}
                className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800"
              >
                <img src={item.url_imagem} alt="Tattoo" className="w-full h-40 object-cover" />
              </motion.div>
            ))}
        </div>
      </div>

        {/* Chat com Moderação de IA */}
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-white mb-4">Chat com Clientes</h2>
          <ChatBox />
    </div>
      </div>
    </motion.div>
  );
}
