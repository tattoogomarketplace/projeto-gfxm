'use client';

import { supabase } from '@/lib/mock-services';
import { moderateImageWithGemini } from '@/lib/ai-moderation';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { NeonButton } from '@/components/ui/neon-button';

export function PortfolioUpload({ tatuadorId }: { tatuadorId: string }) {
  const router = useRouter();
  const content = { subtitle: "Gerencie seu portfólio e alcance mais clientes.", cta: "Ir para o Dashboard" };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Converter arquivo para base64 para o Gemini
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];

      // 2. Moderação Real com Gemini
      const isSafe = await moderateImageWithGemini(base64String);
      
      if (!isSafe) {
        alert("Conteúdo impróprio detectado. Upload bloqueado por violação das diretrizes.");
        return;
      }

      // 3. Upload para o Storage real
      const { data, error } = await supabase.storage
        .from('portfolios')
        .upload(`${tatuadorId}/${Date.now()}.jpg`, file);

      if (error) {
        alert("Erro no upload: " + error.message);
        return;
      }

      // 4. Persistência real no Banco
      await supabase.from('portfolios').insert({
        tatuador_id: tatuadorId,
        url_imagem: data.path,
        estilo: 'Realismo'
      });

      alert("Foto moderada e publicada com sucesso!");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
      <h2 className="text-amber-500 font-bold mb-4">Novo Post no Portfólio</h2>
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-amber-500">
        <span className="text-zinc-400">Tirar foto ou escolher da galeria</span>
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          onChange={handleUpload} 
        />
      </label>
      <p className="text-zinc-400 mb-8 max-w-sm">{content.subtitle}</p>
      <NeonButton onClick={() => router.push('/dashboard')}>{content.cta}</NeonButton>
    </div>
  );
}

