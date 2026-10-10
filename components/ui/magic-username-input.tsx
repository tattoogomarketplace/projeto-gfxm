'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, X } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { authedFetch } from '@/lib/utils/authed-fetch';
import { validateUsername } from '@/lib/username';
import type { MessageKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export type UsernameAvailability =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid'
  | 'reserved'
  | 'forbidden'
  | 'error';

export interface MagicUsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  onAvailabilityChange?: (status: UsernameAvailability) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  autoComplete?: string;
  className?: string;
  'aria-label'?: string;
}

const DEBOUNCE_MS = 450;

const STATUS_MESSAGE_KEY: Record<Exclude<UsernameAvailability, 'idle'>, MessageKey> = {
  checking: 'username.checking',
  available: 'username.available',
  taken: 'username.taken',
  invalid: 'username.invalid',
  reserved: 'username.reserved',
  forbidden: 'username.forbidden',
  error: 'username.invalid',
};

type Tone = 'neutral' | 'pending' | 'ok' | 'warn' | 'bad';

const STATUS_TONE: Record<Exclude<UsernameAvailability, 'idle'>, Tone> = {
  checking: 'pending',
  available: 'ok',
  taken: 'bad',
  invalid: 'warn',
  reserved: 'warn',
  forbidden: 'bad',
  error: 'warn',
};

const MESSAGE_TONE_CLASS: Record<Tone, string> = {
  neutral: 'text-zinc-500',
  pending: 'text-orange-500 dark:text-orange-400',
  ok: 'text-emerald-500 dark:text-emerald-400',
  warn: 'text-amber-500 dark:text-amber-400',
  bad: 'text-red-500 dark:text-red-400',
};

/** Handle publico (at) — glifo tipografico. */
function AtGlyph() {
  return (
    <span className="text-[17px] font-semibold leading-none text-zinc-400 dark:text-zinc-500" aria-hidden>
      @
    </span>
  );
}

/** Maquina de tatuar minimalista — alvo do morphing no :focus. */
function TattooMachineGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-orange-500" fill="currentColor" aria-hidden>
      <rect x="10.4" y="2" width="3.2" height="2" rx="0.5" />
      <path d="M7 5h10c.66 0 1.16.57 1.05 1.22l-.4 2.03H6.35l-.4-2.03C5.84 5.57 6.34 5 7 5Z" />
      <rect x="8.2" y="9.4" width="7.6" height="5.2" rx="1.4" />
      <rect x="10.7" y="14.2" width="2.6" height="4.2" rx="0.7" />
      <path d="M12 18.2 12.7 22h-1.4Z" />
    </svg>
  );
}

export function MagicUsernameInput({
  value,
  onChange,
  onAvailabilityChange,
  disabled = false,
  id,
  name = 'username',
  autoComplete = 'off',
  className,
  'aria-label': ariaLabel,
}: MagicUsernameInputProps) {
  const { getToken } = useAuth();
  const { triggerHaptic } = useHapticFeedback();
  const { t } = useI18n();

  const [focused, setFocused] = useState(false);
  const [status, setStatus] = useState<UsernameAvailability>('idle');

  const statusCallbackRef = useRef(onAvailabilityChange);
  useEffect(() => {
    statusCallbackRef.current = onAvailabilityChange;
  }, [onAvailabilityChange]);

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const tokenFn = useCallback(
    () => getTokenRef.current({ skipCache: true }).catch(() => null),
    []
  );

  useEffect(() => {
    const trimmed = value.trim();

    if (!trimmed) {
      setStatus('idle');
      statusCallbackRef.current?.('idle');
      return;
    }

    const validation = validateUsername(trimmed);
    if (!validation.valid) {
      const next: UsernameAvailability =
        validation.reason === 'reserved' ? 'reserved' : 'invalid';
      setStatus(next);
      statusCallbackRef.current?.(next);
      return;
    }

    setStatus('checking');
    statusCallbackRef.current?.('checking');

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await authedFetch(
          `/api/user/username?username=${encodeURIComponent(validation.username)}`,
          { signal: controller.signal },
          tokenFn
        );
        const json = (await res.json().catch(() => ({}))) as {
          allowed?: boolean;
          available?: boolean;
          reason?: string;
        };

        if (json.allowed === false || json.reason === 'forbidden') {
          setStatus('forbidden');
          statusCallbackRef.current?.('forbidden');
          return;
        }
        if (!res.ok) {
          setStatus('error');
          statusCallbackRef.current?.('error');
          return;
        }

        const next: UsernameAvailability = json.available ? 'available' : 'taken';
        setStatus(next);
        statusCallbackRef.current?.(next);
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setStatus('error');
        statusCallbackRef.current?.('error');
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value, tokenFn]);

  const tone: Tone = status === 'idle' ? 'neutral' : STATUS_TONE[status];
  const message = status === 'idle' ? null : t(STATUS_MESSAGE_KEY[status], { username: value });

  const handleInput = (raw: string) => {
    // Canonico: minusculas e sem espacos. Caracteres especiais permanecem
    // para que a validacao os sinalize.
    onChange(raw.replace(/\s+/g, '').toLowerCase());
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        style={{
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          backdropFilter: 'blur(12px) saturate(180%)',
        }}
        className={cn(
          'relative flex h-12 w-full items-center gap-2 rounded-2xl border px-3 transform-gpu',
          'bg-white/70 dark:bg-white/[0.03]',
          'transition-[border-color,box-shadow] duration-200 ease-out',
          tone === 'ok' && 'border-emerald-500/40 shadow-[0_0_18px_rgba(16,185,129,0.16)]',
          tone === 'bad' && 'border-red-500/40 shadow-[0_0_18px_rgba(239,68,68,0.14)]',
          (tone === 'warn' || tone === 'pending') &&
            'border-amber-500/40 shadow-[0_0_18px_rgba(245,158,11,0.14)]',
          tone === 'neutral' && 'border-black/[0.06] dark:border-white/[0.08]',
          focused && 'border-orange-500/70 shadow-[0_0_22px_rgba(249,115,22,0.28)]',
          disabled && 'opacity-60'
        )}
      >
        {/* Slot fixo do glifo — evita qualquer jitter durante o morphing. */}
        <span className="relative flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden>
          <AnimatePresence mode="wait" initial={false}>
            {focused ? (
              <motion.span
                key="machine"
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0, rotate: -120, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 120, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 340, damping: 22 }}
              >
                <TattooMachineGlyph />
              </motion.span>
            ) : (
              <motion.span
                key="at"
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0, rotate: 120, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: -120, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 340, damping: 22 }}
              >
                <AtGlyph />
              </motion.span>
            )}
          </AnimatePresence>
        </span>

        <input
          id={id}
          name={name}
          type="text"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete={autoComplete}
          enterKeyHint="done"
          maxLength={20}
          disabled={disabled}
          value={value}
          aria-label={ariaLabel ?? t('username.placeholder')}
          aria-invalid={tone === 'bad' || tone === 'warn'}
          placeholder={t('username.placeholder')}
          onChange={(event) => handleInput(event.target.value)}
          onFocus={() => {
            setFocused(true);
            triggerHaptic('light');
          }}
          onBlur={() => setFocused(false)}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-[15px] font-medium text-neutral-900 outline-none',
            'placeholder:font-normal placeholder:text-neutral-400',
            'dark:text-white dark:placeholder:text-zinc-500'
          )}
        />

        {/* Slot fixo de status — a largura nunca muda. */}
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {status === 'checking' ? (
              <motion.span
                key="checking"
                className="h-2 w-2 rounded-full bg-orange-500"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1.15, 0.85] }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              />
            ) : status === 'available' ? (
              <motion.span
                key="available"
                className="text-emerald-500"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </motion.span>
            ) : status === 'taken' || status === 'forbidden' ? (
              <motion.span
                key="bad"
                className="text-red-500"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </motion.span>
            ) : status === 'invalid' || status === 'reserved' || status === 'error' ? (
              <motion.span
                key="warn"
                className="text-amber-500"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <AlertCircle className="h-4 w-4" strokeWidth={2.4} />
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
      </div>

      {/* Área de mensagem com altura reservada: zero layout shifting. */}
      <div className="mt-1.5 min-h-[18px] px-1">
        <AnimatePresence initial={false} mode="wait">
          <motion.p
            key={status === 'idle' ? 'hint' : status}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className={cn(
              'text-[12px] leading-tight',
              status === 'idle' ? 'text-zinc-500' : MESSAGE_TONE_CLASS[tone]
            )}
          >
            {message ?? t('username.hint')}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
