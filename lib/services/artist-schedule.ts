import { prisma } from '@/lib/prisma';
import {
  createDefaultWorkingHours,
  normalizeWorkingHours,
  validateWorkingHours,
  type WorkingHoursSchedule,
} from '@/lib/working-hours';

export class ArtistScheduleError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ArtistScheduleError';
  }
}

export type TatuadorActor = {
  id: string;
  role: string;
  deleted_at: Date | null;
};

export async function loadTatuadorActor(clerkId: string): Promise<TatuadorActor | null> {
  return prisma.perfil.findUnique({
    where: { clerk_id: clerkId },
    select: { id: true, role: true, deleted_at: true },
  });
}

export function assertTatuador(actor: TatuadorActor | null): TatuadorActor {
  if (!actor || actor.deleted_at) {
    throw new ArtistScheduleError(404, 'Perfil não encontrado.');
  }
  if (actor.role !== 'tatuador') {
    throw new ArtistScheduleError(
      403,
      'Apenas tatuadores podem acessar ou alterar o expediente.'
    );
  }
  return actor;
}

export function sanitizeScheduleInput(raw: unknown): WorkingHoursSchedule {
  const schedule = normalizeWorkingHours(raw);
  const issues = validateWorkingHours(schedule);
  if (issues.length > 0) {
    throw new ArtistScheduleError(400, issues[0]?.message || 'Expediente inválido.');
  }
  return schedule;
}

export async function getArtistSchedule(tatuadorId: string): Promise<{
  schedule: WorkingHoursSchedule;
  persisted: boolean;
  updatedAt: string;
}> {
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

export async function saveArtistSchedule(
  tatuadorId: string,
  raw: unknown
): Promise<{
  schedule: WorkingHoursSchedule;
  persisted: boolean;
  updatedAt: string;
}> {
  const schedule = sanitizeScheduleInput(raw);
  schedule.updatedAt = new Date().toISOString();

  const row = await prisma.artistSchedule.upsert({
    where: { tatuadorId },
    create: {
      tatuadorId,
      scheduleJson: schedule,
    },
    update: {
      scheduleJson: schedule,
    },
    select: { scheduleJson: true, updatedAt: true },
  });

  const persisted = normalizeWorkingHours(row.scheduleJson);
  persisted.updatedAt = row.updatedAt.toISOString();
  return {
    schedule: persisted,
    persisted: true,
    updatedAt: persisted.updatedAt,
  };
}
