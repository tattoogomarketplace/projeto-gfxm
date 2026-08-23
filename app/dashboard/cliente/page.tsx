import { createClient } from '@/lib/supabase';
import { PortfolioCard } from '@/components/features/portfolio-card';
import { Skeleton } from '@/components/ui/skeleton';

export default async function ClienteDashboard() {
  const supabase = createClient();
  
  // Busca funcional dos posts de tatuagem
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, image_url, artist_name')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white">Inspiração</h1>
        <p className="text-zinc-400">Tatuagens selecionadas para você.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {error ? (
           <div className="col-span-full p-8 text-center text-red-500 bg-red-900/10 rounded-2xl border border-red-900/20">
             Erro ao carregar feed. Verifique a conexão com o Supabase.
           </div>
        ) : posts && posts.length > 0 ? (
          posts.map((post) => (
            <PortfolioCard 
              key={post.id} 
              id={post.id} 
              imageUrl={post.image_url} 
              artistName={post.artist_name} 
            />
          ))
        ) : (
          [...Array(6)].map((_, i) => <Skeleton key={i} className="h-80 w-full" />)
        )}
      </div>
    </div>
  );
}
