'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from '@/components/ui/drawer';
import { NeonButton } from '@/components/ui/neon-button';
import { useCriarAgendamento } from '@/hooks/use-agendamentos';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
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

function formatSlot(iso: string, fallbackDay: string): { day: string; time: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { day: fallbackDay, time: '--:--' };
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
  const { t } = useI18n();
  const sinal = useMemo(() => Number((SESSION_HOLD_BRL * 0.25).toFixed(2)), []);
  const activeSlot = selectedSlot && slots.includes(selectedSlot) ? selectedSlot : slots[0] ?? null;

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
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isPending) onClose();
      }}
      dismissible={!isPending}
    >
      <DrawerContent
        overlayClassName="z-[80]"
        className="z-[81] mt-24 h-auto max-h-[100dvh]"
        aria-label={t('booking.atomicTitle')}
      >
        <DrawerHeader className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-500">
              {t('booking.atomicTitle')}
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">
              {t('chat.bookWith', { name: artistName })}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              {t('booking.depositHint', {
                amount: sinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/[0.05] text-zinc-400 hover:border-orange-500/40 hover:text-orange-500"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </DrawerHeader>

        <DrawerBody>
          {artworkLabel ? (
            <p className="mb-3 rounded-xl border border-orange-500/20 bg-orange-500/5 px-3 py-2 text-xs text-zinc-400">
              {t('booking.reference', { label: artworkLabel })}
            </p>
          ) : null}

          {slots.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/[0.05] px-4 py-6 text-center text-sm text-zinc-400">
              {t('booking.noSlots')}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2">
              {slots.map((slot) => {
                const { day, time } = formatSlot(slot, t('booking.timeFallback'));
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
                          ? 'border-orange-500/50 bg-orange-500/10 text-orange-300'
                          : 'border-white/[0.05] bg-white/[0.04] text-zinc-300 hover:border-orange-500/40'
                      )}
                    >
                      <span className="w-full truncate text-[11px] font-semibold uppercase tracking-wide">
                        {day}
                      </span>
                      <span className="text-sm font-semibold">{time}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </DrawerBody>

        <DrawerFooter>
          <NeonButton
            className="w-full"
            disabled={!activeSlot || isPending || slots.length === 0}
            onClick={() => {
              void confirm();
            }}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
              {isPending ? t('booking.reserving') : t('booking.confirm')}
            </span>
          </NeonButton>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
