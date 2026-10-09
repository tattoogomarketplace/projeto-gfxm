'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Pencil, Plus, Radio, X, Zap } from 'lucide-react';
import { NeonButton } from '@/components/ui/neon-button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { toast } from '@/lib/toast';
import type { FlashNoteDto } from '@/lib/types/chat';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/use-i18n';
import { formatAppError } from '@/lib/error-handler';

const FLASH_NOTE_MAX_LENGTH = 80;

async function authHeaders(getToken: () => Promise<string | null>): Promise<HeadersInit> {
  const clerkToken = await getToken().catch(() => null);
  const stored = typeof window !== 'undefined' ? localStorage.getItem('tattoogo_token') : null;
  const token = clerkToken || stored;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function truncateNote(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= FLASH_NOTE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, FLASH_NOTE_MAX_LENGTH - 1).trimEnd()}…`;
}

function remainingLabel(expiresAt: string, expiringLabel: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return expiringLabel;
  const hours = Math.max(1, Math.round(ms / (60 * 60 * 1000)));
  return hours === 1 ? '1h' : `${hours}h`;
}

type ComposerState = {
  open: boolean;
  content: string;
  submitting: boolean;
};

const CLOSED_COMPOSER: ComposerState = { open: false, content: '', submitting: false };

export function FlashNotesCarousel() {
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const role = useAuthStore((s) => s.role);
  const canBroadcast = role === 'tatuador';

  const [notes, setNotes] = useState<FlashNoteDto[]>([]);
  const [actorId, setActorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState<ComposerState>(CLOSED_COMPOSER);
  const [selected, setSelected] = useState<FlashNoteDto | null>(null);
  const snapshotRef = useRef<FlashNoteDto[] | null>(null);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const ownNote = useMemo(
    () => (actorId ? notes.find((note) => note.userId === actorId) ?? null : null),
    [actorId, notes]
  );

  const loadNotes = useCallback(async () => {
    try {
      const headers = await authHeaders(getTokenRef.current);
      const res = await fetch('/api/chat/flash-notes', { headers, cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json().catch(() => ({}))) as {
        actorId?: string;
        notes?: FlashNoteDto[];
      };
      if (json.actorId) setActorId(json.actorId);
      setNotes(Array.isArray(json.notes) ? json.notes : []);
    } catch {
      return;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const openComposer = () => {
    triggerHaptic('light');
    setComposer({
      open: true,
      content: ownNote?.content ?? '',
      submitting: false,
    });
  };

  const closeComposer = () => {
    if (composer.submitting) return;
    setComposer(CLOSED_COMPOSER);
  };

  const publishNote = async () => {
    const content = composer.content.trim();
    if (!content || composer.submitting) return;
    if (content.length > FLASH_NOTE_MAX_LENGTH) {
      toast.error(t('toast.flashMax', { count: FLASH_NOTE_MAX_LENGTH }));
      return;
    }

    triggerHaptic('medium');
    snapshotRef.current = notes;
    const optimistic: FlashNoteDto = {
      id: ownNote?.id ?? `optimistic-${Date.now()}`,
      userId: actorId ?? 'me',
      content,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ativa: true,
      author: ownNote?.author ?? {
        id: actorId ?? 'me',
        name: t('flash.you'),
        role: 'tatuador',
        initial: 'V',
        cidade: null,
        estado: null,
      },
    };

    setNotes((current) => [optimistic, ...current.filter((note) => note.userId !== optimistic.userId)]);
    setComposer((state) => ({ ...state, submitting: true }));

    try {
      const headers = await authHeaders(getTokenRef.current);
      const res = await fetch('/api/chat/flash-notes', {
        method: 'POST',
        headers,
        body: JSON.stringify({ content }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        sucesso?: boolean;
        erro?: string;
        note?: FlashNoteDto;
        actorId?: string;
      };
      if (!res.ok || !json.note) {
        if (snapshotRef.current) setNotes(snapshotRef.current);
        toast.error(json.erro ? formatAppError({ message: json.erro }, 'api') : t('toast.flashPublishFailed'));
        setComposer((state) => ({ ...state, submitting: false }));
        return;
      }
      if (json.actorId) setActorId(json.actorId);
      setNotes((current) => [
        json.note as FlashNoteDto,
        ...current.filter((note) => note.id !== optimistic.id && note.userId !== json.note?.userId),
      ]);
      triggerHaptic('success');
      toast.success(t('toast.flashLive'));
      setComposer(CLOSED_COMPOSER);
    } catch {
      if (snapshotRef.current) setNotes(snapshotRef.current);
      toast.error(t('toast.flashPublishFailed'));
      setComposer((state) => ({ ...state, submitting: false }));
    }
  };

  const remaining = FLASH_NOTE_MAX_LENGTH - composer.content.length;

  return (
    <section className="relative shrink-0 transform-gpu px-[max(0.25rem,env(safe-area-inset-left,0px))] pr-[max(0.25rem,env(safe-area-inset-right,0px))]">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Zap className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" strokeWidth={2} />
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
          {t('flash.heading')}
        </p>
      </div>

      <div
        className={cn(
          'flex gap-3 overflow-x-auto overscroll-x-contain pb-1 pt-0.5',
          'snap-x snap-mandatory scroll-smooth',
          '[-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none]',
          '[&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0',
          'transform-gpu will-change-transform'
        )}
        role="list"
        aria-label={t('flash.listAria')}
      >
        {canBroadcast ? (
          <button
            type="button"
            onClick={openComposer}
            className="flex w-[4.75rem] shrink-0 snap-start flex-col items-center gap-1.5 active:scale-[0.97]"
            aria-label={ownNote ? t('flash.updateAria') : t('flash.publishAria')}
          >
            <span className="relative flex h-14 w-14 min-h-11 min-w-11 items-center justify-center rounded-full bg-[conic-gradient(from_180deg_at_50%_50%,#F97316,#FFBF00,#F97316)] p-[2px]">
              <span className="flex h-full w-full items-center justify-center rounded-full border border-black/[0.04] bg-white text-orange-500 dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-orange-400">
                {ownNote ? <Pencil className="h-5 w-5" strokeWidth={1.75} /> : <Plus className="h-5 w-5" strokeWidth={1.75} />}
              </span>
            </span>
            <span className="w-full truncate text-center text-[10px] font-semibold text-neutral-700 dark:text-zinc-300">
              {ownNote ? t('flash.ownNote') : t('flash.publish')}
            </span>
          </button>
        ) : null}

        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={`flash-skel-${index}`} className="flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5">
                <Skeleton className="h-14 w-14 rounded-full" />
                <Skeleton className="h-2.5 w-12 rounded-full" />
              </div>
            ))
          : notes.map((note) => {
              const name = note.author?.name || t('flash.artist');
              const initial = note.author?.initial ?? 'A';
              const isOwn = actorId != null && note.userId === actorId;
              return (
                <button
                  key={note.id}
                  type="button"
                  role="listitem"
                  onClick={() => {
                    triggerHaptic('light');
                    if (isOwn && canBroadcast) {
                      openComposer();
                      return;
                    }
                    setSelected(note);
                  }}
                  className="flex w-[4.75rem] shrink-0 snap-start flex-col items-center gap-1.5 active:scale-[0.97]"
                  aria-label={t('flash.aria', { name })}
                >
                  <span className="relative flex h-14 w-14 min-h-11 min-w-11 items-center justify-center rounded-full bg-[conic-gradient(from_210deg_at_50%_50%,#F97316,#FFBF00,#ea580c,#F97316)] p-[2px]">
                    <span className="flex h-full w-full items-center justify-center rounded-full border border-white bg-[#1a1a1a] text-sm font-semibold text-orange-400 dark:border-[#0a0a0a]">
                      {initial}
                    </span>
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#0a0a0a] bg-orange-500 text-black">
                      <Radio className="h-2.5 w-2.5" strokeWidth={2.5} />
                    </span>
                  </span>
                  <span className="w-full truncate text-center text-[10px] font-medium text-neutral-600 dark:text-zinc-400">
                    {truncateNote(note.content)}
                  </span>
                </button>
              );
            })}
      </div>

      {!loading && notes.length === 0 && !canBroadcast ? (
        <p className="px-1 pt-2 text-[11px] text-neutral-500 dark:text-zinc-500">
          {t('flash.empty')}
        </p>
      ) : null}

      {composer.open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-black/[0.04] bg-white p-5 shadow-xl dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-500 dark:text-orange-400">
                  {t('flash.benchStatus')}
                </p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
                  {ownNote ? t('flash.update') : t('flash.new')}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-zinc-500">
                  {t('flash.limit', { count: FLASH_NOTE_MAX_LENGTH })}
                </p>
              </div>
              <button
                type="button"
                onClick={closeComposer}
                className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full text-neutral-500 dark:text-zinc-400"
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <textarea
              value={composer.content}
              onChange={(event) =>
                setComposer((state) => ({
                  ...state,
                  content: event.target.value.slice(0, FLASH_NOTE_MAX_LENGTH),
                }))
              }
              maxLength={FLASH_NOTE_MAX_LENGTH}
              rows={3}
              placeholder={t('flash.placeholder')}
              className="w-full resize-none rounded-xl border border-black/[0.04] bg-white px-3 py-3 text-sm text-neutral-900 outline-none ring-orange-500/40 placeholder:text-neutral-400 focus:ring-2 dark:border-white/[0.05] dark:bg-white/[0.05] dark:text-white dark:placeholder:text-zinc-600"
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500 dark:text-zinc-500">
              <span>{t('flash.live24h')}</span>
              <span className={cn(remaining < 8 ? 'text-orange-500' : '')}>{remaining}</span>
            </div>
            <NeonButton
              type="button"
              className="mt-4 w-full"
              disabled={composer.submitting || composer.content.trim().length === 0}
              onClick={() => {
                void publishNote();
              }}
            >
              {composer.submitting ? t('flash.publishing') : ownNote ? t('flash.updateNote') : t('flash.publishNote')}
            </NeonButton>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-black/[0.04] bg-white p-5 shadow-xl dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-orange-500/40 bg-[#1a1a1a] text-sm font-semibold text-orange-400">
                  {selected.author?.initial ?? 'A'}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                    {selected.author?.name || t('flash.artist')}
                  </p>
                  <p className="text-[11px] text-orange-500 dark:text-orange-400">
                    {t('flash.active')} · {remainingLabel(selected.expiresAt, t('flash.expiring'))}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full text-neutral-500 dark:text-zinc-400"
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-neutral-700 dark:text-zinc-300">
              {truncateNote(selected.content)}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
