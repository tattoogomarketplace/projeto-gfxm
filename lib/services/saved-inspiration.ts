import type { InspirationItem } from '@/lib/gallery-mock';
import { prisma } from '@/lib/prisma';
import { resolvePortfolioLocation } from '@/lib/portfolio-metadata';

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
          where: {
            userId_postId: { userId: perfilId, postId },
          },
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

function artistName(nome: string | null | undefined): string {
  return (nome ?? '').trim();
}

function artistInitial(nome: string): string {
  const letter = nome.charAt(0);
  return letter ? letter.toUpperCase() : 'A';
}

function mapSavedPost(post: {
  id: string;
  url_imagem: string;
  estilo: string;
  descricao: string | null;
  likes_count: number;
  tatuador_id: string;
  tatuador: {
    id: string;
    nome: string | null;
    username: string | null;
    cidade: string | null;
    estado: string | null;
    studio: { cidade: string | null; estado: string | null } | null;
  };
}): InspirationItem {
  const name = artistName(post.tatuador.nome);
  return {
    id: post.id,
    imageUrl: post.url_imagem,
    style: post.estilo,
    artistName: name,
    artistId: post.tatuador_id,
    artistUsername: post.tatuador.username ?? null,
    likes: post.likes_count,
    artistAvatarUrl: null,
    artistInitial: artistInitial(name),
    location: resolvePortfolioLocation({
      studioCity: post.tatuador.studio?.cidade,
      studioState: post.tatuador.studio?.estado,
      artistCity: post.tatuador.cidade,
      artistState: post.tatuador.estado,
    }),
    description: post.descricao,
  };
}

export async function listSavedInspirations(
  perfilId: string,
  options?: { take?: number }
): Promise<InspirationItem[]> {
  if (!isUuid(perfilId)) return [];

  const take = options?.take;
  if (typeof take === 'number' && (!Number.isFinite(take) || take < 1)) {
    return [];
  }

  try {
    const rows = await prisma.savedInspiration.findMany({
      where: {
        userId: perfilId,
        post: {
          deleted_at: null,
          tatuador: { deleted_at: null },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(typeof take === 'number' ? { take } : {}),
      select: {
        post: {
          select: {
            id: true,
            url_imagem: true,
            estilo: true,
            descricao: true,
            likes_count: true,
            tatuador_id: true,
            tatuador: {
              select: {
                id: true,
                nome: true,
                username: true,
                cidade: true,
                estado: true,
                studio: { select: { cidade: true, estado: true } },
              },
            },
          },
        },
      },
    });

    return rows.map((row) => mapSavedPost(row.post));
  } catch (error) {
    const code = prismaCode(error);
    if (code === 'P2021' || code === 'P2010') {
      console.error('[saved-inspiration] listagem indisponível', {
        code,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
    throw error;
  }
}

export async function listSavedInspirationIds(perfilId: string): Promise<string[]> {
  if (!isUuid(perfilId)) return [];

  try {
    const rows = await prisma.savedInspiration.findMany({
      where: {
        userId: perfilId,
        post: {
          deleted_at: null,
          tatuador: { deleted_at: null },
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { postId: true },
    });
    return rows.map((row) => row.postId);
  } catch (error) {
    const code = prismaCode(error);
    if (code === 'P2021' || code === 'P2010') {
      console.error('[saved-inspiration] ids de salvos indisponíveis', {
        code,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
    throw error;
  }
}
