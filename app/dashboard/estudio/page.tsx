import { createClient } from '@/lib/supabase';

export default async function EstudioDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white">Painel do Estúdio</h1>
        <p className="text-zinc-400">Gestão de artistas e métricas de faturamento.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Métricas de Comissão */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-sm text-zinc-400 uppercase tracking-wider mb-2">Comissão (2% CNPJ)</h2>
          <p className="text-3xl font-bold text-orange-500">R$ 0,00</p>
        </div>

        {/* Gestão de Artistas */}
        <div className="col-span-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Artistas Vinculados</h2>
          <div className="h-40 flex items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-xl">
            Nenhum artista vinculado ao estúdio.
          </div>
        </div>
      </div>
    </div>
  );
}
