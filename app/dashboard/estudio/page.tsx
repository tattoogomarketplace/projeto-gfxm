'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/mock-services';
import { KYCForm } from '@/components/features/kyc-form';

export default function EstudioDashboard() {
  const [tatuadores, setTatuadores] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
  const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from('estudio_tatuadores').select('tatuador_id, perfis:tatuador_id(id, email, kyc_status)').eq('estudio_id', user.id).eq('status_vinculo', 'ativo');
      setTatuadores(data || []);
    }
    load();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-[#121212] min-h-screen text-white">
      <h1 className="text-2xl font-bold text-amber-500 mb-8">Painel do Estúdio</h1>

      {userId && <div className="mb-8"><KYCForm userId={userId} /></div>}

      <div className="space-y-4">
        {tatuadores.map((t: any) => (
          <div key={t.tatuador_id || t.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between">
            <span className="font-bold">{t.perfis?.email || t.email}</span>
            <span className="text-zinc-400 text-sm">Status: {t.perfis?.kyc_status || t.kyc_status}</span>
        </div>
        ))}
          </div>
    </motion.div>
  );
}

