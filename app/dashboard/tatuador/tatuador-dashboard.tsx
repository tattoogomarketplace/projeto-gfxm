'use client';

import { Suspense } from 'react';
import { CalendarDays, Images } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useAgendamentos } from '@/hooks/use-agendamentos';
import { useUiStore } from '@/hooks/use-ui-store';
import { GlassContainer } from '@/components/ui/glass-container';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatWorkspace } from '@/components/features/chat/chat-workspace';
import { PortfolioUpload } from '@/components/features/portfolio-upload';
import { getRoleExperience } from '@/lib/content/role-experience';
import type { Agendamento } from '@/lib/types/database';

const EXPERIENCE = getRoleExperience('tatuador').dashboard;

export default function TatuadorDashboard() {
  const { user } = useUser();
  const { data: agendamentos, isLoading } = useAgendamentos();
  const activeTab = useUiStore((s) => s.activeTab);

  return (
    <div className="flex min-h-full flex-col bg-transparent p-4 pb-6 text-neutral-900 transition-opacity duration-300 ease-in-out dark:text-white sm:p-8">
      {activeTab === 'portfolio' ? (
        <section key="portfolio" className="screen-fade-in space-y-4 transition-opacity duration-300 ease-in-out">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
              <Images className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <h1 className="text-2xl font-bold">Portfólio</h1>
              <p className="mt-1 text-sm text-neutral-600 dark:text-zinc-400">Publique artes e mantenha sua bancada visível.</p>
            </div>
          </div>
          {user?.id ? (
            <PortfolioUpload tatuadorId={user.id} />
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          )}
        </section>
      ) : null}

      {activeTab === 'agendar' ? (
        <section key="agendar" className="screen-fade-in space-y-4 transition-opacity duration-300 ease-in-out">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
              <CalendarDays className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <h1 className="text-2xl font-bold mb-1">{EXPERIENCE.heading}</h1>
              <p className="text-sm text-neutral-600 dark:text-zinc-400">{EXPERIENCE.subtitle}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : (
            <div className="grid gap-4">
              {agendamentos?.map((ag: Agendamento, index: number) => (
                <GlassContainer key={ag?.id ?? `agendamento-${index}`} className="p-4 border-l-4 border-neon-orange">
                  <div className="flex justify-between items-center">
                    <h2 className="font-bold">Cliente ID: {(ag?.cliente_id ?? '').slice(0, 8) || '—'}...</h2>
                    <span className="text-neon-orange uppercase text-xs font-bold">{ag?.status ?? 'pendente'}</span>
                  </div>
                  <p className="text-sm mt-2">
                    Data: {ag?.data_hora ? new Date(ag.data_hora).toLocaleString() : '—'}
                  </p>
                </GlassContainer>
              ))}
              {(!agendamentos || agendamentos.length === 0) && (
                <p className="text-zinc-400">Nenhum agendamento pendente.</p>
              )}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === 'chat' ? (
        <section key="chat" className="screen-fade-in -mx-4 min-h-0 flex-1 sm:-mx-8">
          <Suspense fallback={<Skeleton className="h-[28rem] w-full rounded-2xl" />}>
            <ChatWorkspace />
          </Suspense>
        </section>
      ) : null}
    </div>
  );
}
