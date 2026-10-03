import { Sparkles } from 'lucide-react';
import { requireDashboardPerfil } from '@/lib/utils/dashboard-gate';
import { Skeleton } from '@/components/ui/skeleton';

export default async function DashboardAiPage() {
  await requireDashboardPerfil();

  return (
    <div className="screen-fade-in mx-auto flex w-full max-w-app flex-col px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <section className="glass-panel relative overflow-hidden rounded-2xl p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#F97316]/15 blur-2xl" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-[#F97316]/40 bg-[#1a1a1a] text-[#F97316] shadow-[0_0_16px_rgba(249,115,22,0.28)]">
            <Sparkles className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#F97316]">
              Assistente IA
            </p>
            <h2 className="mt-1 text-[17px] font-semibold tracking-tight text-[#F5F5F5]">
              TattooGo Studio
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
              Ideias de tattoo, estilos e referências — em breve no chat.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-1 flex-col gap-3">
        <div className="flex justify-start">
          <Skeleton className="h-16 w-[78%] rounded-2xl rounded-tl-md bg-zinc-800/70" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-12 w-[62%] rounded-2xl rounded-tr-md bg-[#F97316]/15" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-20 w-[84%] rounded-2xl rounded-tl-md bg-zinc-800/70" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-[46%] rounded-2xl rounded-tr-md bg-[#F97316]/15" />
        </div>
      </div>

      <div className="mt-8 glass-panel flex items-center gap-3 rounded-2xl px-4 py-3">
        <Skeleton className="h-5 flex-1 rounded-full bg-zinc-800/80" />
        <div className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-[#F97316]/30 bg-[#1a1a1a] text-[#F97316]/70">
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
