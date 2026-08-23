'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/mock-services';

export default function EstudioDashboard() {
  const [tatuadores, setTatuadores] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
  const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Busca tatuadores vinculados ao estúdio
      const { data } = await supabase.from('perfis').select('*').eq('role', 'tatuador');
      setTatuadores(data || []);
    }
    load();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-[#121212] min-h-screen text-white">
      <h1 className="text-2xl font-bold text-amber-500 mb-8">Painel do Estúdio</h1>

      <div className="space-y-4">
        {tatuadores.map((t) => (
          <div key={t.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between">
            <span className="font-bold">{t.email}</span>
            <span className="text-zinc-400 text-sm">Status: {t.kyc_status}</span>
        </div>
        ))}
          </div>
    </motion.div>
  );
}

