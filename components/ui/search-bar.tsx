'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { authedFetch } from '@/lib/utils/authed-fetch';
import { sanitizeUsernameBody } from '@/lib/username';
import { UsernameMorphGlyph } from '@/components/ui/username-glyph';
import {
  UserSearchResult,
  type UserSearchResultData,
} from '@/components/ui/user-search-result';
import { cn } from '@/lib/utils';

/**
 * Barra de descoberta global.
 *
 * A busca acontece EXCLUSIVAMENTE por `@username`. O `@` deixa de ser um
 * caractere do `<input>` e passa a ser um prefixo visual INLINE (`SearchGlyph`)
 * renderizado como a "primeira letra" da string. O estado (`query`) continua
 * sendo `@username` (backend intacto), mas o campo nativo exibe apenas o corpo
 * do handle (`nome`), de modo que o caret e o texto fluem imediatamente apos o
 * glifo. Ao focar, o `@` se metamorfoseia na maquina de tatuagem 3D, com zero
 * layout shift (CLS = 0).
 */

export const SEARCH_BAR_PLACEHOLDER = 'Pesquise por @...';

const DEBOUNCE_MS = 350;
const MIN_USERNAME_LENGTH = 1;

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
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const tokenFn = useCallback(() => getTokenRef.current({ skipCache: true }), []);

  // Reafirma a posição do cursor depois de um prepend automático do `@`, para
  // que a digitação continue fluindo sem o caret saltar para o fim.
  useEffect(() => {
    const pos = pendingCaret.current;
    if (pos === null || !inputRef.current) return;
    inputRef.current.setSelectionRange(pos, pos);
    pendingCaret.current = null;
  }, [query]);

  const username = query.startsWith('@') ? query.slice(1).trim() : '';
  const canSearch =
    query.startsWith('@') && username.length >= MIN_USERNAME_LENGTH;

  useEffect(() => {
    if (!canSearch) return;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await authedFetch(
          `/api/search?q=${encodeURIComponent(`@${username}`)}`,
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
  }, [canSearch, username, tokenFn]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const el = event.target;
    const raw = el.value;
    const body = sanitizeUsernameBody(raw);
    setTouched(true);
    if (body !== raw) {
      // Remapeia o caret contando apenas os caracteres validos antes dele, para
      // que a remocao de espacos/simbolos (no mesmo tick) nao jogue o cursor.
      // O `@` e prefixo visual (fora do input), entao o indice e sobre o corpo.
      const caretRaw = el.selectionStart ?? raw.length;
      pendingCaret.current = sanitizeUsernameBody(raw.slice(0, caretRaw)).length;
    }
    const next = body ? `@${body}` : '';
    if (next !== query) {
      setLoading(body.length >= MIN_USERNAME_LENGTH);
    }
    setQuery(next);
  };

  const handleFocus = () => {
    setIsFocused(true);
    triggerHaptic('light');
  };

  const handleBlur = () => {
    setIsFocused(false);
    triggerHaptic('light');
  };

  // Resposta tátil exata no instante em que a máquina de tatuagem trava no
  // lugar (fim da animação de morphing 3D), reforçando a sensação "premium".
  const handleGlyphLocked = useCallback(() => triggerHaptic('medium'), [triggerHaptic]);

  // Tocar no glifo (o `@`/maquina) foca o input com o caret imediatamente apos
  // o prefixo — o `@` e o indice 0 do corpo.
  const handleGlyphActivate = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(0, 0);
  };

  // Toda a barra e clicavel: taps fora do input (paddings) focam o campo com o
  // caret no fim do corpo, sem roubar o gesto nativo quando o alvo e o input.
  const handleBarMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = inputRef.current;
    if (!el || event.target === el) return;
    event.preventDefault();
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  };

  const handleSelect = (user: UserSearchResultData) => {
    triggerHaptic('light');
    onSelect?.(user);
  };

  // Resultados/estado derivados: quando o gate do `@` não está ativo, nada é
  // exibido — evita setState síncrono dentro do efeito (regra react-hooks).
  const visibleResults = canSearch ? results : [];
  const isLoading = canSearch && loading;
  const showEmpty =
    touched && !isLoading && canSearch && visibleResults.length === 0;

  return (
    <div className={cn('relative w-full', className)}>
      <div
        onMouseDown={handleBarMouseDown}
        className="relative flex h-12 w-full cursor-text items-center rounded-xl border border-white/10 bg-white/10 pl-3 pr-10 backdrop-blur-md transition-colors focus-within:border-orange-500/60 focus-within:ring-1 focus-within:ring-orange-500/40 dark:bg-zinc-900/80"
      >
        <UsernameMorphGlyph
          focused={isFocused}
          onLocked={handleGlyphLocked}
          onActivate={handleGlyphActivate}
        />
        <input
          ref={inputRef}
          type="search"
          value={username}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          spellCheck={false}
          inputMode="search"
          className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium text-neutral-900 caret-neutral-900 outline-none ring-0 placeholder:text-zinc-400 dark:text-white dark:caret-white dark:placeholder:text-zinc-500"
        />
        {isLoading ? (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500"
            aria-hidden
          />
        ) : null}
      </div>

      {visibleResults.length > 0 ? (
        <ul className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-white/[0.08] bg-zinc-900/95 p-1 shadow-2xl backdrop-blur-md">
          {visibleResults.map((user) => (
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
