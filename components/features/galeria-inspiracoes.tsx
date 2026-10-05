'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Images, RotateCcw, Sparkles } from 'lucide-react';
import { GaleriaCard } from '@/components/features/galeria-card';
import { GlassContainer } from '@/components/ui/glass-container';
import { Skeleton } from '@/components/ui/skeleton';
import { useGaleria } from '@/hooks/use-galeria';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import {
  PORTFOLIO_BODY_PARTS,
  PORTFOLIO_STYLES,
  bodyPartLabel,
  styleLabel,
} from '@/lib/portfolio-metadata';
import type { GaleriaHealingFilter } from '@/lib/types/galeria';
import { cn } from '@/lib/utils';

type GaleriaInspiracoesProps = {
  onStartConversation: (tatuadorId: string, artworkId: string) => void;
};

const HEALING_OPTIONS: { value: GaleriaHealingFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'fresh', label: 'Recém-feita' },
  { value: 'healed', label: 'Cicatrizada' },
];

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-11 shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold tracking-tight transition-all active:scale-95',
        selected
          ? 'border-orange-500 bg-orange-500/15 text-orange-700 shadow-[0_0_16px_rgba(249,115,22,0.28)] dark:text-orange-300'
          : 'border-neutral-300 bg-white text-neutral-600 hover:border-orange-500/40 hover:text-neutral-900 dark:border-neutral-700 dark:bg-[#161616] dark:text-zinc-400 dark:hover:text-zinc-200'
      )}
    >
      {children}
    </button>
  );
}

export function GaleriaInspiracoes({ onStartConversation }: GaleriaInspiracoesProps) {
  const [style, setStyle] = useState<string>('');
  const [bodyPart, setBodyPart] = useState<string>('');
  const [healed, setHealed] = useState<GaleriaHealingFilter>('all');
  const { triggerHaptic } = useHapticFeedback();

  const query = useMemo(
    () => ({
      style: style || undefined,
      bodyPart: bodyPart || undefined,
      healed,
    }),
    [style, bodyPart, healed]
  );

  const { data, isLoading, isFetching, isError } = useGaleria(query);
  const items = data ?? [];
  const hasFilters = Boolean(style || bodyPart || healed !== 'all');

  const clearFilters = () => {
    triggerHaptic('light');
    setStyle('');
    setBodyPart('');
    setHealed('all');
  };

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.22)] dark:text-orange-400">
          <Images className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="bg-gradient-to-r from-neutral-900 via-orange-700 to-orange-500 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-white dark:via-orange-100 dark:to-orange-400">
            Galeria de Inspirações
          </h2>
          <p className="mt-0.5 text-sm text-neutral-600 dark:text-zinc-400">
            Explore artes de tatuadores verificados. Filtre por estilo, parte do corpo e cicatrização.
          </p>
        </div>
      </header>

      <div className="space-y-3">
        <fieldset className="space-y-2">
          <legend className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
            Estilo
          </legend>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Chip
              selected={!style}
              onClick={() => {
                triggerHaptic('light');
                setStyle('');
              }}
            >
              Todos
            </Chip>
            {PORTFOLIO_STYLES.map((item) => (
              <Chip
                key={item}
                selected={style === item}
                onClick={() => {
                  triggerHaptic('light');
                  setStyle((current) => (current === item ? '' : item));
                }}
              >
                {styleLabel(item)}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
            Parte do corpo
          </legend>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Chip
              selected={!bodyPart}
              onClick={() => {
                triggerHaptic('light');
                setBodyPart('');
              }}
            >
              Todas
            </Chip>
            {PORTFOLIO_BODY_PARTS.map((item) => (
              <Chip
                key={item}
                selected={bodyPart === item}
                onClick={() => {
                  triggerHaptic('light');
                  setBodyPart((current) => (current === item ? '' : item));
                }}
              >
                {bodyPartLabel(item)}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
            Cicatrização
          </legend>
          <div className="flex flex-wrap gap-2">
            {HEALING_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                selected={healed === option.value}
                onClick={() => {
                  triggerHaptic('light');
                  setHealed(option.value);
                }}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </fieldset>

        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-neutral-500 transition-colors hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-300"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
            Limpar filtros
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="columns-1 gap-4 sm:columns-2">
          <Skeleton className="mb-4 h-80 w-full break-inside-avoid rounded-2xl" />
          <Skeleton className="mb-4 h-64 w-full break-inside-avoid rounded-2xl" />
          <Skeleton className="mb-4 h-72 w-full break-inside-avoid rounded-2xl" />
          <Skeleton className="mb-4 h-56 w-full break-inside-avoid rounded-2xl" />
        </div>
      ) : isError ? (
        <GlassContainer className="border-dashed p-6 text-center">
          <p className="text-sm text-neutral-500 dark:text-zinc-400">Não foi possível carregar a galeria agora.</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">Tente novamente em instantes.</p>
        </GlassContainer>
      ) : items.length === 0 ? (
        <GlassContainer className="border-dashed p-6 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-orange-500 dark:text-orange-400" strokeWidth={1.75} />
          <p className="mt-3 text-sm text-neutral-500 dark:text-zinc-400">
            {hasFilters ? 'Nenhuma arte encontrada com esses filtros.' : 'Nenhuma arte disponível ainda.'}
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">
            {hasFilters
              ? 'Ajuste estilo, parte do corpo ou cicatrização para ampliar a busca.'
              : 'Quando tatuadores verificados publicarem, as artes aparecem aqui.'}
          </p>
        </GlassContainer>
      ) : (
        <div
          className={cn(
            'columns-1 gap-4 sm:columns-2',
            isFetching && 'opacity-80 transition-opacity duration-300'
          )}
        >
          {items.map((item) => (
            <div key={item.id} className="mb-4 break-inside-avoid">
              <GaleriaCard item={item} onStartConversation={onStartConversation} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
