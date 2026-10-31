'use client';

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@clerk/nextjs';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, ShieldCheck, X } from 'lucide-react';
import { updateUsername } from '@/app/actions/username-actions';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { UsernameMorphGlyph } from '@/components/ui/username-glyph';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { authedFetch } from '@/lib/utils/authed-fetch';
import {
  RESERVED_USERNAMES,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  sanitizeUsernameBody,
} from '@/lib/username';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/lib/utils/auth-redirect';
import { BRAND_NAME } from '@/lib/i18n/brands';
import type { MessageKey } from '@/lib/i18n/types';

/**
 * TATTOOGO MK — Onboarding de Identidade (@username) — Opus 5.5 tier.
 *
 * Porta visual da fundação backend (Schema + Server Action `updateUsername` +
 * trava de 30 dias). Toda a regra de negocio permanece no servidor; aqui
 * cuidamos exclusivamente de: física de Framer Motion, render sub-pixel,
 * zero layout shift (CLS = 0) e resposta tátil.
 *
 * O `@` é um prefixo visual INLINE (a mesma "Inline Prefix Illusion" do
 * SearchBar): fora do `<input>`, ele se metamorfoseia na máquina de tatuagem 3D
 * ao focar, sem deslocar texto nem caret.
 *
 * Performance (120fps): o `<input>` é nativo/uncontrolled. A tecla NÃO dispara
 * setState. A checagem remota só roda 500ms após a última tecla. O pai só é
 * notificado em transições de disponibilidade.
 */

type Availability =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid'
  | 'reserved'
  | 'forbidden'
  | 'error';

const MESSAGE_KEY: Record<Exclude<Availability, 'idle' | 'error'>, MessageKey> = {
  checking: 'username.checking',
  available: 'username.available',
  taken: 'username.taken',
  invalid: 'username.invalid',
  reserved: 'username.reserved',
  forbidden: 'username.forbidden',
};

const NETWORK_ERROR_MESSAGE = 'Erro de conexão. Tente novamente.';

type Tone = 'neutral' | 'pending' | 'ok' | 'bad';

const TONE: Record<Exclude<Availability, 'idle'>, Tone> = {
  checking: 'pending',
  available: 'ok',
  taken: 'bad',
  invalid: 'bad',
  reserved: 'bad',
  forbidden: 'bad',
  error: 'bad',
};

const MESSAGE_TONE: Record<Tone, string> = {
  neutral: 'text-zinc-500',
  pending: 'text-orange-400',
  ok: 'text-emerald-400',
  bad: 'text-red-400',
};

const CHECK_DEBOUNCE_MS = 500;

export interface OnboardingUsernameProps {
  /** Papel persistido — dirige tom narrativo e destino pós-sucesso. */
  role?: AppRole | null;
  /** Rótulo do fluxo de origem (cliente x artista), só para a narrativa. */
  flow?: 'cliente' | 'tatuador';
  /** Chamado com o handle efetivado após a confirmação do servidor. */
  onCompleted?: (username: string) => void;
  className?: string;
}

/**
 * Glow ambiente (radial) em movimento contínuo — brand orange + zinc. Fica
 * atrás do conteúdo com `pointer-events-none`, então nunca intercepta toques
 * nem interfere no layout (posicionamento absoluto, sem influência de fluxo).
 *
 * `memo` sem props: nunca re-renderiza, nem quando o pai reconcilia.
 */
const AmbientGlow = memo(function AmbientGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden contain-paint">
      <div className="username-orb username-orb-a" />
      <div className="username-orb username-orb-b" />
      <div className="username-orb username-orb-c" />
    </div>
  );
});

/** Estado de disponibilidade estabilizado que o pai realmente precisa. */
type FieldState = { status: Availability; username: string | null };

export interface UsernameFieldHandle {
  /** Dispara o shake imperativamente (ex.: erro no submit). */
  shake: () => void;
}

interface UsernameFieldProps {
  onStateChange: (state: FieldState) => void;
  submitError: string | null;
}

function localUsernameStatus(raw: string): Availability | 'ok' {
  if (!raw) return 'idle';
  if (/[^a-z0-9_]/.test(raw)) return 'invalid';
  if (raw.length < USERNAME_MIN_LENGTH || raw.length > USERNAME_MAX_LENGTH) return 'invalid';
  if (RESERVED_USERNAMES.has(raw)) return 'reserved';
  return 'ok';
}

const UsernameFieldFeedback = memo(function UsernameFieldFeedback({
  status,
  submitError,
  message,
  tone,
}: {
  status: Availability;
  submitError: string | null;
  message: string | null;
  tone: Tone;
}) {
  return (
    <div className="mt-2 min-h-[20px] px-1">
      <AnimatePresence initial={false} mode="wait">
        <motion.p
          key={submitError ? 'submit-error' : status}
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.16 }}
          className={cn(
            'text-[12px] leading-tight',
            submitError ? 'text-red-400' : status === 'idle' ? 'text-zinc-500' : MESSAGE_TONE[tone]
          )}
        >
          {submitError ?? message ?? '3–20 caracteres. Letras minúsculas, números e underline.'}
        </motion.p>
      </AnimatePresence>
    </div>
  );
});

/**
 * Campo de @username auto-contido. É o ÚNICO componente que re-renderiza a cada
 * tecla; o `onStateChange` só emite em transições reais de disponibilidade, de
 * modo que digitar nunca repinta a página inteira.
 */
const UsernameField = memo(forwardRef<UsernameFieldHandle, UsernameFieldProps>(
  function UsernameField({ onStateChange, submitError }, ref) {
    const { getToken } = useAuth();
    const { triggerHaptic } = useHapticFeedback();
    const { t } = useI18n();

    const [focused, setFocused] = useState(false);
    const [shaking, setShaking] = useState(false);
    const [status, setStatus] = useState<Availability>('idle');
    const [checkedUsername, setCheckedUsername] = useState('');

    const inputRef = useRef<HTMLInputElement>(null);
    const rawRef = useRef('');
    const checkTimer = useRef<number | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const shakeTimer = useRef<number | null>(null);

    const getTokenRef = useRef(getToken);
    useEffect(() => {
      getTokenRef.current = getToken;
    }, [getToken]);
    const tokenFn = useCallback(() => getTokenRef.current({ skipCache: true }).catch(() => null), []);

    const triggerShake = useCallback(() => {
      if (shakeTimer.current !== null) window.clearTimeout(shakeTimer.current);
      setShaking(false);
      requestAnimationFrame(() => {
        setShaking(true);
        shakeTimer.current = window.setTimeout(() => setShaking(false), 380);
      });
    }, []);

    const statusRef = useRef<Availability>('idle');
    const applyStatus = useCallback((next: Availability, username: string) => {
      const changed = statusRef.current !== next;
      statusRef.current = next;
      setStatus((prev) => (prev === next ? prev : next));
      setCheckedUsername((prev) => (prev === username ? prev : username));
      if (!changed) return;
      if (next === 'available') triggerHaptic('light');
      if (next === 'taken' || next === 'error' || next === 'forbidden') {
        triggerHaptic('heavy');
        triggerShake();
      }
    }, [triggerHaptic, triggerShake]);

    const runRemoteCheck = useCallback(
      async (username: string) => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        try {
          const res = await authedFetch(
            `/api/user/username?username=${encodeURIComponent(username)}`,
            { signal: controller.signal },
            tokenFn
          );
          const json = (await res.json().catch(() => ({}))) as {
            allowed?: boolean;
            available?: boolean;
            reason?: string;
          };
          if (controller.signal.aborted || rawRef.current !== username) return;
          let next: Availability;
          if (!res.ok) {
            next = 'error';
          } else if (json.allowed === false || json.reason === 'forbidden') {
            next = 'forbidden';
          } else if (json.available === true) {
            next = 'available';
          } else {
            next = 'taken';
          }
          applyStatus(next, username);
        } catch (err) {
          if ((err as Error)?.name === 'AbortError') return;
          if (rawRef.current !== username) return;
          applyStatus('error', username);
        }
      },
      [applyStatus, tokenFn]
    );

    const scheduleCheck = useCallback(
      (value: string) => {
        if (checkTimer.current !== null) window.clearTimeout(checkTimer.current);
        const local = localUsernameStatus(value);
        if (local !== 'ok') {
          abortRef.current?.abort();
          setStatus((prev) => (prev === local ? prev : local));
          return;
        }
        checkTimer.current = window.setTimeout(() => {
          if (rawRef.current !== value) return;
          applyStatus('checking', value);
          void runRemoteCheck(value);
        }, CHECK_DEBOUNCE_MS);
      },
      [applyStatus, runRemoteCheck]
    );

    useEffect(() => {
      return () => {
        if (checkTimer.current !== null) window.clearTimeout(checkTimer.current);
        if (shakeTimer.current !== null) window.clearTimeout(shakeTimer.current);
        abortRef.current?.abort();
      };
    }, []);

    const onStateChangeRef = useRef(onStateChange);
    useEffect(() => {
      onStateChangeRef.current = onStateChange;
    }, [onStateChange]);

    const reportedRef = useRef<FieldState | null>(null);
    useEffect(() => {
      const next: FieldState = {
        status,
        username: status === 'available' ? checkedUsername : null,
      };
      const prev = reportedRef.current;
      if (prev && prev.status === next.status && prev.username === next.username) return;
      reportedRef.current = next;
      onStateChangeRef.current(next);
    }, [status, checkedUsername]);

    useImperativeHandle(
      ref,
      () => ({
        shake: triggerShake,
      }),
      [triggerShake]
    );

    const handleInput = (event: React.FormEvent<HTMLInputElement>) => {
      const el = event.currentTarget;
      const next = sanitizeUsernameBody(el.value).slice(0, USERNAME_MAX_LENGTH);
      if (el.value !== next) el.value = next;
      if (rawRef.current === next) return;
      rawRef.current = next;
      scheduleCheck(next);
    };

    const handleGlyphActivate = useCallback((event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(0, 0);
    }, []);

    const handleGlyphLocked = useCallback(() => triggerHaptic('medium'), [triggerHaptic]);

    const handleClear = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (checkTimer.current !== null) {
          window.clearTimeout(checkTimer.current);
          checkTimer.current = null;
        }
        abortRef.current?.abort();
        rawRef.current = '';
        const el = inputRef.current;
        if (el) {
          el.value = '';
          el.focus();
        }
        applyStatus('idle', '');
      },
      [applyStatus]
    );

    const tone: Tone = status === 'idle' ? 'neutral' : TONE[status];
    const message =
      status === 'idle'
        ? null
        : status === 'error'
          ? NETWORK_ERROR_MESSAGE
          : t(MESSAGE_KEY[status], { username: checkedUsername });
    const showClear =
      status === 'taken' ||
      status === 'forbidden' ||
      status === 'error' ||
      status === 'invalid' ||
      status === 'reserved';

    return (
      <>
        <div className={cn('transform-gpu', shaking && 'username-shake')}>
          <div
            onMouseDown={(event) => {
              const el = inputRef.current;
              if (!el || event.target === el) return;
              event.preventDefault();
              el.focus();
              const end = el.value.length;
              el.setSelectionRange(end, end);
            }}
            className={cn(
              'relative flex h-14 w-full cursor-text flex-row items-center gap-2 rounded-2xl border bg-white/[0.05] px-3.5 transform-gpu contain-layout',
              'transition-[border-color,box-shadow] duration-200 ease-out',
              tone === 'pending' && 'border-orange-500/45 shadow-[0_0_20px_rgba(249,115,22,0.18)]',
              tone === 'ok' && 'border-emerald-500/45 shadow-[0_0_22px_rgba(16,185,129,0.2)]',
              tone === 'bad' && 'border-red-500/45 shadow-[0_0_22px_rgba(239,68,68,0.18)]',
              tone === 'neutral' && 'border-white/[0.1]',
              focused && 'border-orange-500/70 shadow-[0_0_26px_rgba(249,115,22,0.32)]'
            )}
          >
            <UsernameMorphGlyph
              focused={focused}
              onLocked={handleGlyphLocked}
              onActivate={handleGlyphActivate}
            />
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              enterKeyHint="done"
              maxLength={USERNAME_MAX_LENGTH}
              defaultValue=""
              onInput={handleInput}
              onFocus={() => {
                setFocused(true);
                triggerHaptic('light');
              }}
              onBlur={() => setFocused(false)}
              aria-label="Escolha seu @username"
              aria-invalid={tone === 'bad'}
              placeholder="seu_username"
              className="absolute left-[46px] right-4 top-1/2 h-6 -translate-y-1/2 appearance-none border-none bg-transparent text-[16px] leading-6 text-zinc-100 caret-orange-500 shadow-none outline-none !m-0 !p-0 placeholder:text-zinc-500"
            />

            <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center">
              {status === 'checking' ? (
                <Loader2 className="h-4 w-4 animate-spin text-orange-400" strokeWidth={2.6} />
              ) : status === 'available' ? (
                <Check className="h-5 w-5 text-emerald-400" strokeWidth={3} />
              ) : showClear ? (
                <button
                  type="button"
                  aria-label="Limpar username"
                  onMouseDown={handleClear}
                  onClick={handleClear}
                  className="relative z-10 flex h-5 w-5 pointer-events-auto items-center justify-center"
                >
                  <X
                    className={cn(
                      'h-5 w-5',
                      status === 'invalid' || status === 'reserved'
                        ? 'text-amber-400'
                        : 'text-red-400'
                    )}
                    strokeWidth={3}
                  />
                </button>
              ) : null}
            </span>
          </div>
        </div>

        <UsernameFieldFeedback
          status={status}
          submitError={submitError}
          message={message}
          tone={tone}
        />
      </>
    );
  }
));

export function OnboardingUsername({
  flow,
  onCompleted,
  className,
}: OnboardingUsernameProps) {
  const { triggerHaptic } = useHapticFeedback();

  const [fieldState, setFieldState] = useState<FieldState>({ status: 'idle', username: null });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fieldRef = useRef<UsernameFieldHandle>(null);

  // Estável por design: o campo memoizado nunca re-renderiza por causa do pai.
  // Só atualiza quando a disponibilidade muda de fato (não a cada tecla).
  const handleStateChange = useCallback((next: FieldState) => {
    setSubmitError((prev) => (prev ? null : prev));
    setFieldState((prev) =>
      prev.status === next.status && prev.username === next.username ? prev : next
    );
  }, []);

  const status = fieldState.status;
  const trimmed = fieldState.username ?? '';
  const canSubmit = status === 'available' && !!fieldState.username && !submitting;

  const handleContinue = () => {
    if (!canSubmit) return;
    triggerHaptic('medium');
    setSheetOpen(true);
  };

  const confirm = async () => {
    if (submitting || !fieldState.username) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await updateUsername({ username: fieldState.username });
      if (result.ok) {
        triggerHaptic('success');
        setSheetOpen(false);
        onCompleted?.(result.username);
      } else {
        setSubmitError(result.error);
        setSheetOpen(false);
        triggerHaptic('heavy');
        fieldRef.current?.shake();
      }
    } catch {
      setSubmitError('Falha ao salvar o @username. Tente novamente.');
      setSheetOpen(false);
      triggerHaptic('heavy');
      fieldRef.current?.shake();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        'relative flex h-full min-h-[100dvh] w-full flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-none bg-[#0a0a0a] px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] contain-paint [-webkit-overflow-scrolling:touch]',
        className
      )}
    >
      <AmbientGlow />

      <div className="relative z-10 mx-auto my-auto flex w-full max-w-md flex-1 flex-col justify-center">
        {/* Glassmorphism card */}
        <div className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-zinc-950/90 p-6 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)] sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent"
          />

          <header className="mb-6 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-orange-500">
              {BRAND_NAME}
            </p>
            <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-tight text-white sm:text-3xl">
              {flow === 'tatuador' ? 'Seu selo de artista' : 'Escolha seu @username'}
            </h1>
            <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-zinc-400">
              É assim que a comunidade vai te encontrar. Escolha com calma: sua identidade fica
              travada por 30 dias.
            </p>
          </header>

          <UsernameField
            ref={fieldRef}
            onStateChange={handleStateChange}
            submitError={submitError}
          />

          <button
            type="button"
            onClick={handleContinue}
            disabled={!canSubmit}
            className={cn(
              'mt-6 flex min-h-14 w-full items-center justify-center rounded-2xl px-6 text-base font-bold transition-all duration-200 active:scale-[0.98]',
              canSubmit
                ? 'bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-[0_0_26px_rgba(249,115,22,0.5)] hover:shadow-[0_0_36px_rgba(249,115,22,0.75)]'
                : 'cursor-not-allowed bg-white/[0.06] text-zinc-500'
            )}
          >
            Continuar
          </button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
            <ShieldCheck className="h-3.5 w-3.5 text-orange-500/80" strokeWidth={1.75} />
            Identidade protegida por trava de 30 dias.
          </p>
        </div>
      </div>

      <Drawer
        open={sheetOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !submitting) setSheetOpen(false);
        }}
        dismissible={!submitting}
      >
        <DrawerContent
          overlayClassName="z-[95]"
          className="z-[96] mt-24 h-auto max-h-[100dvh]"
          aria-label="Confirmar identidade única"
        >
          <DrawerHeader className="px-6 pt-2 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10">
              <ShieldCheck className="h-6 w-6 text-orange-400" strokeWidth={1.75} />
            </div>
            <DrawerTitle className="text-center text-lg font-bold tracking-tight text-white">
              Identidade Única
            </DrawerTitle>
          </DrawerHeader>
          <DrawerBody className="px-6">
            <p className="text-center text-sm leading-relaxed text-zinc-400">
              Você só poderá alterar seu{' '}
              <span className="font-semibold text-orange-400">@{trimmed}</span> novamente em{' '}
              <span className="font-semibold text-white">30 dias</span>. Confirmar?
            </p>
          </DrawerBody>
          <DrawerFooter className="px-6">
            <button
              type="button"
              onClick={confirm}
              disabled={submitting}
              className="flex min-h-13 w-full items-center justify-center rounded-2xl bg-gradient-to-b from-orange-500 to-orange-600 py-3.5 text-base font-bold text-white shadow-[0_0_26px_rgba(249,115,22,0.5)] transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.6} /> : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              disabled={submitting}
              className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/[0.08] py-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-white/20 disabled:opacity-60"
            >
              Revisar
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
