import { createClient } from '@/lib/supabase';
import { ChatBox } from '@/components/features/chat/chat-box';

export default async function TatuadorDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white">Painel do Tatuador</h1>
        <p className="text-zinc-400">Gerencie seus agendamentos, chat e portfólio.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gestão de Portfólio / Agendamentos */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 h-125">
          <h2 className="text-lg font-semibold text-white mb-4">Agenda do Dia</h2>
          {/* Componente de agenda virá aqui */}
        </div>

        {/* Chat com Moderação de IA */}
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-white mb-4">Chat com Clientes</h2>
          <ChatBox />
        </div>
      </div>
    </div>
  );
}
