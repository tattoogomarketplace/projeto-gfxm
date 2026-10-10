'use client';

import type { ReactNode } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { cn } from '@/lib/utils';

export interface UserSearchResultData {
  id: string;
  /** Display Name — identidade principal e dominante na hierarquia visual. */
  name?: string | null;
  /** Handle publico secundario. Ausente para estudios e contas sem username. */
  username?: string | null;
  avatarUrl?: string | null;
  /** Fallback textual quando nao ha nome nem username. */
  fallback?: string;
}

export interface UserSearchResultProps {
  user: UserSearchResultData;
  onSelect?: (user: UserSearchResultData) => void;
  trailing?: ReactNode;
  className?: string;
}

function initialOf(user: UserSearchResultData): string {
  const source = user.name?.trim() || user.username?.trim() || user.fallback?.trim() || '?';
  return source.charAt(0).toUpperCase();
}

export function UserSearchResult({ user, onSelect, trailing, className }: UserSearchResultProps) {
  const displayName = user.name?.trim() || user.username?.trim() || user.fallback || '';
  const handle = user.username?.trim();

  const content = (
    <>
      <div className="relative h-11 w-11 min-h-11 min-w-11 shrink-0 overflow-hidden rounded-full border border-white/[0.06] bg-zinc-800">
        {user.avatarUrl ? (
          <OptimizedImage src={user.avatarUrl} alt={displayName} className="h-11 w-11" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-300">
            {initialOf(user)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 text-left">
        {/* Hierarquia visual: Display Name domina; @username e secundario. */}
        <p className="truncate text-base font-semibold text-white">{displayName}</p>
        {handle ? <p className="mt-0.5 truncate text-sm text-zinc-500">@{handle}</p> : null}
      </div>

      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </>
  );

  const baseClass = cn(
    'flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors',
    onSelect && 'cursor-pointer hover:border-white/[0.05] hover:bg-white/[0.04] active:scale-[0.99]',
    className
  );

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(user)} className={baseClass}>
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
