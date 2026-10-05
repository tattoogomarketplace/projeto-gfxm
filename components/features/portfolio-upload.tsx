'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { moderateImageWithGemini } from '@/lib/ai-moderation';
import { NeonButton } from '@/components/ui/neon-button';

const SAFETY_MESSAGE =
  'Conteúdo impróprio detectado. Upload bloqueado por violação das diretrizes.';

export function PortfolioUpload({ tatuadorId }: { tatuadorId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const content = { subtitle: 'Gerencie seu portfólio e alcance mais clientes.', cta: 'Ir para o Dashboard' };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void tatuadorId;

    setChecking(true);
    setFeedback(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        const isSafe = await moderateImageWithGemini(base64String);

        if (!isSafe) {
          setFeedback(SAFETY_MESSAGE);
          toast.error(SAFETY_MESSAGE);
          return;
        }

        setFeedback('Imagem aprovada. Publicação pronta para o portfólio.');
        toast.success('Imagem aprovada pelas diretrizes.');
      } catch {
        setFeedback(SAFETY_MESSAGE);
        toast.error(SAFETY_MESSAGE);
      } finally {
        setChecking(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 font-bold text-amber-500">Novo Post no Portfólio</h2>
      <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 transition-colors hover:border-amber-500 dark:border-zinc-700">
        <span className="text-neutral-500 dark:text-zinc-400">
          {checking ? 'Verificando conteúdo...' : 'Tirar foto ou escolher da galeria'}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleUpload}
          disabled={checking}
        />
      </label>
      {feedback ? (
        <p
          role="status"
          className="mt-3 rounded-xl border border-[#FF5722]/30 bg-[#FF5722]/8 px-3 py-2 text-xs leading-relaxed text-neutral-700 dark:text-zinc-300"
        >
          {feedback}
        </p>
      ) : null}
      <p className="mb-8 mt-3 max-w-sm text-neutral-500 dark:text-zinc-400">{content.subtitle}</p>
      <NeonButton onClick={() => router.push('/dashboard')}>{content.cta}</NeonButton>
    </div>
  );
}
