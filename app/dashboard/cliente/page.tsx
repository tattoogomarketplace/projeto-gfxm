'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/mock-services';
import { maskEmail } from '@/lib/utils/security';
export default function ClienteDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);

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

  if (!profile) return <div className="text-white p-10">Carregando painel de elite...</div>;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-[#121212] min-h-screen text-white">
      <div className="backdrop-blur-md bg-zinc-900/40 border border-zinc-800 p-6 rounded-3xl mb-8">
        <h1 className="text-2xl font-bold text-amber-500">Bem-vindo, {profile.email.split('@')[0]}</h1>
        <p className="text-zinc-400">Email: {maskEmail(profile.email)}</p>
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

