'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * `useRotatingToken` — motor de tempo visual TOTP (cliente).
 *
 * Gera um código numérico determinístico por janela de `period` segundos
 * (padrão 30s), sincronizado com o relógio do dispositivo. O valor é estável
 * dentro da janela corrente e rotaciona automaticamente ao expirar, sem
 * qualquer round-trip ao backend — a validação real é simulada no frontend
 * nesta etapa.
 *
 * Cleanup rigoroso: o `setInterval` é sempre limpo no unmount (e quando a
 * janela/seed muda) para eliminar memory leaks e timers órfãos.
 */

export interface RotatingTokenState {
  /** Código atual, já com zero-padding no tamanho solicitado. */
  readonly code: string;
  /** Segundos restantes até a próxima rotação (1..period). */
  readonly remaining: number;
  /** Progresso da janela corrente (1 → recém-gerado, 0 → expiração). */
  readonly progress: number;
  /** Índice absoluto da janela (muda a cada `period` segundos). */
  readonly step: number;
}

export interface UseRotatingTokenOptions {
  /** Semente estável (ex.: `agendamento.id`) — mantém o token por sessão. */
  readonly seed: string;
  /** Tamanho do código (4 a 6 dígitos). */
  readonly digits?: number;
  /** Duração da janela em segundos (padrão 30s — padrão TOTP). */
  readonly period?: number;
}

const DEFAULT_PERIOD = 30;
const DEFAULT_DIGITS = 6;

/**
 * Hash determinístico (FNV-1a + mistura xorshift/Murmur) — sem dependências
 * externas e síncrono, adequado para a derivação visual do token. NÃO é
 * criptográfico: a autorização real será server-side em etapa futura.
 */
function deriveCode(seed: string, step: number, digits: number): string {
  let hash = 0x811c9dc5 ^ (step >>> 0);
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0x5bd1e995);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;

  const modulus = 10 ** digits;
  const value = (hash >>> 0) % modulus;
  return value.toString().padStart(digits, '0');
}

export function useRotatingToken({
  seed,
  digits = DEFAULT_DIGITS,
  period = DEFAULT_PERIOD,
}: UseRotatingTokenOptions): RotatingTokenState {
  const safeDigits = Math.min(Math.max(Math.trunc(digits), 4), 6);
  const safePeriod = Math.max(Math.trunc(period), 1);

  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { code, remaining, progress, step } = useMemo(() => {
    const seconds = Math.floor(now / 1000);
    const currentStep = Math.floor(seconds / safePeriod);
    const elapsed = seconds % safePeriod;
    const secondsLeft = secondsLeftOrPeriod(elapsed, safePeriod);

    return {
      code: deriveCode(seed, currentStep, safeDigits),
      remaining: secondsLeft,
      progress: secondsLeft / safePeriod,
      step: currentStep,
    };
  }, [now, seed, safeDigits, safePeriod]);

  return { code, remaining, progress, step };
}

/** `elapsed = 0` (inclusive logo após a rotação) devolve a janela cheia. */
function secondsLeftOrPeriod(elapsed: number, period: number): number {
  return elapsed === 0 ? period : period - elapsed;
}
