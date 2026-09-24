import { createClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { resolveDisplayName } from '@/lib/utils/display-name';

interface DashboardPageProps {
  params: Promise<{ role: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { role } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userRole = user.user_metadata?.role || 'cliente';
  if (userRole !== role) {
    redirect(`/dashboard/${userRole}`);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white capitalize">Painel do {role}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder para conteúdo de cada perfil */}
        <div className="h-40 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <p className="text-zinc-400">Bem-vindo, {resolveDisplayName(user.user_metadata)}</p>
        </div>
      </div>
    </div>
  );
}
