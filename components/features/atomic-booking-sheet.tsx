'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { NeonButton } from '@/components/ui/neon-button';
import { useCriarAgendamento } from '@/hooks/use-agendamentos';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

export const SESSION_HOLD_BRL = 400;

type AtomicBookingSheetProps = {
  artistId: string;
  artistName: string;
  slots: string[];
  artworkId?: string;
  artworkLabel?: string;
  open: boolean;
  onClose: () => void;
  onBooked?: () => void;
};

function formatSlot(iso: string): { day: string; time: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { day: 'Horário', time: '--:--' };
  }
  return {
    day: date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }),
    time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}

export function AtomicBookingSheet({
  artistId,
  artistName,
  slots,
  artworkId,
  artworkLabel,
  open,
  onClose,
  onBooked,
}: AtomicBookingSheetProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const { mutateAsync, isPending } = useCriarAgendamento();
  const { triggerHaptic } = useHapticFeedback();
  const sinal = useMemo(() => Number((SESSION_HOLD_BRL * 0.25).toFixed(2)), []);
  const activeSlot = selectedSlot && slots.includes(selectedSlot) ? selectedSlot : slots[0] ?? null;

  if (!open) return null;

  const confirm = async () => {
    if (!activeSlot || isPending) return;
    triggerHaptic('medium');
    try {
      await mutateAsync({
        tatuador_id: artistId,
        data_hora: activeSlot,
        valor_total: SESSION_HOLD_BRL,
        extras: artworkLabel
          ? [{ descricao: artworkId ? `Peça ${artworkLabel}` : artworkLabel, valor: 0 }]
          : [],
      });
      onBooked?.();
      onClose();
    } catch {
      return;
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center">
      <div className="max-h-[min(88vh,calc(100dvh-2rem))] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-[#121212]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-500 dark:text-orange-400">
              Booking atômico
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
              Agendar com {artistName}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-zinc-500">
              O sinal de 25% ({sinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) trava o
              horário. O restante é alinhado na sessão.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 hover:border-orange-500/40 hover:text-orange-500 dark:border-neutral-700 dark:text-zinc-400"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        {artworkLabel ? (
          <p className="mb-3 rounded-xl border border-orange-500/20 bg-orange-500/5 px-3 py-2 text-xs text-neutral-600 dark:text-zinc-400">
            Referência: {artworkLabel}
          </p>
        ) : null}

        {slots.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:text-zinc-400">
            Nenhum horário livre nos próximos 14 dias.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {slots.map((slot) => {
              const { day, time } = formatSlot(slot);
               const selected = activeSlot === slot;
              return (
                <li key={slot}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedSlot(slot);
                    }}
                    className={cn(
                      'flex min-h-11 w-full flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.98]',
                      selected
                        ? 'border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-300'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-orange-500/40 dark:border-neutral-800 dark:bg-[#161616] dark:text-zinc-300'
                    )}
                  >
                    <span className="w-full truncate text-[11px] font-semibold uppercase tracking-wide">{day}</span>
                    <span className="text-sm font-semibold">{time}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <NeonButton
          className="mt-5 w-full"
          disabled={!activeSlot || isPending || slots.length === 0}
          onClick={() => {
            void confirm();
          }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
            {isPending ? 'Reservando...' : 'Confirmar horário'}
          </span>
        </NeonButton>
      </div>
    </div>
  );
}
