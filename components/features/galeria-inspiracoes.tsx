'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, Images, RotateCcw, Sparkles } from 'lucide-react';
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
  { value: 'all', label: 'Cicatrização' },
  { value: 'fresh', label: 'Recém-feita' },
  { value: 'healed', label: 'Cicatrizada' },
];

const ENTRY_CARD_CLASS =
  'group flex min-h-11 w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#1a1a1a]/60 px-4 py-3 text-left shadow-sm transition-all hover:border-orange-500/40 hover:bg-orange-500/5 active:scale-[0.99]';

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
          ? 'border-orange-500 bg-orange-500/15 text-orange-300 shadow-[0_0_16px_rgba(249,115,22,0.28)]'
          : 'border-white/10 bg-[#1a1a1a] text-zinc-400 hover:border-orange-500/40 hover:text-zinc-200'
      )}
    >
      {children}
    </button>
  );
}

function FilterDivider() {
  return <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 self-center bg-white/10" />;
}

export function GaleriaEntryCard({ href = '/dashboard/galeria' }: { href?: string }) {
  return (
    <Link href={href} className={ENTRY_CARD_CLASS}>
      <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
        <Images className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold tracking-tight text-white">
          Galeria de Inspirações
        </span>
        <span className="mt-0.5 block text-xs text-zinc-500">
          Explore artes de tatuadores verificados
        </span>
      </span>
      <ChevronRight
        className="h-5 w-5 min-h-5 min-w-5 text-zinc-500 transition-colors group-hover:text-orange-400"
        strokeWidth={1.75}
      />
    </Link>
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
    <div className="space-y-4">
      <div className={ENTRY_CARD_CLASS}>
        <span className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400">
          <Images className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold tracking-tight text-white">
            Galeria de Inspirações
          </span>
          <span className="mt-0.5 block text-xs text-zinc-500">
            Filtre por estilo, parte do corpo e cicatrização
          </span>
        </span>
      </div>

      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip
          selected={!style}
          onClick={() => {
            triggerHaptic('light');
            setStyle('');
          }}
        >
          Estilo
        </Chip>
        {PORTFOLIO_STYLES.map((item) => (
          <Chip
            key={`style-${item}`}
            selected={style === item}
            onClick={() => {
              triggerHaptic('light');
              setStyle((current) => (current === item ? '' : item));
            }}
          >
            {styleLabel(item)}
          </Chip>
        ))}

        <FilterDivider />

        <Chip
          selected={!bodyPart}
          onClick={() => {
            triggerHaptic('light');
            setBodyPart('');
          }}
        >
          Corpo
        </Chip>
        {PORTFOLIO_BODY_PARTS.map((item) => (
          <Chip
            key={`body-${item}`}
            selected={bodyPart === item}
            onClick={() => {
              triggerHaptic('light');
              setBodyPart((current) => (current === item ? '' : item));
            }}
          >
            {bodyPartLabel(item)}
          </Chip>
        ))}

        <FilterDivider />

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

        {hasFilters ? (
          <>
            <FilterDivider />
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-[#1a1a1a] px-3.5 text-xs font-semibold text-zinc-400 transition-colors hover:border-orange-500/40 hover:text-orange-300"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
              Limpar
            </button>
          </>
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
