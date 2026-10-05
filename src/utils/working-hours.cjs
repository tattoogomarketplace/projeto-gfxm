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
};
