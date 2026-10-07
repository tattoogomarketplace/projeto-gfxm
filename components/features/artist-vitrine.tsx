'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import { AtomicBookingSheet } from '@/components/features/atomic-booking-sheet';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { NeonButton } from '@/components/ui/neon-button';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useUiStore } from '@/hooks/use-ui-store';
import {
  bodyPartLabel,
  healingLabel,
  sessionDurationLabel,
  styleLabel,
} from '@/lib/portfolio-metadata';
import type { PublicArtistVitrine } from '@/lib/services/artist-vitrine';
import { cn } from '@/lib/utils';

type ArtistVitrineProps = {
  vitrine: PublicArtistVitrine;
};

export function ArtistVitrine({ vitrine }: ArtistVitrineProps) {
  const router = useRouter();
  const { triggerHaptic } = useHapticFeedback();
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const setPendingChatPeer = useUiStore((s) => s.setPendingChatPeer);

  const { artist, items, scheduleSummary, availableSlots } = vitrine;
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingArtworkId, setBookingArtworkId] = useState<string | undefined>();
  const location = useMemo(() => {
    if (artist.cidade && artist.estado) return `${artist.cidade}/${artist.estado}`;
    return artist.cidade || null;
  }, [artist.cidade, artist.estado]);
  const bookingArtwork = useMemo(
    () => items.find((item) => item.id === bookingArtworkId) ?? null,
    [items, bookingArtworkId]
  );

  const openChat = (artworkId?: string) => {
    triggerHaptic('light');
    setPendingChatPeer(artist.id);
    setActiveTab('chat');
    const params = new URLSearchParams({ artistId: artist.id });
    if (artworkId) params.set('artworkId', artworkId);
    router.push(`/dashboard/chat?${params.toString()}`);
  };

  const openBooking = (artworkId?: string) => {
    triggerHaptic('medium');
    setBookingArtworkId(artworkId);
    setBookingOpen(true);
  };

  return (
    <div className="relative overflow-x-hidden bg-transparent pt-5 text-neutral-900 dark:text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(249,115,22,0.18),transparent_65%)]"
      />

      <button
        type="button"
        onClick={() => router.back()}
        className="relative mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-neutral-500 hover:text-orange-500 dark:text-zinc-400 dark:hover:text-orange-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <header className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-[#121212] dark:shadow-[0_0_40px_rgba(249,115,22,0.08)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-orange-500/20 blur-3xl"
        />
        <div className="relative flex items-start gap-4">
          <span className="flex h-16 w-16 min-h-16 min-w-16 items-center justify-center rounded-full border border-orange-500/40 bg-white text-2xl font-semibold uppercase text-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.28)] dark:bg-[#1a1a1a] dark:text-orange-400">
            {artist.initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-500 dark:text-orange-400">
              Vitrine do artista
            </p>
            <h1 className="mt-1 bg-gradient-to-r from-neutral-900 via-orange-700 to-orange-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent dark:from-white dark:via-orange-100 dark:to-orange-400">
              {artist.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {artist.kycApproved ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-3 w-3" strokeWidth={1.75} />
                  Documentos Pessoais aprovados
                </span>
              ) : (
                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:border-neutral-700 dark:bg-[#161616] dark:text-zinc-500">
                  Credencial em análise
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-sm text-neutral-600 dark:text-zinc-400">
              {artist.studio?.name || 'Artista independente'}
            </p>
            {location ? (
              <p className="mt-2 flex items-center gap-1 text-xs text-neutral-500 dark:text-zinc-500">
                <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                {location}
              </p>
            ) : null}
          </div>
        </div>

        {scheduleSummary.length > 0 ? (
          <div className="relative mt-4 flex flex-wrap gap-1.5">
            {scheduleSummary.slice(0, 4).map((item) => (
              <span
                key={item}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[10px] font-medium text-neutral-600 dark:border-neutral-700 dark:bg-[#161616] dark:text-zinc-400"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}

        <div className="relative mt-5 grid gap-2 sm:grid-cols-2">
          <NeonButton
            type="button"
            disabled={!artist.bookingEnabled}
            onClick={() => openBooking()}
            className="w-full"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
              {artist.bookingEnabled ? 'Agendar sessão' : 'Agenda indisponível'}
            </span>
          </NeonButton>
          <button
            type="button"
            onClick={() => openChat()}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-orange-500/40 bg-orange-500/10 px-6 py-3 text-sm font-semibold text-orange-600 transition-all hover:bg-orange-500/20 active:scale-95 dark:text-orange-300"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
            Conversar
          </button>
        </div>
      </header>

      <section className="relative mt-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
          Portfólio
        </h2>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center dark:border-neutral-800 dark:bg-[#121212]">
            <p className="text-sm text-neutral-500 dark:text-zinc-400">Nenhuma peça publicada ainda.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-[#121212] dark:shadow-none"
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <OptimizedImage
                    src={item.imageUrl}
                    alt={styleLabel(item.style)}
                    className="h-full w-full"
                  />
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white">{styleLabel(item.style)}</span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide',
                        item.isHealed
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/40 dark:text-emerald-300'
                          : 'border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-300'
                      )}
                    >
                      {healingLabel(item.isHealed)}
                    </span>
                  </div>
                  {item.descricao ? (
                      <p className="line-clamp-3 text-xs leading-relaxed text-neutral-500 dark:text-zinc-400">{item.descricao}</p>
                  ) : null}
                  <p className="text-xs text-neutral-500 dark:text-zinc-500">
                    {bodyPartLabel(item.bodyPart)} · {sessionDurationLabel(item.sessionDuration)}
                  </p>
                  <button
                    type="button"
                    onClick={() => openBooking(item.id)}
                    disabled={!artist.bookingEnabled}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 text-sm font-semibold text-orange-600 transition-all hover:border-orange-500 hover:bg-orange-500/20 active:scale-[0.98] disabled:opacity-40 dark:text-orange-300"
                  >
                    <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
                    Agendar esta peça
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AtomicBookingSheet
        artistId={artist.id}
        artistName={artist.name}
        slots={availableSlots}
        artworkId={bookingArtwork?.id}
        artworkLabel={
          bookingArtwork
            ? `${styleLabel(bookingArtwork.style)} · ${bodyPartLabel(bookingArtwork.bodyPart)}`
            : undefined
        }
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onBooked={() => {
          setActiveTab('agendar');
          router.push('/dashboard/cliente?tab=agendar');
        }}
      />
    </div>
  );
}
