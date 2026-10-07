import type { ChatLifecycleStatus } from '@/lib/types/chat';

export type LifecycleBooking = {
  data_hora: Date;
  status: string;
};

export const HEALING_WINDOW_DAYS = 21;

const DAY_MS = 24 * 60 * 60 * 1000;

const SCHEDULED_STATUSES = new Set(['confirmado', 'aguardando_sinal']);

function startOfToday(now: Date): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

export function resolveChatLifecycle(
  now: Date,
  bookings: LifecycleBooking[]
): ChatLifecycleStatus | null {
  if (bookings.length === 0) return null;

  const todayStart = startOfToday(now);

  const upcoming = bookings
    .filter(
      (item) =>
        SCHEDULED_STATUSES.has(item.status) && item.data_hora.getTime() >= todayStart
    )
    .sort((a, b) => a.data_hora.getTime() - b.data_hora.getTime());

  if (upcoming.length > 0) {
    return {
      kind: 'scheduled',
      label: 'Sessão agendada',
      healingDay: null,
    };
  }

  const healing = bookings
    .filter((item) => item.status === 'concluido')
    .sort((a, b) => b.data_hora.getTime() - a.data_hora.getTime());

  for (const item of healing) {
    const elapsedDays = Math.floor((now.getTime() - item.data_hora.getTime()) / DAY_MS);
    const healingDay = elapsedDays + 1;
    if (healingDay >= 1 && healingDay <= HEALING_WINDOW_DAYS) {
      return {
        kind: 'healing',
        label: `Cicatrização - Dia ${healingDay}`,
        healingDay,
      };
    }
  }

  return null;
}
