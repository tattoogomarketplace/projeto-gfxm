'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/use-auth-store';
import { dashboardPathForRole } from '@/lib/utils/auth-redirect';

export function AiChatHeader() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(dashboardPathForRole(role) || '/dashboard/cliente');
  };

  return (
    <header className="z-40 shrink-0 border-b border-white/5 bg-[color-mix(in_srgb,var(--background)_80%,transparent)] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="flex min-h-11 items-center gap-2 px-4 pb-3">
        <button
          type="button"
          onClick={handleBack}
          className="-ml-2 inline-flex min-h-11 min-w-11 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold tracking-tight text-zinc-400 transition-colors hover:text-[#F97316]"
          aria-label="Voltar"
        >
          <span aria-hidden="true">&lt;</span>
          Voltar
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold tracking-tight text-[#F5F5F5]">
          Assistente IA
        </h1>
        <span className="inline-flex min-w-11" aria-hidden="true" />
      </div>
    </header>
  );
}
