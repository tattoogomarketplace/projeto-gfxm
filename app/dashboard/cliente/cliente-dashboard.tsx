'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { CalendarDays, Images, MapPin, MessageCircle, Sparkles } from 'lucide-react';
import { useAgendamentos } from '@/hooks/use-agendamentos';
import { GlassContainer } from '@/components/ui/glass-container';
import { perfilService } from '@/lib/services/perfil-service';
import { GeoFilter } from '@/components/shared/geo-filter';
import { ChatBox } from '@/components/features/chat/chat-box';
import { PortfolioCard } from '@/components/features/portfolio-card';
import { getCachedFeed } from '@/lib/catalogo';
import { getRoleExperience } from '@/lib/content/role-experience';
import type { Agendamento, ArtistaResumo, FeedItem } from '@/lib/types/database';
import { useUiStore } from '@/hooks/use-ui-store';
import { cn } from '@/lib/utils';

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
  const { data: agendamentos, isLoading } = useAgendamentos();
  const [artistas, setArtistas] = useState<ArtistaResumo[]>([]);
  const [cidade, setCidade] = useState('');
  const [chatPeer, setChatPeer] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    perfilService.listarArtistas({ cidade }).then(setArtistas);
  }, [cidade]);

  useEffect(() => {
    getCachedFeed().then(setFeed).catch(() => setFeed([]));
  }, []);

  const activeTab = useUiStore((s) => s.activeTab);

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden px-4 pb-8 pt-5 text-neutral-900 dark:bg-black bg-neutral-50 dark:text-white sm:px-6">
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
          <section className="space-y-4">
            <SectionHeading
              icon={<CalendarDays className="h-5 w-5" strokeWidth={1.75} />}
              title={EXPERIENCE.heading}
              subtitle="Acompanhe o status das suas sessões."
            />
            {isLoading ? (
              <div className="space-y-4">
                <div className="h-24 animate-pulse rounded-xl border border-white/10 bg-orange-500/5" />
                <div className="h-24 animate-pulse rounded-xl border border-white/10 bg-orange-500/5" />
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
          <section className="space-y-4">
            <SectionHeading
              icon={<MessageCircle className="h-5 w-5" strokeWidth={1.75} />}
              title="Encontrar Artistas"
              subtitle="Selecione um artista para iniciar uma conversa."
            />
            <GeoFilter onChange={setCidade} />
            <div className="grid grid-cols-2 gap-3">
              {(artistas ?? []).map((a) => {
                const selected = chatPeer === a?.id;
                const email = a?.email ?? '';
                const initial = email.trim().charAt(0) || '?';
                return (
                  <button
                    key={a?.id ?? email}
                    onClick={() => a?.id && setChatPeer(a.id)}
                    className={cn(
                      'group relative min-h-11 overflow-hidden rounded-xl border p-3 text-left transition-all active:scale-95',
                      selected
                        ? 'border-orange-500/60 bg-orange-500/10 shadow-[0_0_20px_rgba(249,115,22,0.25)]'
                         : 'border-neutral-200 bg-white hover:border-orange-500/40 hover:bg-orange-500/5 dark:border-neutral-800 dark:bg-[#121212]'
                    )}
                  >
                    <span className="flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-full border border-orange-500/30 bg-white text-sm font-semibold uppercase text-orange-500 dark:bg-[#1a1a1a] dark:text-orange-400">
                      {initial}
                    </span>
                    <span className="mt-2 block truncate text-sm font-medium text-neutral-900 dark:text-white">
                      {email || 'Artista'}
                    </span>
                    {a?.cidade ? (
                      <span className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                        <MapPin className="h-3 w-3" strokeWidth={1.75} />
                        {a.cidade}/{a?.estado ?? ''}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {artistas.length === 0 ? (
              <GlassContainer className="border-dashed border-white/10 p-6 text-center">
                <p className="text-sm text-zinc-400">Nenhum artista encontrado nesta região.</p>
              </GlassContainer>
            ) : null}
            {chatPeer && (
              <div className="mt-2">
                <ChatBox destinatarioId={chatPeer} />
              </div>
            )}
          </section>
        )}

        {activeTab === 'portfolio' && (
          <section className="space-y-4">
            <SectionHeading
              icon={<Images className="h-5 w-5" strokeWidth={1.75} />}
              title="Galeria de Inspiração"
              subtitle="Descubra estilos e curta as artes que combinam com você."
            />
            {feed.length === 0 ? (
              <GlassContainer className="border-dashed border-white/10 p-6 text-center">
                <p className="text-sm text-zinc-400">Nenhuma arte disponível ainda.</p>
              </GlassContainer>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(feed ?? []).map((item) => (
                  <PortfolioCard
                    key={item?.id ?? item?.url_imagem}
                    id={item?.id ?? ''}
                    imageUrl={item?.url_imagem ?? ''}
                    artistName={item?.estilo ?? ''}
                    initialLikes={item?.likes_count || 0}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
