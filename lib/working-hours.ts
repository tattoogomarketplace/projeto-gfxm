export const WORKING_HOURS_STORAGE_KEY = 'tattoogo-working-hours';
export const WORKING_HOURS_SCHEMA_VERSION = 1 as const;

export const WEEKDAY_IDS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type WeekdayId = (typeof WEEKDAY_IDS)[number];

export type BreakInterval = {
  id: string;
  start: string;
  end: string;
};

export type DaySchedule = {
  day: WeekdayId;
  active: boolean;
  start: string;
  end: string;
  breaks: BreakInterval[];
};

export type WorkingHoursSchedule = {
  schemaVersion: typeof WORKING_HOURS_SCHEMA_VERSION;
  timezone: string;
  days: DaySchedule[];
  updatedAt: string;
};

export type WorkingHoursIssue = {
  day: WeekdayId;
  message: string;
};

export const WEEKDAY_LABELS: Record<WeekdayId, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_BREAKS_PER_DAY = 3;

const listeners = new Set<() => void>();
let cachedSchedule: WorkingHoursSchedule | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function fallbackTimezone(): string {
  return 'America/Sao_Paulo';
}

export function resolveTimezone(): string {
  if (typeof Intl === 'undefined') return fallbackTimezone();
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallbackTimezone();
  } catch {
    return fallbackTimezone();
  }
}

function createBreakId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `break-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTime(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (TIME_PATTERN.test(trimmed)) return trimmed;
  const hhmm = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!hhmm) return fallback;
  const hours = Number(hhmm[1]);
  const minutes = Number(hhmm[2]);
  if (hours > 23 || minutes > 59) return fallback;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function normalizeBreak(raw: unknown, index: number): BreakInterval {
  const record = isRecord(raw) ? raw : {};
  return {
    id: typeof record.id === 'string' && record.id.length > 0 ? record.id : `break-${index}`,
    start: normalizeTime(record.start, '12:00'),
    end: normalizeTime(record.end, '13:00'),
  };
}

function defaultDay(day: WeekdayId): DaySchedule {
  const weekend = day === 'saturday' || day === 'sunday';
  return {
    day,
    active: day !== 'sunday',
    start: weekend ? '10:00' : '09:00',
    end: day === 'saturday' ? '14:00' : '18:00',
    breaks: day === 'sunday' || day === 'saturday' ? [] : [{ id: `break-${day}`, start: '12:00', end: '13:00' }],
  };
}

export function createDefaultWorkingHours(): WorkingHoursSchedule {
  return {
    schemaVersion: WORKING_HOURS_SCHEMA_VERSION,
    timezone: fallbackTimezone(),
    days: WEEKDAY_IDS.map((day) => defaultDay(day)),
    updatedAt: new Date(0).toISOString(),
  };
}

export const DEFAULT_WORKING_HOURS: WorkingHoursSchedule = createDefaultWorkingHours();

export function cloneWorkingHours(schedule: WorkingHoursSchedule): WorkingHoursSchedule {
  return {
    schemaVersion: WORKING_HOURS_SCHEMA_VERSION,
    timezone: schedule.timezone,
    updatedAt: schedule.updatedAt,
    days: schedule.days.map((day) => ({
      day: day.day,
      active: day.active,
      start: day.start,
      end: day.end,
      breaks: day.breaks.map((interval) => ({ ...interval })),
    })),
  };
}

export function normalizeWorkingHours(raw: unknown): WorkingHoursSchedule {
  const record = isRecord(raw) ? raw : {};
  const rawDays = Array.isArray(record.days) ? record.days : [];
  const byDay = new Map<WeekdayId, unknown>();

  for (const item of rawDays) {
    if (!isRecord(item)) continue;
    if (WEEKDAY_IDS.includes(item.day as WeekdayId)) {
      byDay.set(item.day as WeekdayId, item);
    }
  }

  const days = WEEKDAY_IDS.map((day) => {
    const fallback = defaultDay(day);
    const item = byDay.get(day);
    if (!isRecord(item)) return fallback;
    const breaksRaw = Array.isArray(item.breaks) ? item.breaks : [];
    return {
      day,
      active: typeof item.active === 'boolean' ? item.active : fallback.active,
      start: normalizeTime(item.start, fallback.start),
      end: normalizeTime(item.end, fallback.end),
      breaks: breaksRaw.slice(0, MAX_BREAKS_PER_DAY).map((interval, index) => normalizeBreak(interval, index)),
    };
  });

  return {
    schemaVersion: WORKING_HOURS_SCHEMA_VERSION,
    timezone: typeof record.timezone === 'string' && record.timezone.length > 0 ? record.timezone : fallbackTimezone(),
    days,
    updatedAt: typeof record.updatedAt === 'string' && record.updatedAt.length > 0 ? record.updatedAt : DEFAULT_WORKING_HOURS.updatedAt,
  };
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function validateWorkingHours(schedule: WorkingHoursSchedule): WorkingHoursIssue[] {
  const issues: WorkingHoursIssue[] = [];

  for (const day of schedule.days) {
    if (!day.active) continue;

    if (!isValidTime(day.start) || !isValidTime(day.end)) {
      issues.push({ day: day.day, message: 'Informe horários de abertura e fechamento válidos.' });
      continue;
    }

    const open = timeToMinutes(day.start);
    const close = timeToMinutes(day.end);
    if (close <= open) {
      issues.push({ day: day.day, message: 'O horário de fechamento deve ser depois da abertura.' });
      continue;
    }

    const normalizedBreaks = day.breaks.map((interval, index) => ({ interval, index }));
    for (const { interval, index } of normalizedBreaks) {
      if (!isValidTime(interval.start) || !isValidTime(interval.end)) {
        issues.push({ day: day.day, message: `Intervalo ${index + 1} possui horário inválido.` });
        continue;
      }
      const breakStart = timeToMinutes(interval.start);
      const breakEnd = timeToMinutes(interval.end);
      if (breakEnd <= breakStart) {
        issues.push({ day: day.day, message: `Intervalo ${index + 1}: o término deve ser depois do início.` });
        continue;
      }
      if (breakStart < open || breakEnd > close) {
        issues.push({ day: day.day, message: `Intervalo ${index + 1} precisa estar dentro do expediente.` });
      }
    }

    for (let i = 0; i < day.breaks.length; i += 1) {
      const current = day.breaks[i];
      if (!isValidTime(current.start) || !isValidTime(current.end)) continue;
      const aStart = timeToMinutes(current.start);
      const aEnd = timeToMinutes(current.end);
      for (let j = i + 1; j < day.breaks.length; j += 1) {
        const other = day.breaks[j];
        if (!isValidTime(other.start) || !isValidTime(other.end)) continue;
        if (rangesOverlap(aStart, aEnd, timeToMinutes(other.start), timeToMinutes(other.end))) {
          issues.push({ day: day.day, message: 'Os intervalos não podem se sobrepor.' });
        }
      }
    }
  }

  return issues;
}

export function workingHoursEqual(a: WorkingHoursSchedule, b: WorkingHoursSchedule): boolean {
  if (a.timezone !== b.timezone || a.days.length !== b.days.length) return false;
  return a.days.every((day, index) => {
    const other = b.days[index];
    if (!other) return false;
    if (day.day !== other.day || day.active !== other.active || day.start !== other.start || day.end !== other.end) {
      return false;
    }
    if (day.breaks.length !== other.breaks.length) return false;
    return day.breaks.every((interval, breakIndex) => {
      const otherBreak = other.breaks[breakIndex];
      return Boolean(otherBreak) && interval.start === otherBreak.start && interval.end === otherBreak.end;
    });
  });
}

function readFromStorage(): WorkingHoursSchedule {
  if (typeof window === 'undefined') return cloneWorkingHours(DEFAULT_WORKING_HOURS);
  try {
    const raw = window.localStorage.getItem(WORKING_HOURS_STORAGE_KEY);
    if (!raw) return cloneWorkingHours(DEFAULT_WORKING_HOURS);
    return normalizeWorkingHours(JSON.parse(raw));
  } catch {
    return cloneWorkingHours(DEFAULT_WORKING_HOURS);
  }
}

function writeToStorage(schedule: WorkingHoursSchedule) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WORKING_HOURS_STORAGE_KEY, JSON.stringify(schedule));
  } catch {
    // Storage can be unavailable (private mode); in-memory state still applies.
  }
}

export function getWorkingHours(): WorkingHoursSchedule {
  if (!cachedSchedule) {
    cachedSchedule = readFromStorage();
  }
  return cachedSchedule;
}

export function subscribeWorkingHours(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getWorkingHoursSnapshot(): WorkingHoursSchedule {
  const next = readFromStorage();
  if (cachedSchedule && workingHoursEqual(cachedSchedule, next) && cachedSchedule.updatedAt === next.updatedAt) {
    return cachedSchedule;
  }
  cachedSchedule = next;
  return cachedSchedule;
}

export function getWorkingHoursServerSnapshot(): WorkingHoursSchedule {
  return DEFAULT_WORKING_HOURS;
}

export function saveWorkingHours(draft: WorkingHoursSchedule): WorkingHoursSchedule {
  const next = cloneWorkingHours(draft);
  next.schemaVersion = WORKING_HOURS_SCHEMA_VERSION;
  next.timezone = draft.timezone || resolveTimezone();
  next.updatedAt = new Date().toISOString();
  cachedSchedule = next;
  writeToStorage(next);
  listeners.forEach((listener) => listener());
  return next;
}

export function createBreakInterval(start = '12:00', end = '13:00'): BreakInterval {
  return { id: createBreakId(), start, end };
}

export function canAddBreak(day: DaySchedule): boolean {
  return day.breaks.length < MAX_BREAKS_PER_DAY;
}

export function updateDaySchedule(
  schedule: WorkingHoursSchedule,
  dayId: WeekdayId,
  patch: Partial<Omit<DaySchedule, 'day'>>
): WorkingHoursSchedule {
  const next = cloneWorkingHours(schedule);
  next.days = next.days.map((day) => (day.day === dayId ? { ...day, ...patch } : day));
  return next;
}

export function toWorkingHoursPayload(schedule: WorkingHoursSchedule): WorkingHoursSchedule {
  return cloneWorkingHours(schedule);
}

export function hydrateWorkingHours(schedule: WorkingHoursSchedule): WorkingHoursSchedule {
  const next = cloneWorkingHours(schedule);
  next.schemaVersion = WORKING_HOURS_SCHEMA_VERSION;
  cachedSchedule = next;
  writeToStorage(next);
  listeners.forEach((listener) => listener());
  return next;
}

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? '';
}

export function getZonedClock(
  date: Date,
  timezone: string
): { weekday: WeekdayId; minutes: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || fallbackTimezone(),
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const weekdayRaw = readPart(parts, 'weekday').toLowerCase();
    const weekday = WEEKDAY_IDS.includes(weekdayRaw as WeekdayId)
      ? (weekdayRaw as WeekdayId)
      : WEEKDAY_IDS[0];
    const hours = Number(readPart(parts, 'hour'));
    const minutes = Number(readPart(parts, 'minute'));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return { weekday, minutes: 0 };
    }
    return { weekday, minutes: hours * 60 + minutes };
  } catch {
    return { weekday: WEEKDAY_IDS[0], minutes: 0 };
  }
}

export function isDateWithinWorkingHours(schedule: WorkingHoursSchedule, date: Date): boolean {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
  const tz = schedule.timezone || fallbackTimezone();
  const { weekday, minutes } = getZonedClock(date, tz);
  const day = schedule.days.find((item) => item.day === weekday);
  if (!day || !day.active) return false;
  if (!isValidTime(day.start) || !isValidTime(day.end)) return false;

  const open = timeToMinutes(day.start);
  const close = timeToMinutes(day.end);
  if (minutes < open || minutes >= close) return false;

  for (const interval of day.breaks) {
    if (!isValidTime(interval.start) || !isValidTime(interval.end)) continue;
    const breakStart = timeToMinutes(interval.start);
    const breakEnd = timeToMinutes(interval.end);
    if (minutes >= breakStart && minutes < breakEnd) return false;
  }

  return true;
}
