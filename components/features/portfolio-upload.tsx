'use client';

import { moderateImageWithGemini } from '@/lib/ai-moderation';
import { useRouter } from 'next/navigation';
import { NeonButton } from '@/components/ui/neon-button';

export function PortfolioUpload({ tatuadorId }: { tatuadorId: string }) {
  const router = useRouter();
  const content = { subtitle: "Gerencie seu portfólio e alcance mais clientes.", cta: "Ir para o Dashboard" };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void tatuadorId;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      const isSafe = await moderateImageWithGemini(base64String);

      if (!isSafe) {
        alert("Conteúdo impróprio detectado. Upload bloqueado por violação das diretrizes.");
        return;
      }

      return;
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

