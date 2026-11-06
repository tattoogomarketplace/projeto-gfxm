'use server';

import { fetchExpressApi, resolveExpressAuthHeaders } from '@/lib/server/express-bff';
import type { WeekdayId, WorkingHoursSchedule } from '@/lib/working-hours';

export type ScheduleActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ScheduleBreakInput = {
  startTime: string;
  endTime: string;
};

export type ScheduleDayInput = {
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

export type WeeklyScheduleResult = {
  schedule: WorkingHoursSchedule;
  persisted: boolean;
  updatedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readError(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;
  if (typeof payload.error === 'string' && payload.error) return payload.error;
  if (typeof payload.erro === 'string' && payload.erro) return payload.erro;
  return fallback;
}

async function callScheduleApi(pathname: string, init?: RequestInit) {
  const authHeaders = await resolveExpressAuthHeaders();
  return fetchExpressApi(pathname, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}

function toActionResult<T>(
  status: number,
  payload: unknown,
  fallback: string
): ScheduleActionResult<T> {
  if (status === 401) return { success: false, error: 'Não autenticado.' };
  if (isRecord(payload) && payload.success === true && 'data' in payload) {
    return { success: true, data: payload.data as T };
  }
  return { success: false, error: readError(payload, fallback) };
}

export async function updateWeeklySchedule(
  data: WeeklyScheduleInput
): Promise<ScheduleActionResult<UpdateWeeklyScheduleResult>> {
  if (!Array.isArray(data?.days)) {
    return { success: false, error: 'Informe os dias do expediente.' };
  }

  try {
    const { status, payload } = await callScheduleApi('/api/tatuador/schedule/weekly', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return toActionResult<UpdateWeeklyScheduleResult>(
      status,
      payload,
      'Falha inesperada ao processar o expediente.'
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error && error.message
        ? error.message
        : 'Falha inesperada ao processar o expediente.',
    };
  }
}

export async function getWeeklySchedule(): Promise<ScheduleActionResult<WeeklyScheduleResult>> {
  try {
    const { status, payload } = await callScheduleApi('/api/tatuador/schedule/weekly');
    return toActionResult<WeeklyScheduleResult>(
      status,
      payload,
      'Falha inesperada ao processar o expediente.'
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error && error.message
        ? error.message
        : 'Falha inesperada ao processar o expediente.',
    };
  }
}

export async function getArtistAvailability(
  artistId: string,
  date: string | Date
): Promise<ScheduleActionResult<ArtistAvailability>> {
  const id = String(artistId ?? '').trim();
  if (!id) return { success: false, error: 'artistId é obrigatório.' };

  const when = new Date(date);
  if (Number.isNaN(when.getTime())) return { success: false, error: 'Data inválida.' };

  try {
    const params = new URLSearchParams({
      artistId: id,
      date: when.toISOString(),
    });
    const { status, payload } = await callScheduleApi(
      `/api/tatuador/schedule/availability?${params.toString()}`
    );
    return toActionResult<ArtistAvailability>(
      status,
      payload,
      'Falha inesperada ao processar o expediente.'
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error && error.message
        ? error.message
        : 'Falha inesperada ao processar o expediente.',
    };
  }
}
