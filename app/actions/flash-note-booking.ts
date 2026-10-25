'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { resolveFlashNoteSalePrice } from '@/lib/flash-note-offer';
import { getRedis } from '@/lib/redis';
import { ChatError, parseChatId, resolveChatActor } from '@/lib/services/chat';
import { depositAmount } from '@/lib/utils/agenda-status';
import { listUpcomingSlots, normalizeWorkingHours } from '@/lib/working-hours';

const MUTEX_MINUTES = 10;
const MUTEX_TTL_SECONDS = MUTEX_MINUTES * 60;
const MAX_SERIALIZATION_RETRIES = 3;
const ACTIVE_BOOKING_STATUSES = ['aguardando_sinal', 'confirmado'] as const;

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

class FlashNoteBookingError extends Error {
  code: BookFlashNoteCode;

  constructor(code: BookFlashNoteCode, message: string) {
    super(message);
    this.name = 'FlashNoteBookingError';
    this.code = code;
  }
}

function extraLabel(noteId: string): string {
  return `Flash Note ${noteId}`;
}

function formatPriceRange(total: number): string {
  return `R$ ${total.toFixed(2)}`;
}

function normalizeSlot(value: Date): Date {
  const slot = new Date(value);
  slot.setSeconds(0, 0);
  return slot;
}

function fallbackSlot(): Date {
  const slot = new Date(Date.now() + 24 * 60 * 60 * 1000);
  slot.setMinutes(0, 0, 0);
  slot.setHours(slot.getHours() + 1);
  return slot;
}

function isPrismaKnown(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

function toResult(error: unknown): BookFlashNoteResult {
  if (error instanceof FlashNoteBookingError) {
    return { success: false, error: error.message, code: error.code };
  }
  if (error instanceof ChatError) {
    const code: BookFlashNoteCode =
      error.status === 401 ? 'UNAUTHENTICATED' : error.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND';
    return { success: false, error: error.message, code };
  }
  if (isPrismaKnown(error) && (error.code === 'P2002' || error.code === 'P2034' || error.code === 'P2028')) {
    return {
      success: false,
      error: 'Esta oferta ja foi garantida por outro cliente.',
      code: 'CONFLICT',
    };
  }
  return {
    success: false,
    error: 'Nao foi possivel garantir este horario.',
    code: 'CONFLICT',
  };
}

async function acquireNoteLock(noteId: string): Promise<'busy' | string | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const acquired = await redis.set(`mutex:flash-note:${noteId}`, token, {
      nx: true,
      ex: MUTEX_TTL_SECONDS,
    });
    if (acquired === 'OK') return token;
    return 'busy';
  } catch {
    return null;
  }
}

async function releaseNoteLock(noteId: string, token: string | null): Promise<void> {
  if (!token) return;
  const redis = getRedis();
  if (!redis) return;
  try {
    const key = `mutex:flash-note:${noteId}`;
    const current = await redis.get<string>(key);
    if (current === token) await redis.del(key);
  } catch {
    return;
  }
}

async function pickArtistSlot(
  tx: Prisma.TransactionClient,
  artistId: string
): Promise<Date> {
  const scheduleRow = await tx.artistSchedule.findUnique({
    where: { tatuadorId: artistId },
    select: { scheduleJson: true },
  });

  const candidates = scheduleRow?.scheduleJson
    ? listUpcomingSlots(normalizeWorkingHours(scheduleRow.scheduleJson), {
        days: 14,
        intervalMinutes: 60,
        limit: 24,
      }).map((iso) => normalizeSlot(new Date(iso)))
    : [];

  for (const slot of candidates) {
    const taken = await tx.agendamento.findFirst({
      where: {
        tatuador_id: artistId,
        data_hora: slot,
        deleted_at: null,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
      },
      select: { id: true },
    });
    if (!taken) return slot;
  }

  const fallback = fallbackSlot();
  const takenFallback = await tx.agendamento.findFirst({
    where: {
      tatuador_id: artistId,
      data_hora: fallback,
      deleted_at: null,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
    },
    select: { id: true },
  });
  if (takenFallback) {
    throw new FlashNoteBookingError('NO_SLOT', 'Nenhum horario disponivel para esta oferta.');
  }
  return fallback;
}

async function bookFlashNoteOnce(noteId: string, clerkUserId: string): Promise<BookFlashNoteResult> {
  const actor = await resolveChatActor(clerkUserId);
  if (actor.role !== 'cliente') {
    throw new FlashNoteBookingError('FORBIDDEN', 'Apenas clientes podem garantir este horario.');
  }
  if (actor.deleted_at) {
    throw new FlashNoteBookingError('FORBIDDEN', 'Perfil indisponivel.');
  }

  const priced = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${noteId}::text))
      `;

      const noteRows = await tx.$queryRaw<
        Array<{
          id: string;
          user_id: string;
          content: string;
          ativa: boolean;
          expires_at: Date;
        }>
      >`
        SELECT id, user_id, content, ativa, expires_at
        FROM flash_notes
        WHERE id = ${noteId}::uuid
        FOR UPDATE
      `;
      const note = noteRows[0];
      if (!note) {
        throw new FlashNoteBookingError('NOT_FOUND', 'Flash Note nao encontrada.');
      }

      const client = await tx.perfil.findFirst({
        where: { id: actor.id, deleted_at: null, statusConta: 'ATIVO' },
        select: { id: true },
      });
      if (!client) {
        throw new FlashNoteBookingError('FORBIDDEN', 'Perfil indisponivel.');
      }

      const existing = await tx.agendamentoExtra.findFirst({
        where: {
          descricao: extraLabel(note.id),
          deleted_at: null,
          agendamento: {
            cliente_id: client.id,
            deleted_at: null,
            status: { in: [...ACTIVE_BOOKING_STATUSES] },
          },
        },
        select: {
          agendamento: {
            select: {
              id: true,
              tatuador_id: true,
              data_hora: true,
              valor_total: true,
              valor_sinal: true,
            },
          },
        },
      });
      if (existing?.agendamento) {
        const booking = existing.agendamento;
        return {
          alreadyProcessed: true as const,
          bookingId: booking.id,
          artistId: booking.tatuador_id,
          slot: booking.data_hora,
          totalAmount: Number(booking.valor_total),
          depositValue: Number(booking.valor_sinal),
          quoteId: booking.id,
        };
      }

      const now = new Date();
      if (!note.ativa || note.expires_at.getTime() <= now.getTime()) {
        throw new FlashNoteBookingError('CONSUMED', 'Esta Flash Note ja foi garantida ou expirou.');
      }
      if (note.user_id === actor.id) {
        throw new FlashNoteBookingError('SELF', 'Nao e possivel garantir o proprio horario.');
      }

      const artist = await tx.perfil.findFirst({
        where: {
          id: note.user_id,
          deleted_at: null,
          statusConta: 'ATIVO',
          role: 'tatuador',
          kyc_status: 'aprovado',
          agenda_bloqueada: false,
        },
        select: { id: true },
      });
      if (!artist) {
        throw new FlashNoteBookingError('FORBIDDEN', 'Artista indisponivel para agendamento.');
      }

      const pricing = resolveFlashNoteSalePrice(note.content);
      if (!pricing) {
        throw new FlashNoteBookingError(
          'INVALID_PRICE',
          'Esta oferta nao possui valor valido para reserva.'
        );
      }

      const consumed = await tx.flashNote.updateMany({
        where: {
          id: note.id,
          ativa: true,
          expiresAt: { gt: now },
        },
        data: { ativa: false },
      });
      if (consumed.count !== 1) {
        throw new FlashNoteBookingError('CONSUMED', 'Esta Flash Note ja foi garantida ou expirou.');
      }

      const slot = await pickArtistSlot(tx, artist.id);
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${artist.id}::text),
          hashtext(${slot.toISOString()}::text)
        )
      `;

      const conflito = await tx.agendamento.findFirst({
        where: {
          tatuador_id: artist.id,
          data_hora: slot,
          deleted_at: null,
          status: { in: [...ACTIVE_BOOKING_STATUSES] },
        },
        select: { id: true },
      });
      if (conflito) {
        throw new FlashNoteBookingError('CONFLICT', 'Horario em mutex. Tente novamente.');
      }

      const totalAmount = pricing.salePrice;
      const depositValue = depositAmount(totalAmount);
      const mutexExpiraEm = new Date(Date.now() + MUTEX_MINUTES * 60 * 1000);
      const priceRange = formatPriceRange(totalAmount);

      const agendamento = await tx.agendamento.create({
        data: {
          cliente_id: client.id,
          tatuador_id: artist.id,
          data_hora: slot,
          status: 'aguardando_sinal',
          session_status: 'AWAITING_PAYMENT',
          valor_total: new Prisma.Decimal(totalAmount.toFixed(2)),
          valor_sinal: new Prisma.Decimal(depositValue.toFixed(2)),
          sinal_pago: false,
          mutex_expira_em: mutexExpiraEm,
          extras: {
            create: [
              {
                descricao: extraLabel(note.id),
                valor: new Prisma.Decimal(totalAmount.toFixed(2)),
              },
            ],
          },
        },
        select: { id: true },
      });

      const quote = await tx.mensagemChat.create({
        data: {
          remetente_id: client.id,
          destinatario_id: artist.id,
          mensagem: [
            'Flash Note reservada',
            note.content.trim(),
            `Valor total: ${priceRange}`,
            `Sinal (25%): ${formatPriceRange(depositValue)}`,
          ].join('\n'),
          bloqueada: false,
          status: 'enviado',
          categoria: 'ORCAMENTO',
          price_range: priceRange,
          quote_status: 'agendado',
        },
        select: { id: true },
      });

      return {
        alreadyProcessed: false as const,
        bookingId: agendamento.id,
        artistId: artist.id,
        slot,
        totalAmount,
        depositValue,
        quoteId: quote.id,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 15000,
    }
  );

  revalidatePath('/dashboard', 'layout');
  revalidatePath('/dashboard/cliente');
  revalidatePath('/dashboard/agenda');
  revalidatePath('/dashboard/pagamentos');
  revalidatePath('/dashboard/chat');
  revalidatePath('/dashboard/tatuador');

  return {
    success: true,
    data: {
      bookingId: priced.bookingId,
      quoteId: priced.quoteId,
      artistId: priced.artistId,
      totalAmount: priced.totalAmount,
      depositAmount: priced.depositValue,
      slot: priced.slot.toISOString(),
      alreadyProcessed: priced.alreadyProcessed,
    },
  };
}

export async function bookFlashNote(noteId: string): Promise<BookFlashNoteResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Nao autenticado.', code: 'UNAUTHENTICATED' };
  }

  let parsedId: string;
  try {
    parsedId = parseChatId(noteId, 'noteId');
  } catch {
    return { success: false, error: 'Flash Note invalida.', code: 'NOT_FOUND' };
  }

  let lockToken: string | null = null;
  try {
    const lock = await acquireNoteLock(parsedId);
    if (lock === 'busy') {
      return {
        success: false,
        error: 'Esta oferta ja esta sendo garantida. Aguarde um instante.',
        code: 'CONFLICT',
      };
    }
    lockToken = lock;

    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_SERIALIZATION_RETRIES; attempt += 1) {
      try {
        return await bookFlashNoteOnce(parsedId, userId);
      } catch (error) {
        lastError = error;
        if (error instanceof FlashNoteBookingError || error instanceof ChatError) {
          return toResult(error);
        }
        const retryable = isPrismaKnown(error) && (error.code === 'P2034' || error.code === 'P2028');
        if (retryable && attempt < MAX_SERIALIZATION_RETRIES - 1) continue;
        return toResult(error);
      }
    }
    return toResult(lastError);
  } finally {
    await releaseNoteLock(parsedId, lockToken);
  }
}
