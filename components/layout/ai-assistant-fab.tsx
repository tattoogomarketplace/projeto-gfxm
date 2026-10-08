'use client';

import { memo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

function AiAssistantFabBase() {
  const pathname = usePathname();
  const router = useRouter();
  const constraintsRef = useRef<HTMLDivElement>(null);

  // O FAB só pertence ao casco padrão. Nas rotas "sem casco" (onboarding, IA,
  // KYC e "Quero ser Tatuador") ele não era renderizado antes de o AppShell
  // passar a cobri-las, então mantemos o mesmo comportamento.
  if (
    pathname.startsWith('/dashboard/onboarding') ||
    pathname.startsWith('/dashboard/ai') ||
    pathname.startsWith('/dashboard/kyc-pendente') ||
    pathname.startsWith('/dashboard/seja-tatuador')
  ) {
    return null;
  }

  return (
    <div
      ref={constraintsRef}
      className="pointer-events-none fixed bottom-[calc(var(--dock-clearance)+0.25rem)] right-[max(1.25rem,env(safe-area-inset-right))] z-[60] w-12 md:bottom-5"
      style={{
        top: 'calc(env(safe-area-inset-top) + 4.5rem)',
      }}
    >
      <motion.button
        type="button"
        drag="y"
        dragConstraints={constraintsRef}
        dragElastic={0.06}
        dragMomentum={false}
        onClick={() => router.push('/dashboard/ai')}
        aria-label="Abrir assistente de IA"
        style={{ touchAction: 'none' }}
        className={cn(
          'pointer-events-auto absolute bottom-0 right-0 flex h-12 w-12 min-h-11 min-w-11 items-center justify-center rounded-full',
          'bg-white text-[#F97316] dark:bg-[#1a1a1a]',
          'border border-[#F97316]/50',
          'shadow-[0_0_18px_rgba(249,115,22,0.35),0_8px_24px_rgba(0,0,0,0.45)]',
          'hover:border-[#F97316] hover:shadow-[0_0_28px_rgba(249,115,22,0.55)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]',
          'ai-fab-pulse cursor-grab active:cursor-grabbing'
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-[#F97316]/10 blur-md"
        />
        <Sparkles className="relative h-5 w-5" strokeWidth={1.75} />
      </motion.button>
    </div>
  );
}

export const AiAssistantFab = memo(AiAssistantFabBase);
