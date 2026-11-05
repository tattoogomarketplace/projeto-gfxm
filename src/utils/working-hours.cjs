const WEEKDAY_IDS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function fallbackTimezone() {
  return "America/Sao_Paulo";
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function isValidTime(value) {
  return TIME_PATTERN.test(value);
}

function readPart(parts, type) {
  const found = parts.find((part) => part.type === type);
  return found ? found.value : "";
}

function getZonedClock(date, timezone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || fallbackTimezone(),
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const weekdayRaw = readPart(parts, "weekday").toLowerCase();
    const weekday = WEEKDAY_IDS.includes(weekdayRaw) ? weekdayRaw : WEEKDAY_IDS[0];
    const hours = Number(readPart(parts, "hour"));
    const minutes = Number(readPart(parts, "minute"));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return { weekday, minutes: 0 };
    }
    return { weekday, minutes: hours * 60 + minutes };
  } catch {
    return { weekday: WEEKDAY_IDS[0], minutes: 0 };
  }
}

const WEEKDAY_SET = new Set(WEEKDAY_IDS);
const MAX_BREAKS_PER_DAY = 3;
const SCHEMA_VERSION = 1;

function normalizeTime(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (TIME_PATTERN.test(trimmed)) return trimmed;
  const hhmm = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!hhmm) return fallback;
  const hours = Number(hhmm[1]);
  const minutes = Number(hhmm[2]);
  if (hours > 23 || minutes > 59) return fallback;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeBreak(raw, index) {
  const record = isRecord(raw) ? raw : {};
  return {
    id: typeof record.id === "string" && record.id.length > 0 ? record.id : `break-${index}`,
    start: normalizeTime(record.start, "12:00"),
    end: normalizeTime(record.end, "13:00"),
  };
}

function defaultDay(day) {
  const weekend = day === "saturday" || day === "sunday";
  return {
    day,
    active: day !== "sunday",
    start: weekend ? "10:00" : "09:00",
    end: day === "saturday" ? "14:00" : "18:00",
    breaks: day === "sunday" || day === "saturday" ? [] : [{ id: `break-${day}`, start: "12:00", end: "13:00" }],
  };
}

function createDefaultWorkingHours() {
  return {
    schemaVersion: SCHEMA_VERSION,
    timezone: fallbackTimezone(),
    days: WEEKDAY_IDS.map((day) => defaultDay(day)),
    updatedAt: new Date(0).toISOString(),
  };
}

function normalizeWorkingHours(raw) {
  const record = isRecord(raw) ? raw : {};
  const rawDays = Array.isArray(record.days) ? record.days : [];
  const byDay = new Map();

  for (const item of rawDays) {
    if (!isRecord(item)) continue;
    if (WEEKDAY_SET.has(item.day)) {
      byDay.set(item.day, item);
    }
  }

  const days = WEEKDAY_IDS.map((day) => {
    const fallback = defaultDay(day);
    const item = byDay.get(day);
    if (!isRecord(item)) return fallback;
    const breaksRaw = Array.isArray(item.breaks) ? item.breaks : [];
    return {
      day,
      active: typeof item.active === "boolean" ? item.active : fallback.active,
      start: normalizeTime(item.start, fallback.start),
      end: normalizeTime(item.end, fallback.end),
      breaks: breaksRaw.slice(0, MAX_BREAKS_PER_DAY).map((interval, index) => normalizeBreak(interval, index)),
    };
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    timezone: typeof record.timezone === "string" && record.timezone.length > 0 ? record.timezone : fallbackTimezone(),
    days,
    updatedAt:
      typeof record.updatedAt === "string" && record.updatedAt.length > 0
        ? record.updatedAt
        : createDefaultWorkingHours().updatedAt,
  };
}

function listUpcomingSlots(schedule, options) {
  const from =
    options && options.from instanceof Date && !Number.isNaN(options.from.getTime())
      ? options.from
      : new Date();
  const days = options && options.days > 0 ? options.days : 14;
  const interval = options && options.intervalMinutes > 0 ? options.intervalMinutes : 60;
  const limit = options && options.limit > 0 ? options.limit : 12;
  const now = Date.now();
  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(0);
  cursor.setHours(cursor.getHours() + 1);

  const horizon = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  const slots = [];

  while (cursor.getTime() < horizon.getTime() && slots.length < limit) {
    if (cursor.getTime() > now && isDateWithinWorkingHours(schedule, cursor)) {
      slots.push(cursor.toISOString());
    }
    cursor.setMinutes(cursor.getMinutes() + interval);
  }

  return slots;
}

function isDateWithinWorkingHours(schedule, date) {
  if (!isRecord(schedule) || !(date instanceof Date) || Number.isNaN(date.getTime())) {
    return false;
  }
  const days = Array.isArray(schedule.days) ? schedule.days : [];
  const tz = typeof schedule.timezone === "string" && schedule.timezone
    ? schedule.timezone
    : fallbackTimezone();
  const { weekday, minutes } = getZonedClock(date, tz);
  const day = days.find((item) => isRecord(item) && item.day === weekday);
  if (!day || day.active !== true) return false;
  if (!isValidTime(day.start) || !isValidTime(day.end)) return false;

  const open = timeToMinutes(day.start);
  const close = timeToMinutes(day.end);
  if (minutes < open || minutes >= close) return false;

  const breaks = Array.isArray(day.breaks) ? day.breaks : [];
  for (const interval of breaks) {
    if (!isRecord(interval)) continue;
    if (!isValidTime(interval.start) || !isValidTime(interval.end)) continue;
    const breakStart = timeToMinutes(interval.start);
    const breakEnd = timeToMinutes(interval.end);
    if (minutes >= breakStart && minutes < breakEnd) return false;
  }

  return true;
}

module.exports = {
  isDateWithinWorkingHours,
  createDefaultWorkingHours,
  normalizeWorkingHours,
  listUpcomingSlots,
};
