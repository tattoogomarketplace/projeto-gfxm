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
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { Check, Loader2, ShieldCheck, X } from 'lucide-react';
import { updateUsername } from '@/app/actions/username-actions';
import { UsernameMorphGlyph } from '@/components/ui/username-glyph';
import { useDebounce } from '@/hooks/use-debounce';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { authedFetch } from '@/lib/utils/authed-fetch';
import {
  RESERVED_USERNAMES,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  validateUsername,
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
 * Performance (60fps): o estado de digitação (`rawUsername`) vive ISOLADO no
 * `UsernameField` (memoizado) e atualiza o `<input>` no mesmo frame. A checagem
 * remota só observa `debouncedUsername` (500ms). O componente-pai só é
 * notificado em transições de disponibilidade — nunca a cada tecla — então o
 * fundo animado, o card de vidro e a bottom sheet não voltam a renderizar
 * enquanto o usuário digita.
 */

const DEBOUNCE_MS = 500;

type Availability =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid'
  | 'reserved'
  | 'forbidden'
  | 'error';

const MESSAGE_KEY: Record<Exclude<Availability, 'idle'>, MessageKey> = {
  checking: 'username.checking',
  available: 'username.available',
  taken: 'username.taken',
  invalid: 'username.invalid',
  reserved: 'username.reserved',
  forbidden: 'username.forbidden',
  error: 'username.invalid',
};

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

const SHAKE = { x: [0, -9, 9, -7, 7, -4, 4, 0] };

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
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-1/4 top-[-12%] h-[68vmin] w-[68vmin] rounded-full blur-[90px]"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.34), transparent 66%)' }}
        animate={{
          x: ['-8%', '14%', '-4%', '-8%'],
          y: ['0%', '9%', '-7%', '0%'],
          scale: [1, 1.16, 0.94, 1],
          opacity: [0.5, 0.8, 0.46, 0.5],
        }}
        transition={{ duration: 19, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        className="absolute -right-1/4 bottom-[-14%] h-[64vmin] w-[64vmin] rounded-full blur-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(161,161,170,0.24), transparent 68%)' }}
        animate={{
          x: ['10%', '-12%', '6%', '10%'],
          y: ['0%', '-8%', '7%', '0%'],
          scale: [1, 0.92, 1.14, 1],
          opacity: [0.42, 0.66, 0.4, 0.42],
        }}
        transition={{ duration: 23, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[46vmin] w-[46vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[110px]"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.16), transparent 70%)' }}
        animate={{ scale: [0.9, 1.2, 0.9], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 14, ease: 'easeInOut', repeat: Infinity }}
      />
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

    const [rawUsername, setRawUsername] = useState('');
    const debouncedUsername = useDebounce(rawUsername, DEBOUNCE_MS);
    const [focused, setFocused] = useState(false);
    const [remote, setRemote] = useState<{
      username: string;
      status: Extract<Availability, 'available' | 'taken' | 'forbidden' | 'error'>;
    } | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const shakeControls = useAnimationControls();

    const localStatus = localUsernameStatus(rawUsername);
    const debouncedValidation = validateUsername(debouncedUsername);
    const trimmed = debouncedValidation.valid ? debouncedValidation.username : '';

    const status: Availability =
      localStatus !== 'ok'
        ? localStatus
        : rawUsername !== debouncedUsername
          ? 'checking'
          : remote && remote.username === trimmed
            ? remote.status
            : 'checking';

    const getTokenRef = useRef(getToken);
    useEffect(() => {
      getTokenRef.current = getToken;
    }, [getToken]);
    const tokenFn = useCallback(() => getTokenRef.current({ skipCache: true }).catch(() => null), []);

    useEffect(() => {
      if (!debouncedValidation.valid || !trimmed) return;
      const username = trimmed;
      const controller = new AbortController();
      const run = async () => {
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
          if (controller.signal.aborted) return;
          const next: 'available' | 'taken' | 'forbidden' | 'error' =
            json.allowed === false || json.reason === 'forbidden'
              ? 'forbidden'
              : !res.ok
                ? 'error'
                : json.available
                  ? 'available'
                  : 'taken';
          setRemote({ username, status: next });
        } catch (err) {
          if ((err as Error)?.name === 'AbortError') return;
          setRemote({ username, status: 'error' });
        }
      };
      void run();
      return () => {
        controller.abort();
      };
    }, [debouncedValidation.valid, trimmed, tokenFn]);

    // Haptics + shake reativos à transição de estado (sem setState no efeito).
    const prevStatus = useRef<Availability>('idle');
    useEffect(() => {
      if (status === prevStatus.current) return;
      prevStatus.current = status;
      if (status === 'available') {
        triggerHaptic('light');
      } else if (status === 'taken' || status === 'error' || status === 'forbidden') {
        triggerHaptic('heavy');
        void shakeControls.start(SHAKE);
      }
    }, [status, triggerHaptic, shakeControls]);

    // Reporta ao pai APENAS transições relevantes: o handle só sobe quando está
    // efetivamente disponível, então o pai não re-renderiza a cada tecla.
    const onStateChangeRef = useRef(onStateChange);
    useEffect(() => {
      onStateChangeRef.current = onStateChange;
    }, [onStateChange]);

    const reportedRef = useRef<FieldState | null>(null);
    useEffect(() => {
      const next: FieldState = {
        status,
        username: status === 'available' ? trimmed : null,
      };
      const prev = reportedRef.current;
      if (prev && prev.status === next.status && prev.username === next.username) return;
      reportedRef.current = next;
      onStateChangeRef.current(next);
    }, [status, trimmed]);

    useImperativeHandle(
      ref,
      () => ({
        shake: () => {
          void shakeControls.start(SHAKE);
        },
      }),
      [shakeControls]
    );

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setRawUsername(event.target.value);
    };

    const handleGlyphActivate = (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(0, 0);
    };

    const handleGlyphLocked = useCallback(() => triggerHaptic('medium'), [triggerHaptic]);

    const tone: Tone = status === 'idle' ? 'neutral' : TONE[status];
    const message = status === 'idle' ? null : t(MESSAGE_KEY[status], { username: trimmed });

    return (
      <>
        <motion.div animate={shakeControls} className="transform-gpu">
          <div
            onMouseDown={(event) => {
              const el = inputRef.current;
              if (!el || event.target === el) return;
              event.preventDefault();
              el.focus();
              const end = el.value.length;
              el.setSelectionRange(end, end);
            }}
            style={{ WebkitBackdropFilter: 'blur(12px) saturate(180%)', backdropFilter: 'blur(12px) saturate(180%)' }}
            className={cn(
              'relative flex flex-row h-14 w-full cursor-text items-center gap-2 rounded-2xl border px-3.5 transform-gpu',
              'bg-white/[0.05] transition-[border-color,box-shadow] duration-200 ease-out',
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
              maxLength={20}
              value={rawUsername}
              onChange={handleChange}
              onFocus={() => {
                setFocused(true);
                triggerHaptic('light');
              }}
              onBlur={() => setFocused(false)}
              aria-label="Escolha seu @username"
              aria-invalid={tone === 'bad'}
              placeholder="seu_username"
              className="absolute left-[46px] right-4 top-1/2 h-6 -translate-y-1/2 appearance-none bg-transparent !p-0 !m-0 outline-none border-none shadow-none text-zinc-100 placeholder:text-zinc-500 caret-orange-500 leading-6"
            />

            {/* Slot fixo de status — largura imutável (CLS = 0). */}
            <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center">
              <AnimatePresence mode="wait" initial={false}>
                {status === 'checking' ? (
                  <motion.span
                    key="checking"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-orange-400" strokeWidth={2.6} />
                  </motion.span>
                ) : status === 'available' ? (
                  <motion.span
                    key="available"
                    className="text-emerald-400"
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.4 }}
                    transition={{ type: 'spring', stiffness: 440, damping: 18 }}
                  >
                    <Check className="h-5 w-5" strokeWidth={3} />
                  </motion.span>
                ) : status === 'taken' || status === 'forbidden' || status === 'error' ? (
                  <motion.span
                    key="bad"
                    className="text-red-400"
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.4 }}
                    transition={{ type: 'spring', stiffness: 440, damping: 18 }}
                  >
                    <X className="h-5 w-5" strokeWidth={3} />
                  </motion.span>
                ) : status === 'invalid' || status === 'reserved' ? (
                  <motion.span
                    key="warn"
                    className="text-amber-400"
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.4 }}
                    transition={{ type: 'spring', stiffness: 440, damping: 18 }}
                  >
                    <X className="h-5 w-5" strokeWidth={3} />
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </span>
          </div>
        </motion.div>

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
    // Ao editar o handle, qualquer erro de submit anterior deixa de valer.
    setSubmitError(null);
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
        'gpu-layer relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden overscroll-none px-4 py-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]',
        className
      )}
      style={{ background: 'radial-gradient(120% 120% at 50% 0%, #131313 0%, #0a0a0a 55%, #050505 100%)' }}
    >
      <AmbientGlow />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26, mass: 0.9 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Glassmorphism card */}
        <div
          className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-white/[0.045] p-6 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)] sm:p-7"
          style={{ WebkitBackdropFilter: 'blur(24px) saturate(160%)', backdropFilter: 'blur(24px) saturate(160%)' }}
        >
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
      </motion.div>

      {/* Premium confirmation bottom sheet */}
      <AnimatePresence>
        {sheetOpen ? (
          <motion.div
            className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar identidade única"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              if (!submitting) setSheetOpen(false);
            }}
          >
            <motion.div
              onClick={(event) => event.stopPropagation()}
              initial={{ y: '110%', opacity: 0.6, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '110%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
              className="w-full max-w-md rounded-[26px] border border-white/[0.09] bg-zinc-950/95 p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15" aria-hidden />
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10">
                <ShieldCheck className="h-6 w-6 text-orange-400" strokeWidth={1.75} />
              </div>
              <h2 className="text-center text-lg font-bold tracking-tight text-white">
                Identidade Única
              </h2>
              <p className="mt-2 text-center text-sm leading-relaxed text-zinc-400">
                Você só poderá alterar seu{' '}
                <span className="font-semibold text-orange-400">@{trimmed}</span> novamente em{' '}
                <span className="font-semibold text-white">30 dias</span>. Confirmar?
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
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
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
