'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { BadgeCheck, ImageOff, Share2 } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { SegmentedControl, type SegmentOption } from '@/components/ui/segmented-control';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import type { MessageKey } from '@/lib/i18n/types';

/**
 * TATTOOGO MK — PERFIL PÚBLICO (APPLE-TIER)
 *
 * Superfície de perfil reutilizável, inspirada na hierarquia limpa das
 * arquiteturas sociais de elite (avatar com anel de status, métricas, bio rica,
 * destaques em rolagem horizontal e grade de mídia em abas).
 *
 * Regras de engenharia:
 *  - Geometria estável: nenhuma aba/estado altera a caixa do header; a grade
 *    reserva `min-height` para eliminar layout shift entre estados vazios e
 *    preenchidos.
 *  - Rolagem horizontal dos destaques sem gutter (`scrollbar-none`), com snap e
 *    isolated paint para nunca tocar o eixo X da tela.
 *  - Blindagem de marca: `TattooGo MK` / `TattooGo Marketplace` são literais e
 *    nunca passam por tradução.
 */

export const PROFILE_SCROLL_SHELL =
  'gpu-layer flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-none bg-transparent pb-[max(10rem,env(safe-area-inset-bottom))] pt-5 text-gray-900 contain-paint transform-gpu backface-hidden will-change-transform transition-transform transition-opacity duration-300 ease-out dark:text-white';

export type ProfileRole = 'cliente' | 'tatuador' | 'estudio';

export type ProfileMetric = {
  key: string;
  label: string;
  value: number;
};

export type ProfileActivity = {
  key: string;
  label: string;
  value: number;
};

export type ProfileHighlight = {
  id: string;
  label: string;
  href?: string;
  Icon: LucideIcon;
  imageUrl?: string | null;
};

export type ProfileMediaItem = {
  id: string;
  imageUrl: string;
  alt: string;
  href?: string;
};

export type ProfileMedia = {
  posts: ProfileMediaItem[];
  tagged: ProfileMediaItem[];
  saved: ProfileMediaItem[];
};

type ProfileTab = keyof ProfileMedia;

export type PublicProfileProps = {
  role: ProfileRole;
  name: string;
  username: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  verified?: boolean;
  metrics: ProfileMetric[];
  activity?: ProfileActivity[];
  highlights: ProfileHighlight[];
  media: ProfileMedia;
  owner?: boolean;
  onEdit?: () => void;
  onShare?: () => void;
  footer?: ReactNode;
};

const RICH_TOKEN_PATTERN = /((?:https?:\/\/|www\.)[^\s]+|@[a-z0-9_]+)/gi;

/**
 * Renderização de bio com suporte a links (`http(s)` / `www`) e menções
 * (`@handle`). Menções são apresentadas como destaque visual sem navegação
 * (não existe porta pública estável que não dependa da sessão autenticada).
 */
function renderRichBio(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = new RegExp(RICH_TOKEN_PATTERN.source, 'gi');
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }

    const token = match[0];
    if (token.startsWith('@')) {
      nodes.push(
        <span
          key={`${match.index}-mention`}
          className="font-semibold text-orange-500 dark:text-orange-400"
        >
          {token}
        </span>
      );
    } else {
      const href = token.startsWith('http') ? token : `https://${token}`;
      nodes.push(
        <a
          key={`${match.index}-link`}
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-medium text-orange-500 underline decoration-orange-500/40 underline-offset-2 transition-colors hover:text-orange-400 dark:text-orange-400"
        >
          {token}
        </a>
      );
    }

    cursor = pattern.lastIndex;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function MetricColumn({ metric }: { metric: ProfileMetric }) {
  return (
    <div className="flex min-w-0 flex-col items-center">
      <span className="text-xl font-bold leading-none tracking-tight text-gray-900 tabular-nums dark:text-white">
        {metric.value}
      </span>
      <span className="mt-1.5 truncate text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500 dark:text-zinc-400">
        {metric.label}
      </span>
    </div>
  );
}

function HighlightBubble({ highlight }: { highlight: ProfileHighlight }) {
  const { triggerHaptic } = useHapticFeedback();
  const body = (
    <>
      <span className="flex h-[68px] w-[68px] min-h-[68px] min-w-[68px] items-center justify-center rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-300 p-[2.5px] shadow-[0_4px_14px_rgba(249,115,22,0.2)]">
        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-white bg-neutral-900 dark:border-[#0a0a0a]">
          {highlight.imageUrl ? (
            <OptimizedImage
              src={highlight.imageUrl}
              alt={highlight.label}
              className="h-full w-full rounded-full"
            />
          ) : (
            <highlight.Icon
              className="h-6 w-6 text-orange-400"
              strokeWidth={1.75}
              aria-hidden
            />
          )}
        </span>
      </span>
      <span className="mt-2 line-clamp-2 max-w-[76px] text-center text-[11px] font-medium leading-tight text-neutral-700 dark:text-zinc-300">
        {highlight.label}
      </span>
    </>
  );

  const className =
    'apple-press flex w-[76px] shrink-0 snap-start flex-col items-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70';

  if (highlight.href) {
    return (
      <Link
        href={highlight.href}
        className={className}
        onClick={() => triggerHaptic('light')}
      >
        {body}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={() => triggerHaptic('light')}>
      {body}
    </button>
  );
}

function MediaGrid({ items, emptyLabel }: { items: ProfileMediaItem[]; emptyLabel: string }) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-[16rem] flex-col items-center justify-center rounded-3xl border border-dashed border-black/[0.06] bg-black/[0.015] px-6 text-center dark:border-white/[0.06] dark:bg-white/[0.02]">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-500 dark:text-orange-400">
          <ImageOff className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <p className="mt-3 text-sm text-neutral-500 dark:text-zinc-400">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-3 gap-[3px] sm:gap-1">
      {items.map((item) => {
        const tile = (
          <span className="relative block aspect-square w-full overflow-hidden rounded-[10px] bg-neutral-800">
            <OptimizedImage
              src={item.imageUrl}
              alt={item.alt}
              className="absolute inset-0 h-full w-full"
            />
          </span>
        );

        return (
          <li key={item.id} className="min-w-0">
            {item.href ? (
              <Link
                href={item.href}
                className="apple-press block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70"
                aria-label={item.alt}
              >
                {tile}
              </Link>
            ) : (
              tile
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function PublicProfile({
  role,
  name,
  username,
  avatarUrl,
  bio,
  location,
  verified = false,
  metrics,
  activity,
  highlights,
  media,
  owner = false,
  onEdit,
  onShare,
  footer,
}: PublicProfileProps) {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const [tab, setTab] = useState<ProfileTab>('posts');

  const initials = (name || username || 'A').trim().charAt(0).toUpperCase() || 'A';
  const handle = username ? `@${username}` : null;
  const roleLabel = t(`role.${role}.label` as MessageKey);

  const tabOptions = useMemo<SegmentOption<ProfileTab>[]>(
    () => [
      { value: 'posts', label: t('profile.tabPosts') },
      { value: 'tagged', label: t('profile.tabTagged') },
      { value: 'saved', label: t('profile.tabSaved') },
    ],
    [t]
  );

  const emptyByTab: Record<ProfileTab, string> = {
    posts: t('profile.emptyPosts'),
    tagged: t('profile.emptyTagged'),
    saved: t('profile.emptySaved'),
  };

  return (
    <div className={PROFILE_SCROLL_SHELL}>
      <header className="relative w-full overflow-hidden rounded-3xl border border-black/[0.04] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] contain-paint transform-gpu backface-hidden will-change-transform dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none">
        <div className="relative h-32 w-full overflow-hidden border-b border-black/[0.04] bg-neutral-100 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-transparent to-black/[0.04] dark:to-white/[0.02]"
          />
          <p className="absolute left-5 top-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500 dark:text-zinc-400">
            {handle ?? t('profile.title')}
          </p>
          {!owner && onShare ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onShare();
              }}
              aria-label={t('profile.share')}
              className="apple-press absolute right-4 top-4 flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-2xl border border-black/[0.05] bg-white/70 text-neutral-600 backdrop-blur-md dark:border-white/[0.06] dark:bg-black/30 dark:text-zinc-300"
            >
              <Share2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          ) : null}
        </div>

        <div className="relative px-5 pb-5">
          <div className="flex items-end gap-4">
            <span className="relative -mt-12 flex h-20 w-20 min-h-20 min-w-20 items-center justify-center rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-300 p-[3px] shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
              <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-neutral-900 text-2xl font-semibold uppercase text-orange-400 dark:border-[#0a0a0a]">
                {avatarUrl ? (
                  <OptimizedImage src={avatarUrl} alt={name} className="h-full w-full rounded-full" />
                ) : (
                  initials
                )}
              </span>
              {verified ? (
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 min-h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white dark:border-[#0a0a0a]"
                  aria-label={t('profile.verified')}
                >
                  <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.25} />
                </span>
              ) : null}
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="truncate text-[22px] font-semibold tracking-tight text-gray-900 dark:text-white">
                {name || t('profile.title')}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-600 dark:text-orange-300">
                  {roleLabel}
                </span>
                {location ? (
                  <span className="truncate text-xs text-neutral-500 dark:text-zinc-400">
                    {location}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {metrics.map((metric) => (
              <MetricColumn key={metric.key} metric={metric} />
            ))}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-zinc-300">
            {bio ? renderRichBio(bio) : (
              <span className="text-neutral-400 dark:text-zinc-500">{t('profile.bioEmpty')}</span>
            )}
          </p>

          {activity && activity.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {activity.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.05] bg-black/[0.02] px-3 py-1.5 text-[11px] font-medium text-neutral-600 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-zinc-300"
                >
                  <span className="font-semibold text-gray-900 tabular-nums dark:text-white">
                    {item.value}
                  </span>
                  {item.label}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 flex gap-2">
            {owner ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onEdit?.();
                  }}
                  className="apple-press flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-black/[0.06] bg-black/[0.03] text-sm font-semibold text-gray-900 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white"
                >
                  {t('profile.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onShare?.();
                  }}
                  className="apple-press flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 text-sm font-semibold text-orange-600 dark:text-orange-300"
                >
                  {t('profile.share')}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {highlights.length > 0 ? (
        <section className="mt-5">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 dark:text-zinc-400">
            {t('profile.highlights')}
          </h2>
          <div className="scrollbar-none mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
            {highlights.map((highlight) => (
              <HighlightBubble key={highlight.id} highlight={highlight} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        <SegmentedControl
          options={tabOptions}
          value={tab}
          onChange={setTab}
          ariaLabel={t('profile.tabAria')}
        />
        <div className="mt-4">
          <MediaGrid items={media[tab]} emptyLabel={emptyByTab[tab]} />
        </div>
      </section>

      {footer ? <div className="mt-auto pt-8">{footer}</div> : null}
    </div>
  );
}
