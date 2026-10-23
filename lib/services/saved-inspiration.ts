import { prisma } from '@/lib/prisma';

export class SavedInspirationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'SavedInspirationError';
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SavedInspirationToggleResult = {
  isSaved: boolean;
  message: string;
};

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function prismaCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

export async function loadSaveActor(clerkId: string): Promise<{ id: string }> {
  const actor = await prisma.perfil.findUnique({
    where: { clerk_id: clerkId },
    select: { id: true, deleted_at: true },
  });
  if (!actor || actor.deleted_at) {
    throw new SavedInspirationError(404, 'Perfil não encontrado.');
  }
  return { id: actor.id };
}

export async function toggleSavedInspiration(
  perfilId: string,
  postIdRaw: string
): Promise<SavedInspirationToggleResult> {
  const postId = typeof postIdRaw === 'string' ? postIdRaw.trim() : '';

  if (!perfilId || !postId) {
    throw new SavedInspirationError(400, 'userId e postId são obrigatórios.');
  }
  if (!isUuid(perfilId) || !isUuid(postId)) {
    throw new SavedInspirationError(400, 'Identificadores inválidos.');
  }

  const post = await prisma.portfolio.findFirst({
    where: { id: postId, deleted_at: null },
    select: { id: true },
  });
  if (!post) {
    throw new SavedInspirationError(404, 'Inspiração não encontrada.');
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const existingSave = await tx.savedInspiration.findUnique({
        where: {
          userId_postId: { userId: perfilId, postId },
        },
      });

      if (existingSave) {
        await tx.savedInspiration.delete({
          where: { id: existingSave.id },
        });
        return {
          isSaved: false,
          message: 'Inspiração removida dos salvos.',
        };
      }

      await tx.savedInspiration.create({
        data: { userId: perfilId, postId },
      });
      return {
        isSaved: true,
        message: 'Inspiração salva.',
      };
    });
  } catch (error) {
    const code = prismaCode(error);
    if (code === 'P2002') {
      return {
        isSaved: true,
        message: 'Inspiração salva.',
      };
    }
    if (code === 'P2025') {
      return {
        isSaved: false,
        message: 'Inspiração removida dos salvos.',
      };
    }
    if (code === 'P2003') {
      throw new SavedInspirationError(404, 'Inspiração não encontrada.');
    }
    if (code === 'P2021' || code === 'P2010') {
      console.error('[saved-inspiration] tabela saved_inspirations indisponível', {
        code,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new SavedInspirationError(500, 'Persistência de salvos indisponível.');
    }
    throw error;
  }
}
