import { prisma } from '@/lib/prisma';
import { getArtistSchedule } from '@/lib/services/artist-schedule';
import type { PortfolioItemDto } from '@/lib/portfolio-metadata';
import { WEEKDAY_LABELS, type WorkingHoursSchedule } from '@/lib/working-hours';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ArtistVitrineError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ArtistVitrineError';
  }
}

export type PublicArtistStudio = {
  id: string;
  name: string;
};

export type PublicArtistProfile = {
  id: string;
  name: string;
  initial: string;
  cidade: string | null;
  estado: string | null;
  studio: PublicArtistStudio | null;
  kycApproved: boolean;
  bookingEnabled: boolean;
};

export type PublicArtistVitrine = {
  artist: PublicArtistProfile;
  items: PortfolioItemDto[];
  scheduleSummary: string[];
};

export function isArtistId(value: string): boolean {
  return UUID_RE.test(value);
}

function artistName(nome: string | null): string {
  const trimmed = (nome ?? '').trim();
  return trimmed || 'Artista';
}

function artistInitial(nome: string): string {
  const letter = nome.charAt(0);
  return letter ? letter.toUpperCase() : 'A';
}

function summarizeSchedule(schedule: WorkingHoursSchedule): string[] {
  return schedule.days
    .filter((day) => day.active)
    .map((day) => `${WEEKDAY_LABELS[day.day]} · ${day.start}–${day.end}`);
}

export async function getPublicArtistVitrine(artistIdRaw: string): Promise<PublicArtistVitrine> {
  const artistId = artistIdRaw.trim();
  if (!isArtistId(artistId)) {
    throw new ArtistVitrineError(400, 'Identificador de artista inválido.');
  }

  const artist = await prisma.perfil.findFirst({
    where: {
      id: artistId,
      deleted_at: null,
      role: 'tatuador',
      statusConta: 'ATIVO',
    },
    select: {
      id: true,
      nome: true,
      cidade: true,
      estado: true,
      kyc_status: true,
      agenda_bloqueada: true,
      studio: {
        select: { id: true, nome: true },
      },
    },
  });

  if (!artist) {
    throw new ArtistVitrineError(404, 'Artista não encontrado.');
  }

  const rows = await prisma.portfolio.findMany({
    where: { tatuador_id: artistId, deleted_at: null },
    select: {
      id: true,
      tatuador_id: true,
      url_imagem: true,
      estilo: true,
      body_part: true,
      session_duration: true,
      is_healed: true,
      descricao: true,
      likes_count: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
    take: 48,
  });

  const name = artistName(artist.nome);
  const studioName = (artist.studio?.nome ?? '').trim();
  const kycApproved = artist.kyc_status === 'aprovado';
  let scheduleSummary: string[] = [];
  try {
    const schedule = await getArtistSchedule(artistId);
    scheduleSummary = summarizeSchedule(schedule.schedule);
  } catch {
    scheduleSummary = [];
  }

  return {
    artist: {
      id: artist.id,
      name,
      initial: artistInitial(name),
      cidade: artist.cidade,
      estado: artist.estado,
      studio: artist.studio ? { id: artist.studio.id, name: studioName || 'Estúdio' } : null,
      kycApproved,
      bookingEnabled: kycApproved && !artist.agenda_bloqueada,
    },
    items: rows.map((row) => ({
      id: row.id,
      tatuadorId: row.tatuador_id,
      imageUrl: row.url_imagem,
      style: row.estilo,
      bodyPart: row.body_part,
      sessionDuration: row.session_duration,
      isHealed: row.is_healed,
      createdAt: row.created_at.toISOString(),
      likesCount: row.likes_count,
      descricao: row.descricao,
    })),
    scheduleSummary,
  };
}
