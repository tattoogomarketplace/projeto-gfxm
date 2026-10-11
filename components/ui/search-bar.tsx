'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Search, Loader2 } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { authedFetch } from '@/lib/utils/authed-fetch';
import {
  UserSearchResult,
  type UserSearchResultData,
} from '@/components/ui/user-search-result';
import { cn } from '@/lib/utils';

/**
 * Barra de descoberta global.
 *
 * Educa o usuario desde o placeholder: a busca acontece EXCLUSIVAMENTE por
 * `@username`. O `@` e opcional na digitacao (`@gabriel` ou `gabriel`) e e
 * removido antes de consultar `/api/search`.
 */

export const SEARCH_BAR_PLACEHOLDER = 'Pesquise por @...';

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

export interface SearchBarProps {
  className?: string;
  placeholder?: string;
  onSelect?: (user: UserSearchResultData) => void;
}

export function SearchBar({ className, placeholder = SEARCH_BAR_PLACEHOLDER, onSelect }: SearchBarProps) {
  const { getToken } = useAuth();
  const { triggerHaptic } = useHapticFeedback();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResultData[]>([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const tokenFn = useCallback(() => getTokenRef.current({ skipCache: true }), []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.replace(/^@+/, '').length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await authedFetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
          tokenFn
        );
        const payload = (await res.json().catch(() => ({}))) as {
          usuarios?: UserSearchResultData[];
        };
        if (!controller.signal.aborted) {
          setResults(res.ok ? payload.usuarios ?? [] : []);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, tokenFn]);

  const handleSelect = (user: UserSearchResultData) => {
    triggerHaptic('light');
    onSelect?.(user);
  };

  const showEmpty =
    touched && !loading && query.trim().replace(/^@+/, '').length >= MIN_QUERY_LENGTH && results.length === 0;

  return (
    <div className={cn('relative w-full', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setTouched(true);
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="h-12 w-full rounded-xl border border-white/10 bg-white/10 pl-10 pr-10 text-sm font-medium text-neutral-900 caret-neutral-900 outline-none backdrop-blur-md transition-colors placeholder:text-zinc-400 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/40 dark:bg-zinc-900/80 dark:text-white dark:caret-white dark:placeholder:text-zinc-500"
        />
        {loading ? (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500"
            aria-hidden
          />
        ) : null}
      </div>

      {results.length > 0 ? (
        <ul className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-white/[0.08] bg-zinc-900/95 p-1 shadow-2xl backdrop-blur-md">
          {results.map((user) => (
            <li key={user.id}>
              <UserSearchResult user={user} onSelect={handleSelect} />
            </li>
          ))}
        </ul>
      ) : null}

      {showEmpty ? (
        <p className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-white/[0.08] bg-zinc-900/95 px-3 py-2 text-xs text-zinc-400 shadow-2xl backdrop-blur-md">
          Nenhum @username encontrado.
        </p>
      ) : null}
    </div>
  );
}
