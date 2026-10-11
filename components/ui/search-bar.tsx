'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion, type Transition } from 'framer-motion';
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

/**
 * Sanitiza o corpo do handle digitado. O `@` e um prefixo visual inline (fora do
 * `<input>`), entao aqui tratamos apenas o corpo: lowercase imediato e apenas
 * `[a-z0-9_]` — espacos e simbolos sao removidos no mesmo tick.
 */
function sanitizeUsernameBody(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export interface SearchBarProps {
  className?: string;
  placeholder?: string;
  onSelect?: (user: UserSearchResultData) => void;
}

/**
 * Física "spring" de alta fidelidade (Opus tier): o morphing `@` -> máquina
 * usa flip 3D no eixo Y com leve overshoot físico (spring), sem bounce
 * exagerado, para um encaixe premium e previsível.
 */
const AT_MORPH: Transition = { type: 'spring', stiffness: 300, damping: 26, mass: 0.9 };
const MACHINE_MORPH: Transition = { type: 'spring', stiffness: 340, damping: 24, mass: 0.9 };

const glyphProps = {
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  className: 'absolute inset-0 h-full w-full',
  style: {
    transformStyle: 'preserve-3d' as const,
    backfaceVisibility: 'hidden' as const,
    willChange: 'transform, opacity',
  },
};

/** Estado de repouso: `@` de luxo com acabamento metálico (zinc/prata). */
function AtGlyph() {
  const uid = useId().replace(/:/g, '');
  const metal = `at-metal-${uid}`;
  return (
    <motion.svg
      {...glyphProps}
      aria-hidden
      initial={{ opacity: 0, rotateY: -90, scale: 0.8 }}
      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
      exit={{ opacity: 0, rotateY: 90, scale: 0.8 }}
      transition={AT_MORPH}
    >
      <defs>
        <linearGradient id={metal} x1="6" y1="4" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fafafa" />
          <stop offset="40%" stopColor="#d4d4d8" />
          <stop offset="62%" stopColor="#7c7c85" />
          <stop offset="100%" stopColor="#52525b" />
        </linearGradient>
      </defs>
      <g
        stroke={`url(#${metal})`}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3.6" />
        <path d="M15.6 12v1.4a2.4 2.4 0 0 0 4.8 0V12" />
      </g>
    </motion.svg>
  );
}

/**
 * Estado de foco: máquina de tatuagem hiper-realista. Formas detalhadas com
 * gradientes internos metálicos (zinc/prata), reflexos especulares e sombra
 * interna nas bobinas para simular profundidade 3D real (qualidade Awwwards).
 */
function MachineGlyph({ onLocked }: { onLocked?: () => void }) {
  const uid = useId().replace(/:/g, '');
  const metal = `tm-metal-${uid}`;
  const coil = `tm-coil-${uid}`;
  const needle = `tm-needle-${uid}`;
  return (
    <motion.svg
      {...glyphProps}
      aria-hidden
      initial={{ opacity: 0, rotateY: 90, scale: 0.8 }}
      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
      exit={{ opacity: 0, rotateY: -90, scale: 0.8 }}
      transition={MACHINE_MORPH}
      onAnimationComplete={onLocked}
      style={{
        ...glyphProps.style,
        filter:
          'drop-shadow(0 0 8px rgba(249,115,22,0.8)) drop-shadow(0 0 20px rgba(249,115,22,0.4))',
      }}
    >
      <defs>
        <linearGradient id={metal} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fafafa" />
          <stop offset="28%" stopColor="#d4d4d8" />
          <stop offset="50%" stopColor="#71717a" />
          <stop offset="70%" stopColor="#e4e4e7" />
          <stop offset="100%" stopColor="#3f3f46" />
        </linearGradient>
        <linearGradient id={coil} x1="0" y1="7.5" x2="0" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f4f4f5" />
          <stop offset="42%" stopColor="#a1a1aa" />
          <stop offset="100%" stopColor="#3f3f46" />
        </linearGradient>
        <linearGradient id={needle} x1="0" y1="19" x2="0" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>

      {/* Barra de armadura superior + parafuso de contato */}
      <rect x="8.9" y="1.5" width="6.2" height="2.4" rx="0.9" fill={`url(#${metal})`} />
      <rect x="10.9" y="0.6" width="2.2" height="1.4" rx="0.5" fill={`url(#${metal})`} />

      {/* Postes de ligação (binding posts) */}
      <rect x="8.2" y="3.5" width="1.9" height="2.3" rx="0.6" fill={`url(#${metal})`} />
      <rect x="13.9" y="3.5" width="1.9" height="2.3" rx="0.6" fill={`url(#${metal})`} />

      {/* Poste de ligação lateral */}
      <rect x="3.5" y="8.5" width="2.5" height="4.7" rx="0.9" fill={`url(#${metal})`} />
      <rect x="4.4" y="9.6" width="0.6" height="2.6" rx="0.3" fill="#27272a" opacity="0.55" />

      {/* Bobinas (coils) com profundidade e reflexo especular */}
      <circle cx="9.7" cy="10.7" r="3.15" fill={`url(#${coil})`} />
      <circle cx="14.3" cy="10.7" r="3.15" fill={`url(#${coil})`} />
      <circle cx="9.7" cy="10.7" r="1.55" fill="#18181b" opacity="0.55" />
      <circle cx="14.3" cy="10.7" r="1.55" fill="#18181b" opacity="0.55" />
      <circle cx="9.15" cy="9.85" r="0.7" fill="#fafafa" opacity="0.55" />
      <circle cx="13.75" cy="9.85" r="0.7" fill="#fafafa" opacity="0.55" />

      {/* Enrolamentos das bobinas */}
      <path
        d="M7 9.3c1.4-.9 3-.9 4.4 0M6.7 11.5c1.5-.9 3.2-.9 4.7 0"
        stroke="#71717a"
        strokeWidth="0.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M11.9 9.3c1.4-.9 3-.9 4.4 0M12.2 11.5c1.5-.9 3.2-.9 4.7 0"
        stroke="#71717a"
        strokeWidth="0.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Núcleo central da armadura */}
      <rect x="11.15" y="7.4" width="1.7" height="6.8" rx="0.5" fill={`url(#${metal})`} />

      {/* Ponte do chassi */}
      <path
        d="M6 10.7h1.2M16.8 10.7H18"
        stroke={`url(#${metal})`}
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* Grip / tubo da agulha */}
      <rect x="10.1" y="13.7" width="3.8" height="1" rx="0.5" fill={`url(#${metal})`} />
      <rect x="10.45" y="14" width="3.1" height="5.5" rx="1.1" fill={`url(#${metal})`} />
      <rect x="11.25" y="14.7" width="0.55" height="4.1" rx="0.28" fill="#fafafa" opacity="0.32" />

      {/* Ponta da agulha com brilho da marca */}
      <path d="M12 19.35 12.75 22.9h-1.5z" fill={`url(#${needle})`} />
    </motion.svg>
  );
}

/**
 * Glifo mágico INLINE: ocupa o lugar do caractere `@` como se fosse a primeira
 * letra da string. `@` em repouso e máquina de tatuagem 3D ao focar. Vive num
 * contêiner de tamanho FIXO e imutável (`h-6 w-6 shrink-0`) com perspectiva
 * própria, garantindo que o texto e o caret a sua direita nunca se desloquem
 * (CLS = 0 absoluto). Tocar no glifo foca o input com o caret logo apos o `@`.
 */
function SearchGlyph({
  focused,
  onLocked,
  onActivate,
}: {
  focused: boolean;
  onLocked?: () => void;
  onActivate?: (event: React.MouseEvent) => void;
}) {
  return (
    <span
      aria-hidden
      onMouseDown={onActivate}
      style={{ perspective: 640 }}
      className="relative flex h-6 w-6 shrink-0 cursor-text items-center justify-center"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {focused ? <MachineGlyph key="machine" onLocked={onLocked} /> : <AtGlyph key="at" />}
      </AnimatePresence>
    </span>
  );
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
        <SearchGlyph
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
