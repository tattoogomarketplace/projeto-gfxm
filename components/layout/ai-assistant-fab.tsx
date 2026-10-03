'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AiAssistantFab() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith('/dashboard/onboarding') || pathname.startsWith('/dashboard/ai')) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.push('/dashboard/ai')}
      aria-label="Abrir assistente de IA"
      className={cn(
        'fixed z-50 flex h-14 w-14 min-h-14 min-w-14 items-center justify-center rounded-full',
        'bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[calc(1.25rem+env(safe-area-inset-right))]',
        'bg-[#1a1a1a] text-[#F97316]',
        'border border-[#F97316]/50',
        'shadow-[0_0_18px_rgba(249,115,22,0.35),0_8px_24px_rgba(0,0,0,0.45)]',
        'transition-transform duration-200 ease-out',
        'hover:scale-105 hover:border-[#F97316] hover:shadow-[0_0_28px_rgba(249,115,22,0.55)]',
        'active:scale-95',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212]',
        'ai-fab-pulse'
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-[#F97316]/10 blur-md"
      />
      <Sparkles className="relative h-6 w-6" strokeWidth={1.75} />
    </button>
  );
}
