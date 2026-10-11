import { prisma } from '@/lib/prisma';
import { normalizeUsername, USERNAME_MAX_LENGTH, USERNAME_PATTERN } from '@/lib/username';

/**
 * TATTOOGO MK — PERFIL PÚBLICO POR @USERNAME (APPLE-TIER)
 *
 * Leitura estritamente passiva e blindada do perfil alheio. A soberania do
 * `@username` é absoluta: a única porta de entrada é o handle público normalizado
 * (`^[a-z0-9_]+$`), nunca o e-mail, o CPF ou o `nome` (Display Name).
 *
 * Blindagem CISO (sem vazamento entre papéis):
 *  - Select mínimo: expõe apenas campos publicáveis (nome, handle, cidade/UF,
 *    papel, selo KYC e a vitrine de portfólio). Nunca e-mail, CPF, banco ou
 *    metadados de KYC.
 *  - Perfis de cliente/estúdio não possuem vitrine de portfólio: devolvem grade
 *    vazia elegante sem tocar em dados sensíveis.
 *  - Nenhuma escrita, nenhuma mutação, nenhum efeito colateral.
 */

export type PublicProfileRole = 'cliente' | 'tatuador' | 'estudio';

export type PublicProfileMediaItem = {
  id: string;
  imageUrl: string;
  alt: string;
};

export type PublicProfileData = {
  id: string;
  name: string;
  username: string | null;
  role: PublicProfileRole;
  avatarUrl: string | null;
  cidade: string | null;
  estado: string | null;
  verified: boolean;
  metrics: {
    posts: number;
    followers: number;
    following: number;
  };
  media: PublicProfileMediaItem[];
};

export class PublicProfileError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'PublicProfileError';
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseRole(value: unknown): PublicProfileRole {
  const normalized = normalizeUsername(value);
  if (normalized === 'tatuador') return 'tatuador';
  if (normalized === 'estudio') return 'estudio';
  return 'cliente';
}

/**
 * Resolve um perfil público a partir de um identificador: o `@username`
 * canônico OU o `id` (UUID) do perfil. A porta por `id` existe para que as
 * superfícies que só carregam o identificador (chat e feeds) possam abrir o
 * perfil público sem expor nem duplicar dados sensíveis.
 */
export async function getPublicProfile(identifierRaw: string): Promise<PublicProfileData> {
  const identifier = String(identifierRaw ?? '').trim();
  const byId = UUID_RE.test(identifier);

  if (!byId) {
    const username = normalizeUsername(identifier).slice(0, USERNAME_MAX_LENGTH);
    if (!username || !USERNAME_PATTERN.test(username)) {
      throw new PublicProfileError(400, 'Usuário inválido.');
    }
    return loadPublicProfile({ username });
  }

  return loadPublicProfile({ id: identifier });
}

async function loadPublicProfile(where: {
  username?: string;
  id?: string;
}): Promise<PublicProfileData> {
  const perfil = await prisma.perfil.findFirst({
    where: {
      ...where,
      deleted_at: null,
      statusConta: 'ATIVO',
    },
    select: {
      id: true,
      nome: true,
      username: true,
      role: true,
      cidade: true,
      estado: true,
      kyc_status: true,
    },
  });

  if (!perfil) {
    throw new PublicProfileError(404, 'Perfil não encontrado.');
  }

  const role = parseRole(perfil.role);

  const rows =
    role === 'tatuador'
      ? await prisma.portfolio.findMany({
          where: { tatuador_id: perfil.id, deleted_at: null },
          select: {
            id: true,
            url_imagem: true,
            estilo: true,
            descricao: true,
            likes_count: true,
          },
          orderBy: { created_at: 'desc' },
          take: 60,
        })
      : [];

  const followers = rows.reduce((total, row) => total + (Number(row.likes_count) || 0), 0);

  return {
    id: perfil.id,
    name: (perfil.nome ?? '').trim(),
    username: perfil.username,
    role,
    avatarUrl: null,
    cidade: perfil.cidade,
    estado: perfil.estado,
    verified: role === 'tatuador' && perfil.kyc_status === 'aprovado',
    metrics: {
      posts: rows.length,
      followers,
      following: 0,
    },
    media: rows.map((row) => ({
      id: row.id,
      imageUrl: row.url_imagem,
      alt: (row.descricao ?? '').trim() || row.estilo,
    })),
  };
}
