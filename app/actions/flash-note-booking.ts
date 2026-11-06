'use server';

import { revalidatePath } from 'next/cache';
import { fetchExpressApi, resolveExpressAuthHeaders } from '@/lib/server/express-bff';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BookFlashNoteCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'SELF'
  | 'NOT_FOUND'
  | 'CONSUMED'
  | 'INVALID_PRICE'
  | 'NO_SLOT'
  | 'CONFLICT';

export type BookFlashNoteResult =
  | {
      success: true;
      data: {
        bookingId: string;
        quoteId: string;
        artistId: string;
        totalAmount: number;
        depositAmount: number;
        slot: string;
        alreadyProcessed: boolean;
      };
    }
  | { success: false; error: string; code: BookFlashNoteCode };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asCode(value: unknown): BookFlashNoteCode {
  if (
    value === 'UNAUTHENTICATED' ||
    value === 'FORBIDDEN' ||
    value === 'SELF' ||
    value === 'NOT_FOUND' ||
    value === 'CONSUMED' ||
    value === 'INVALID_PRICE' ||
    value === 'NO_SLOT' ||
    value === 'CONFLICT'
  ) {
    return value;
  }
  return 'CONFLICT';
}

function readError(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;
  if (typeof payload.error === 'string' && payload.error) return payload.error;
  if (typeof payload.erro === 'string' && payload.erro) return payload.erro;
  return fallback;
}

function toFailure(
  status: number,
  payload: unknown,
  fallback: string
): BookFlashNoteResult {
  if (status === 401) {
    return { success: false, error: 'Nao autenticado.', code: 'UNAUTHENTICATED' };
  }
  return {
    success: false,
    error: readError(payload, fallback),
    code: isRecord(payload) ? asCode(payload.code) : 'CONFLICT',
  };
}

export async function bookFlashNote(noteId: string): Promise<BookFlashNoteResult> {
  const parsedId = String(noteId ?? '').trim();
  if (!UUID_RE.test(parsedId)) {
    return { success: false, error: 'Flash Note invalida.', code: 'NOT_FOUND' };
  }

  try {
    const authHeaders = await resolveExpressAuthHeaders();
    const { status, payload } = await fetchExpressApi(
      `/api/flash-notes/${encodeURIComponent(parsedId)}/book`,
      {
        method: 'POST',
        headers: authHeaders,
      }
    );

    if (status === 401 || !isRecord(payload) || payload.success !== true) {
      return toFailure(status, payload, 'Falha ao garantir a oferta.');
    }

    if (!isRecord(payload.data)) {
      return { success: false, error: 'Falha ao garantir a oferta.', code: 'CONFLICT' };
    }

    const data = payload.data;
    const bookingId = typeof data.bookingId === 'string' ? data.bookingId : '';
    const quoteId = typeof data.quoteId === 'string' ? data.quoteId : '';
    const artistId = typeof data.artistId === 'string' ? data.artistId : '';
    const totalAmount = typeof data.totalAmount === 'number' ? data.totalAmount : Number.NaN;
    const depositAmount =
      typeof data.depositAmount === 'number' ? data.depositAmount : Number.NaN;
    const slot = typeof data.slot === 'string' ? data.slot : '';

    if (!bookingId || !quoteId || !artistId || !slot || !Number.isFinite(totalAmount) || !Number.isFinite(depositAmount)) {
      return { success: false, error: 'Falha ao garantir a oferta.', code: 'CONFLICT' };
    }

    revalidatePath('/dashboard', 'layout');
    revalidatePath('/dashboard/cliente');
    revalidatePath('/dashboard/agenda');
    revalidatePath('/dashboard/pagamentos');
    revalidatePath('/dashboard/chat');
    revalidatePath('/dashboard/tatuador');

    return {
      success: true,
      data: {
        bookingId,
        quoteId,
        artistId,
        totalAmount,
        depositAmount,
        slot,
        alreadyProcessed: data.alreadyProcessed === true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 'CONFLICT',
    };
  }
}
