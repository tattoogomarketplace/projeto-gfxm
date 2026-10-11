'use server';

import { auth } from '@clerk/nextjs/server';

import { prisma } from '@/lib/prisma';
import {
  assertTatuador,
  getArtistSchedule,
  loadTatuadorActor,
  ArtistScheduleError,
} from '@/lib/services/artist-schedule';
import {
  getZonedClock,
  normalizeWorkingHours,
  resolveTimezone,
  validateWorkingHours,
  WEEKDAY_IDS,
  WORKING_HOURS_SCHEMA_VERSION,
  type DaySchedule,
  type WeekdayId,
  type WorkingHoursIssueCode,
  type WorkingHoursSchedule,
} from '@/lib/working-hours';

/**
 * Availability & Schedule Engine.
 *
 * Persists the professional's weekly working hours and breaks inside the
 * existing `ArtistSchedule.scheduleJson` column (single source of truth shared
 * with `booking-transaction.ts`). No new tables are introduced: the normalized
 * `{ dayOfWeek, startTime, endTime, isClosed, breaks }` payload is translated to
 * the persisted `WorkingHoursSchedule` shape.
 */

export type ScheduleActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ScheduleBreakInput = {
  startTime: string;
  endTime: string;
};

export type ScheduleDayInput = {
  /** 0 = Sunday ... 6 = Saturday (JavaScript Date.getDay convention). */
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isClosed?: boolean;
  breaks?: ScheduleBreakInput[];
};

export type WeeklyScheduleInput = {
  days: ScheduleDayInput[];
  timezone?: string;
};

export type UpdateWeeklyScheduleResult = {
  artistId: string;
  timezone: string;
  activeDays: number;
  persisted: true;
  updatedAt: string;
};

export type ArtistAvailability = {
  artistId: string;
  date: string;
  /** 0 = Sunday ... 6 = Saturday. */
  dayOfWeek: number;
  weekday: WeekdayId;
  timezone: string;
  isClosed: boolean;
  startTime: string | null;
  endTime: string | null;
  breaks: Array<{ startTime: string; endTime: string }>;
  persisted: boolean;
  updatedAt: string;
};

const WEEKDAY_BY_INDEX: readonly WeekdayId[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const INDEX_BY_WEEKDAY: Record<WeekdayId, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const DEFAULT_START = '09:00';
const DEFAULT_END = '18:00';

const ISSUE_MESSAGES: Record<WorkingHoursIssueCode, string> = {
  'hours.invalidOpenClose': 'Horário de abertura/fechamento inválido.',
  'hours.closeAfterOpen': 'O horário de fechamento deve ser posterior à abertura.',
  'hours.breakInvalid': 'Intervalo de pausa inválido.',
  'hours.breakEndAfterStart': 'O fim da pausa deve ser posterior ao início.',
  'hours.breakInside': 'A pausa deve estar contida dentro do expediente.',
  'hours.breaksOverlap': 'As pausas não podem se sobrepor.',
};

class ScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScheduleError';
  }
}

async function requireActorId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    return null;
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof ScheduleError) return error.message;
  if (error instanceof ArtistScheduleError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Falha inesperada ao processar o expediente.';
}

function buildSchedule(input: WeeklyScheduleInput): WorkingHoursSchedule {
  const timezone =
    typeof input.timezone === 'string' && input.timezone.trim()
      ? input.timezone.trim()
      : resolveTimezone();

  const provided = new Map<WeekdayId, ScheduleDayInput>();
  for (const day of input.days) {
    const weekday = WEEKDAY_BY_INDEX[Number(day?.dayOfWeek)];
    if (!weekday) {
      throw new ScheduleError(`dayOfWeek inválido: ${String(day?.dayOfWeek)}`);
    }
    provided.set(weekday, day);
  }

  const days: DaySchedule[] = WEEKDAY_IDS.map((weekday) => {
    const day = provided.get(weekday);
    const isClosed = day?.isClosed ?? true;
    const rawBreaks = Array.isArray(day?.breaks) ? day!.breaks : [];

    return {
      day: weekday,
      active: !isClosed,
      start: typeof day?.startTime === 'string' && day.startTime ? day.startTime : DEFAULT_START,
      end: typeof day?.endTime === 'string' && day.endTime ? day.endTime : DEFAULT_END,
      breaks: rawBreaks.map((interval, index) => ({
        id: `break-${weekday}-${index}`,
        start: String(interval?.startTime ?? '12:00'),
        end: String(interval?.endTime ?? '13:00'),
      })),
    };
  });

  return normalizeWorkingHours({
    schemaVersion: WORKING_HOURS_SCHEMA_VERSION,
    timezone,
    days,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Replaces the authenticated professional's entire weekly schedule.
 *
 * Verifies the active professional via Clerk `auth()`, validates the payload,
 * then wipes and re-inserts the schedule atomically inside `prisma.$transaction`.
 */
export async function updateWeeklySchedule(
  data: WeeklyScheduleInput
): Promise<ScheduleActionResult<UpdateWeeklyScheduleResult>> {
  const actorId = await requireActorId();
  if (!actorId) return { success: false, error: 'Não autenticado.' };

  try {
    const actor = assertTatuador(await loadTatuadorActor(actorId));

    if (!Array.isArray(data?.days)) {
      return { success: false, error: 'Informe os dias do expediente.' };
    }

    const schedule = buildSchedule({
      days: data.days,
      timezone: typeof data.timezone === 'string' ? data.timezone : undefined,
    });

    const issues = validateWorkingHours(schedule);
    if (issues.length > 0) {
      return { success: false, error: ISSUE_MESSAGES[issues[0].code] ?? 'Expediente inválido.' };
    }

    const updatedAt = new Date().toISOString();
    schedule.updatedAt = updatedAt;

    await prisma.$transaction(async (tx) => {
      await tx.artistSchedule.deleteMany({ where: { tatuadorId: actor.id } });
      await tx.artistSchedule.create({
        data: {
          tatuadorId: actor.id,
          scheduleJson: schedule,
        },
      });
    });

    return {
      success: true,
      data: {
        artistId: actor.id,
        timezone: schedule.timezone,
        activeDays: schedule.days.filter((day) => day.active).length,
        persisted: true,
        updatedAt,
      },
    };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export type WeeklyScheduleResult = {
  schedule: WorkingHoursSchedule;
  persisted: boolean;
  updatedAt: string;
};

/**
 * Reads the authenticated professional's entire weekly schedule, hydrating the
 * "Gestão de Horários e Expediente" editor. Falls back to the default schedule
 * (unpersisted) when the artist has never configured their expediente.
 */
export async function getWeeklySchedule(): Promise<ScheduleActionResult<WeeklyScheduleResult>> {
  const actorId = await requireActorId();
  if (!actorId) return { success: false, error: 'Não autenticado.' };

  try {
    const actor = assertTatuador(await loadTatuadorActor(actorId));
    const { schedule, persisted, updatedAt } = await getArtistSchedule(actor.id);
    return { success: true, data: { schedule, persisted, updatedAt } };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

/**
 * Reads an artist's working hours and breaks for a specific day, feeding the
 * client's booking calendar. Falls back to the default schedule (unpersisted)
 * when the artist has never configured their expediente.
 */
export async function getArtistAvailability(
  artistId: string,
  date: string | Date
): Promise<ScheduleActionResult<ArtistAvailability>> {
  const actorId = await requireActorId();
  if (!actorId) return { success: false, error: 'Não autenticado.' };

  const id = String(artistId ?? '').trim();
  if (!id) return { success: false, error: 'artistId é obrigatório.' };

  const when = new Date(date);
  if (Number.isNaN(when.getTime())) return { success: false, error: 'Data inválida.' };

  try {
    const { schedule, persisted, updatedAt } = await getArtistSchedule(id);
    const timezone = schedule.timezone || resolveTimezone();
    const { weekday } = getZonedClock(when, timezone);

    const day = schedule.days.find((entry) => entry.day === weekday);
    const isClosed = !day || !day.active;

    return {
      success: true,
      data: {
        artistId: id,
        date: when.toISOString(),
        dayOfWeek: INDEX_BY_WEEKDAY[weekday],
        weekday,
        timezone,
        isClosed,
        startTime: isClosed || !day ? null : day.start,
        endTime: isClosed || !day ? null : day.end,
        breaks:
          isClosed || !day
            ? []
            : day.breaks.map((interval) => ({ startTime: interval.start, endTime: interval.end })),
        persisted,
        updatedAt,
      },
    };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
