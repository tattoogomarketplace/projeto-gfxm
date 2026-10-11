'use client';

import { useId, useMemo, type ReactNode } from 'react';
import { Fingerprint, RefreshCw } from 'lucide-react';
import { useRotatingToken } from '@/hooks/use-rotating-token';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

/**
 * TattooGoPassCard — token rotativo do cliente (Visão Pass).
 *
 * "Aperto de mão digital" que libera o split de pagamento da sessão. Exibe um
 * código TOTP visual que rotaciona a cada 30s, acompanhado de um anel de
 * progresso SVG em cobre/laranja que esvazia suavemente. O código é marcado
 * `aria-hidden` — leitores de tela anunciam apenas a contagem regressiva para
 * não vazar o token em texto acessível.
 *
 * Anti-screenshot: pulso de opacidade muito suave (`animate-pulse`) somado a um
 * gradiente dinâmico (`pass-sweep`) para que capturas de tela pareçam
 * estáticas/mortas.
 *
 * Dimensões relativas e `max-w` fluido → zero CLS em qualquer viewport.
 */
export interface TattooGoPassCardProps {
  /** Semente estável do token (ex.: `agendamento.id`). */
  readonly seed: string;
  /** Quantidade de dígitos (4 a 6). Padrão 6. */
  readonly digits?: number;
  /** Janela de rotação em segundos. Padrão 30. */
  readonly period?: number;
  readonly className?: string;
}

const RING_SIZE = 148;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function TattooGoPassCard({
  seed,
  digits = 6,
  period = 30,
  className,
}: TattooGoPassCardProps): ReactNode {
  const { t } = useI18n();
  const { code, remaining, progress } = useRotatingToken({ seed, digits, period });
  const gradientId = useId();
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
  const grouped = useMemo(() => code.split('').join('\u2009'), [code]);

  return (
    <div
      className={cn(
        'relative mx-auto w-full max-w-[360px] overflow-hidden rounded-3xl border border-brand-copper/30 bg-[#080808] p-5 shadow-[0_20px_60px_-24px_rgba(217,70,14,0.55)]',
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand-copper/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-b from-white/[0.035] via-transparent to-white/[0.02]"
      />
      <div aria-hidden className="pass-sweep pointer-events-none absolute inset-0" />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl border border-brand-copper/40 bg-brand-copper/15 text-brand-copper-soft">
            <Fingerprint className="h-4 w-4" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-white">TattooGo Pass</p>
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.2em] text-brand-copper-soft/80">
              {t('pass.codeLabel')}
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          {t('pass.active')}
        </span>
      </div>

      <div className="relative mt-5 flex items-center justify-center">
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className="-rotate-90"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F05000" />
              <stop offset="55%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#D9460E" />
            </linearGradient>
          </defs>
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={RING_STROKE}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            role="timer"
            aria-label={t('pass.rotateIn', { seconds: remaining })}
            className="text-3xl font-bold tabular-nums tracking-tight text-white"
          >
            {remaining}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
            s
          </span>
        </div>
      </div>

      <div
        aria-hidden
        className="relative mt-5 flex items-center justify-center rounded-2xl border border-brand-copper/20 bg-white/[0.02] py-3"
      >
        <span className="font-mono text-4xl font-semibold tracking-widest text-orange-100 tabular-nums">
          {grouped}
        </span>
      </div>

      <div className="relative mt-4 space-y-1.5 text-center">
        <p className="text-xs leading-relaxed text-neutral-400">{t('pass.showToArtist')}</p>
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-brand-copper-soft">
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
          {t('pass.rotateIn', { seconds: remaining })}
        </p>
      </div>
    </div>
  );
}
