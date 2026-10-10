'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, PenLine } from 'lucide-react';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';

/**
 * ClientActionCTA — botão de ação contextual da linha do tempo do cliente.
 *
 * Cobre as duas etapas acionáveis da jornada:
 * - `sign` → "Assinar Termo de Responsabilidade" (01 Ação Necessária)
 * - `pay`  → "Pagar Sinal (25%)" (02 Aguardando Pagamento)
 *
 * Anti-CLS: o botão tem `min-h-11 w-full` e o estado de loading troca o
 * conteúdo (ícone + rótulo) pelo loader compacto dentro da mesma caixa — a
 * geometria externa nunca muda. Vibração nativa em sincronia com o toque.
 */
export type ClientActionKind = 'sign' | 'pay';

export interface ClientActionCTAProps {
  readonly kind: ClientActionKind;
  /** Destino após a ação simulada. Mantém o fluxo existente da plataforma. */
  readonly href?: string;
  readonly className?: string;
}

const KIND_STYLE: Record<ClientActionKind, string> = {
  sign: 'border border-orange-500/40 bg-orange-500/10 text-orange-600 hover:brightness-110 dark:text-orange-300',
  pay: 'bg-gradient-to-b from-amber-500 to-orange-500 text-black shadow-[0_0_18px_rgba(245,158,11,0.35)] hover:brightness-105',
};

const SIMULATED_LATENCY_MS = 900;

export function ClientActionCTA({ kind, href, className }: ClientActionCTAProps): ReactNode {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    []
  );

  const label = kind === 'sign' ? t('clientAgenda.signTerm') : t('clientAgenda.payDeposit');
  const busyLabel = kind === 'sign' ? t('clientAgenda.signing') : t('clientAgenda.paying');
  const Icon = kind === 'sign' ? PenLine : CreditCard;

  const activate = useCallback(() => {
    if (loading) return;
    triggerHaptic('medium');
    setLoading(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setLoading(false);
      if (href) router.push(href);
    }, SIMULATED_LATENCY_MS);
  }, [loading, triggerHaptic, href, router]);

  return (
    <button
      type="button"
      onClick={activate}
      disabled={loading}
      aria-busy={loading}
      className={cn(
        'apple-press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-[filter,transform] duration-100 ease-out disabled:cursor-wait',
        KIND_STYLE[kind],
        className
      )}
    >
      {loading ? (
        <TattooMachineLoader compact label={busyLabel} />
      ) : (
        <>
          <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
          {label}
        </>
      )}
    </button>
  );
}
