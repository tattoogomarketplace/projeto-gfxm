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

export const SEARCH_BAR_PLACEHOLDER = 'Pesquisar por @username...';

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
          className="h-12 w-full rounded-xl border border-black/[0.04] bg-white pl-10 pr-10 text-sm text-neutral-900 caret-neutral-900 outline-none placeholder:text-neutral-400 focus:border-amber-500 dark:border-white/[0.05] dark:bg-neutral-900 dark:text-white dark:caret-white dark:placeholder:text-neutral-500"
        />
        {loading ? (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500"
            aria-hidden
          />
        ) : null}
      </div>

      {results.length > 0 ? (
        <ul className="mt-2 max-h-80 overflow-y-auto rounded-xl border border-black/[0.04] bg-white p-1 dark:border-white/[0.05] dark:bg-neutral-900">
          {results.map((user) => (
            <li key={user.id}>
              <UserSearchResult user={user} onSelect={handleSelect} />
            </li>
          ))}
        </ul>
      ) : null}

      {showEmpty ? (
        <p className="mt-2 px-1 text-xs text-zinc-500">
          Nenhum @username encontrado.
        </p>
      ) : null}
    </div>
  );
}
