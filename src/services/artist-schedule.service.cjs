const { Prisma } = require("@prisma/client");
const { prisma } = require("./prisma.service.cjs");
const {
  WEEKDAY_IDS,
  createDefaultWorkingHours,
  normalizeWorkingHours,
  getZonedClock,
  fallbackTimezone,
} = require("../utils/working-hours.cjs");

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function assertTatuadorRole(user, perfil) {
  if (!user?.id) {
    throw httpError(401, "Não autenticado.");
  }
  if (user.role !== "tatuador" && perfil?.role !== "tatuador") {
    throw httpError(403, "Apenas tatuadores podem acessar ou alterar o expediente.");
  }
  return user.id;
}

async function getSchedule(tatuadorId) {
  const row = await prisma.artistSchedule.findUnique({
    where: { tatuadorId },
    select: { scheduleJson: true, updatedAt: true },
  });
  if (!row) {
    const schedule = createDefaultWorkingHours();
    return {
      schedule,
      persisted: false,
      updatedAt: schedule.updatedAt,
    };
  }
  const schedule = normalizeWorkingHours(row.scheduleJson);
  schedule.updatedAt = row.updatedAt.toISOString();
  return {
    schedule,
    persisted: true,
    updatedAt: schedule.updatedAt,
  };
}

const WEEKDAY_BY_INDEX = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const INDEX_BY_WEEKDAY = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const ISSUE_MESSAGES = {
  "hours.invalidOpenClose": "Horário de abertura/fechamento inválido.",
  "hours.closeAfterOpen": "O horário de fechamento deve ser posterior à abertura.",
  "hours.breakInvalid": "Intervalo de pausa inválido.",
  "hours.breakEndAfterStart": "O fim da pausa deve ser posterior ao início.",
  "hours.breakInside": "A pausa deve estar contida dentro do expediente.",
  "hours.breaksOverlap": "As pausas não podem se sobrepor.",
};

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validateWorkingHours(schedule) {
  const issues = [];
  for (const day of schedule.days || []) {
    if (!day.active) continue;
    if (!isValidTime(day.start) || !isValidTime(day.end)) {
      issues.push({ day: day.day, code: "hours.invalidOpenClose" });
      continue;
    }
    if (timeToMinutes(day.end) <= timeToMinutes(day.start)) {
      issues.push({ day: day.day, code: "hours.closeAfterOpen" });
    }
  }
  return issues;
}

function buildScheduleFromWeeklyInput(input) {
  const timezone =
    typeof input.timezone === "string" && input.timezone.trim()
      ? input.timezone.trim()
      : fallbackTimezone();
  const provided = new Map();
  for (const day of input.days || []) {
    const weekday = WEEKDAY_BY_INDEX[Number(day && day.dayOfWeek)];
    if (!weekday) throw httpError(400, `dayOfWeek inválido: ${String(day && day.dayOfWeek)}`);
    provided.set(weekday, day);
  }
  const days = WEEKDAY_IDS.map((weekday) => {
    const day = provided.get(weekday);
    const isClosed = day ? day.isClosed ?? true : true;
    const rawBreaks = day && Array.isArray(day.breaks) ? day.breaks : [];
    return {
      day: weekday,
      active: !isClosed,
      start: typeof day?.startTime === "string" && day.startTime ? day.startTime : "09:00",
      end: typeof day?.endTime === "string" && day.endTime ? day.endTime : "18:00",
      breaks: rawBreaks.map((interval, index) => ({
        id: `break-${weekday}-${index}`,
        start: String((interval && interval.startTime) || "12:00"),
        end: String((interval && interval.endTime) || "13:00"),
      })),
    };
  });
  return normalizeWorkingHours({
    schemaVersion: 1,
    timezone,
    days,
    updatedAt: new Date().toISOString(),
  });
}

async function updateWeeklySchedule(tatuadorId, data) {
  if (!Array.isArray(data && data.days)) {
    throw httpError(400, "Informe os dias do expediente.");
  }
  const schedule = buildScheduleFromWeeklyInput({
    days: data.days,
    timezone: typeof data.timezone === "string" ? data.timezone : undefined,
  });
  const issues = validateWorkingHours(schedule);
  if (issues.length > 0) {
    throw httpError(400, ISSUE_MESSAGES[issues[0].code] || "Expediente inválido.");
  }
  const updatedAt = new Date().toISOString();
  schedule.updatedAt = updatedAt;
  await upsertSchedule(tatuadorId, schedule);
  return {
    artistId: tatuadorId,
    timezone: schedule.timezone,
    activeDays: schedule.days.filter((day) => day.active).length,
    persisted: true,
    updatedAt,
  };
}

async function getArtistAvailability(artistId, dateRaw) {
  const id = String(artistId || "").trim();
  if (!id) throw httpError(400, "artistId é obrigatório.");
  const when = new Date(dateRaw);
  if (Number.isNaN(when.getTime())) throw httpError(400, "Data inválida.");
  const { schedule, persisted, updatedAt } = await getSchedule(id);
  const timezone = schedule.timezone || fallbackTimezone();
  const { weekday } = getZonedClock(when, timezone);
  const day = schedule.days.find((entry) => entry.day === weekday);
  const isClosed = !day || !day.active;
  return {
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
  };
}

async function upsertSchedule(tatuadorId, raw) {
  if (raw === undefined || raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw httpError(400, "Informe o expediente em schedule.");
  }

  // A agenda é uma tabela de disponibilidade: escrita concorrente (express x
  // server action) precisa ser serializada por profissional via advisory lock
  // transacional, para que a criação de agendamentos nunca leia um expediente
  // parcialmente substituído.
  const row = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${`schedule:${tatuadorId}`}::text))
      `;
      return tx.artistSchedule.upsert({
        where: { tatuadorId },
        create: { tatuadorId, scheduleJson: raw },
        update: { scheduleJson: raw },
        select: { scheduleJson: true, updatedAt: true },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 15000,
    }
  );

  return {
    schedule: row.scheduleJson,
    persisted: true,
    updatedAt: row.updatedAt,
  };
}

module.exports = {
  assertTatuadorRole,
  getSchedule,
  upsertSchedule,
  updateWeeklySchedule,
  getArtistAvailability,
};
