import { prisma } from '@/lib/prisma';
import { BookingError } from '@/lib/services/booking-transaction';

export type BookingActor = {
  id: string;
  role: string;
  deleted_at: Date | null;
};

export async function loadBookingActor(clerkId: string): Promise<BookingActor | null> {
  return prisma.perfil.findUnique({
    where: { clerk_id: clerkId },
    select: { id: true, role: true, deleted_at: true },
  });
}

async function isStudioLinkedToArtist(estudioId: string, tatuadorId: string, studioId: string | null) {
  if (studioId === estudioId) return true;

  const vinculo = await prisma.estudioTatuador.findFirst({
    where: {
      estudio_id: estudioId,
      tatuador_id: tatuadorId,
      status_vinculo: 'ativo',
      deleted_at: null,
    },
    select: { tatuador_id: true },
  });
  return Boolean(vinculo);
}

export async function authorizeBookingCreation(params: {
  actor: BookingActor;
  tatuadorId: string;
  clienteId?: string;
}): Promise<{ clienteId: string; tatuadorId: string; actorId: string }> {
  const { actor, tatuadorId } = params;
  const payloadClienteId = params.clienteId?.trim() || undefined;

  let clienteId = payloadClienteId;
  if (!clienteId) {
    if (actor.role === 'tatuador' || actor.role === 'estudio') {
      throw new BookingError(400, 'Informe o cliente_id para criar o agendamento.');
    }
    clienteId = actor.id;
  }

  if (clienteId === tatuadorId) {
    throw new BookingError(400, 'Não é permitido autoagendamento.');
  }

  const [cliente, tatuador] = await Promise.all([
    prisma.perfil.findFirst({
      where: { id: clienteId, deleted_at: null, statusConta: 'ATIVO' },
      select: { id: true, statusConta: true },
    }),
    prisma.perfil.findFirst({
      where: { id: tatuadorId, deleted_at: null },
      select: { id: true, role: true, statusConta: true, studio_id: true },
    }),
  ]);

  if (!cliente) {
    throw new BookingError(400, 'Cliente inválido ou inativo.');
  }

  if (!tatuador || tatuador.role !== 'tatuador' || tatuador.statusConta !== 'ATIVO') {
    throw new BookingError(403, 'Tatuador indisponivel para agendamento.');
  }

  const actorIsCliente = actor.id === clienteId;
  const actorIsTatuador = actor.id === tatuadorId;
  const actorIsStudio =
    actor.role === 'estudio' &&
    (await isStudioLinkedToArtist(actor.id, tatuadorId, tatuador.studio_id));

  if (!actorIsCliente && !actorIsTatuador && !actorIsStudio) {
    throw new BookingError(403, 'Você não tem permissão para criar este agendamento.');
  }

  return { clienteId, tatuadorId, actorId: actor.id };
}
