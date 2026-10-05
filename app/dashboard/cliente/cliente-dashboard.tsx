'use client';

import { Suspense, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Sparkles } from 'lucide-react';
import { useAgendamentos } from '@/hooks/use-agendamentos';
import { GlassContainer } from '@/components/ui/glass-container';
import { ChatWorkspace } from '@/components/features/chat/chat-workspace';
import { GaleriaInspiracoes } from '@/components/features/galeria-inspiracoes';
import { Skeleton } from '@/components/ui/skeleton';
import { getRoleExperience } from '@/lib/content/role-experience';
import type { Agendamento } from '@/lib/types/database';
import { useUiStore } from '@/hooks/use-ui-store';

const EXPERIENCE = getRoleExperience('cliente').dashboard;

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400 shadow-[0_0_18px_rgba(249,115,22,0.22)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="bg-gradient-to-r from-neutral-900 via-orange-700 to-orange-500 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-white dark:via-orange-100 dark:to-orange-400">
          {title}
        </h2>
        {subtitle ? <p className="mt-0.5 text-sm text-neutral-600 dark:text-zinc-400">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export default function ClienteDashboard() {
  const router = useRouter();
  const { data: agendamentos, isLoading } = useAgendamentos();

  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const setPendingChatPeer = useUiStore((s) => s.setPendingChatPeer);
  const setPendingChatArtwork = useUiStore((s) => s.setPendingChatArtwork);

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-transparent px-4 pb-8 pt-5 text-neutral-900 transition-opacity duration-300 ease-in-out dark:text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(249,115,22,0.18),transparent_65%)]"
      />

      <div className="relative space-y-6">
        <header className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm backdrop-blur-md transition-colors hover:border-orange-500/30 dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-orange-500/20 blur-3xl"
          />
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-orange-500/40 bg-white text-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.3)] dark:bg-[#1a1a1a] dark:text-orange-400">
              <Sparkles className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">
                TattooGo MK
              </p>
              <h1 className="mt-0.5 bg-gradient-to-r from-neutral-900 via-orange-700 to-orange-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-white dark:via-orange-100 dark:to-orange-400">
                {EXPERIENCE.title}
              </h1>
            </div>
          </div>
          <p className="relative mt-3 text-sm leading-relaxed text-neutral-600 dark:text-zinc-400">{EXPERIENCE.subtitle}</p>
        </header>

        {activeTab === 'agendar' && (
          <section key="agendar" className="screen-fade-in space-y-4 transition-opacity duration-300 ease-in-out">
            <SectionHeading
              icon={<CalendarDays className="h-5 w-5" strokeWidth={1.75} />}
              title={EXPERIENCE.heading}
              subtitle="Acompanhe o status das suas sessões."
            />
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ) : (
              <div className="grid gap-4">
                {agendamentos?.map((ag: Agendamento, index: number) => (
                  <GlassContainer
                    key={ag?.id ?? `agendamento-${index}`}
                    className="group relative min-h-11 overflow-hidden border-white/10 p-4 transition-colors hover:border-orange-500/40"
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-orange-500/0 blur-2xl transition-colors group-hover:bg-orange-500/15"
                    />
                    <div className="relative flex items-center justify-between gap-3">
                      <span className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-400">
                        {ag?.status ?? 'pendente'}
                      </span>
                      <span className="text-xs font-medium text-zinc-400">
                        {ag?.data_hora ? new Date(ag.data_hora).toLocaleDateString() : '—'}
                      </span>
                    </div>
                  </GlassContainer>
                ))}
                {(!agendamentos || agendamentos.length === 0) && (
                  <GlassContainer className="border-dashed border-white/10 p-6 text-center">
                    <p className="text-sm text-zinc-400">Nenhum agendamento encontrado.</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Sua próxima obra-prima começa com um agendamento.
                    </p>
                  </GlassContainer>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === 'chat' && (
          <section key="chat" className="screen-fade-in -mx-4 min-h-0 flex-1 sm:-mx-6">
            <Suspense fallback={<Skeleton className="h-[28rem] w-full rounded-2xl" />}>
              <ChatWorkspace />
            </Suspense>
          </section>
        )}

        {activeTab === 'portfolio' && (
          <section key="portfolio" className="screen-fade-in space-y-4 transition-opacity duration-300 ease-in-out">
            <GaleriaInspiracoes
              onStartConversation={(tatuadorId, artworkId) => {
                setPendingChatPeer(tatuadorId);
                setPendingChatArtwork(artworkId);
                setActiveTab('chat');
                const params = new URLSearchParams({ artistId: tatuadorId, artworkId });
                router.push(`/dashboard/chat?${params.toString()}`);
              }}
            />
          </section>
        )}
      </div>
    </div>
  );
}
