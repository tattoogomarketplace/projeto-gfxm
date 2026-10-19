import type { ReviewDto } from '@/lib/types/review';

/**
 * Mock identities aligned with Home "Artistas em Destaque" placeholders.
 * IDs are stable so UI layers can join without orphaned records.
 */
export const REVIEW_FEATURED_ARTISTS = {
  marina: {
    id: 'ph-marina',
    name: 'Marina Costa',
    role: 'tatuador' as const,
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&q=80&auto=format&fit=crop',
    initial: 'M',
  },
  rafael: {
    id: 'ph-rafael',
    name: 'Rafael Lima',
    role: 'tatuador' as const,
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&q=80&auto=format&fit=crop',
    initial: 'R',
  },
  bianca: {
    id: 'ph-bianca',
    name: 'Bianca Souza',
    role: 'tatuador' as const,
    avatarUrl:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=240&q=80&auto=format&fit=crop',
    initial: 'B',
  },
  diego: {
    id: 'ph-diego',
    name: 'Diego Martins',
    role: 'tatuador' as const,
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&q=80&auto=format&fit=crop',
    initial: 'D',
  },
  camila: {
    id: 'ph-camila',
    name: 'Camila Rocha',
    role: 'tatuador' as const,
    avatarUrl:
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=240&q=80&auto=format&fit=crop',
    initial: 'C',
  },
} as const;

const AUTHORS = {
  ana: {
    id: 'ph-client-ana',
    name: 'Ana Beatriz',
    avatarUrl:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=240&q=80&auto=format&fit=crop',
    initial: 'A',
  },
  joao: {
    id: 'ph-client-joao',
    name: 'João Pedro',
    avatarUrl:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=240&q=80&auto=format&fit=crop',
    initial: 'J',
  },
  leticia: {
    id: 'ph-client-leticia',
    name: 'Letícia Alves',
    avatarUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&q=80&auto=format&fit=crop',
    initial: 'L',
  },
  henrique: {
    id: 'ph-client-henrique',
    name: 'Henrique Souza',
    avatarUrl: null,
    initial: 'H',
  },
  carolina: {
    id: 'ph-client-carolina',
    name: 'Carolina Mendes',
    avatarUrl:
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=240&q=80&auto=format&fit=crop',
    initial: 'C',
  },
  bruno: {
    id: 'ph-client-bruno',
    name: 'Bruno Teixeira',
    avatarUrl: null,
    initial: 'B',
  },
} as const;

const PORTFOLIOS = {
  fineLine: {
    id: 'ph-i2',
    imageUrl:
      'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=800&q=80&auto=format&fit=crop',
    style: 'Fine Line',
  },
  realismo: {
    id: 'ph-i1',
    imageUrl:
      'https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=800&q=80&auto=format&fit=crop',
    style: 'Realismo',
  },
  blackwork: {
    id: 'ph-i3',
    imageUrl:
      'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=800&q=80&auto=format&fit=crop',
    style: 'Blackwork',
  },
  oldSchool: {
    id: 'ph-i4',
    imageUrl:
      'https://images.unsplash.com/photo-1542727365-19732a80dcfd?w=800&q=80&auto=format&fit=crop',
    style: 'Old School',
  },
  minimalista: {
    id: 'ph-i5',
    imageUrl:
      'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=80&auto=format&fit=crop',
    style: 'Minimalista',
  },
  oriental: {
    id: 'ph-i9',
    imageUrl:
      'https://images.unsplash.com/photo-1595475207225-428b62bda831?w=800&q=80&auto=format&fit=crop',
    style: 'Oriental',
  },
} as const;

export const PLACEHOLDER_REVIEWS: ReviewDto[] = [
  {
    id: 'ph-rev-1',
    authorId: AUTHORS.ana.id,
    targetId: REVIEW_FEATURED_ARTISTS.marina.id,
    portfolioId: PORTFOLIOS.fineLine.id,
    rating: 5,
    content:
      'Fine line impecável. A Marina explicou cada traço, respeitou o espaço do pulso e a cicatrização veio limpa em duas semanas.',
    artistReply:
      'Obrigada, Ana. Fico feliz que o pulso tenha cicatrizado tão bem — qualquer retoque, é só chamar.',
    repliedAt: '2026-09-18T14:20:00.000Z',
    isVerified: true,
    createdAt: '2026-09-12T16:40:00.000Z',
    author: AUTHORS.ana,
    target: REVIEW_FEATURED_ARTISTS.marina,
    portfolio: PORTFOLIOS.fineLine,
  },
  {
    id: 'ph-rev-2',
    authorId: AUTHORS.joao.id,
    targetId: REVIEW_FEATURED_ARTISTS.rafael.id,
    portfolioId: PORTFOLIOS.realismo.id,
    rating: 5,
    content:
      'Realismo de outro nível. O Rafael fechou o retrato do meu avô com luz e textura que parecem fotografia.',
    artistReply: null,
    repliedAt: null,
    isVerified: true,
    createdAt: '2026-09-02T11:05:00.000Z',
    author: AUTHORS.joao,
    target: REVIEW_FEATURED_ARTISTS.rafael,
    portfolio: PORTFOLIOS.realismo,
  },
  {
    id: 'ph-rev-3',
    authorId: AUTHORS.leticia.id,
    targetId: REVIEW_FEATURED_ARTISTS.bianca.id,
    portfolioId: PORTFOLIOS.blackwork.id,
    rating: 5,
    content:
      'Blackwork pesado, simétrico e sem blowout. Sessão longa, mas a Bianca controlou a dor e o ritmo com maestria.',
    artistReply:
      'Valeu demais, Letícia. Blackwork pede paciência dos dois lados — você foi impecável na recuperação.',
    repliedAt: '2026-08-29T19:10:00.000Z',
    isVerified: true,
    createdAt: '2026-08-21T18:30:00.000Z',
    author: AUTHORS.leticia,
    target: REVIEW_FEATURED_ARTISTS.bianca,
    portfolio: PORTFOLIOS.blackwork,
  },
  {
    id: 'ph-rev-4',
    authorId: AUTHORS.henrique.id,
    targetId: REVIEW_FEATURED_ARTISTS.diego.id,
    portfolioId: PORTFOLIOS.oldSchool.id,
    rating: 4,
    content:
      'Old school clássico, linhas firmes e cores saturadas. Único ponto: a sessão atrasou uns 20 min, mas o resultado compensou.',
    artistReply: null,
    repliedAt: null,
    isVerified: true,
    createdAt: '2026-08-14T09:50:00.000Z',
    author: AUTHORS.henrique,
    target: REVIEW_FEATURED_ARTISTS.diego,
    portfolio: PORTFOLIOS.oldSchool,
  },
  {
    id: 'ph-rev-5',
    authorId: AUTHORS.carolina.id,
    targetId: REVIEW_FEATURED_ARTISTS.camila.id,
    portfolioId: PORTFOLIOS.minimalista.id,
    rating: 5,
    content:
      'Minimalista exatamente do jeito que pedi: discreto, elegante e proporcional. Estúdio silencioso e higiene nota 10.',
    artistReply:
      'Carolina, obrigada. Peças mínimas vivem do equilíbrio — fico feliz que tenha saído do jeito que você imaginou.',
    repliedAt: '2026-07-30T12:00:00.000Z',
    isVerified: true,
    createdAt: '2026-07-22T15:15:00.000Z',
    author: AUTHORS.carolina,
    target: REVIEW_FEATURED_ARTISTS.camila,
    portfolio: PORTFOLIOS.minimalista,
  },
  {
    id: 'ph-rev-6',
    authorId: AUTHORS.bruno.id,
    targetId: REVIEW_FEATURED_ARTISTS.bianca.id,
    portfolioId: PORTFOLIOS.oriental.id,
    rating: 5,
    content:
      'Manga oriental que dialoga com o que já tinha no ombro. A Bianca estudou o fluxo do dragão antes de cravar uma linha.',
    artistReply: null,
    repliedAt: null,
    isVerified: true,
    createdAt: '2026-07-08T20:05:00.000Z',
    author: AUTHORS.bruno,
    target: REVIEW_FEATURED_ARTISTS.bianca,
    portfolio: PORTFOLIOS.oriental,
  },
  {
    id: 'ph-rev-7',
    authorId: AUTHORS.ana.id,
    targetId: REVIEW_FEATURED_ARTISTS.rafael.id,
    portfolioId: PORTFOLIOS.realismo.id,
    rating: 4,
    content:
      'Sombras profundas e pele respeitada. Voltei só para um micro retoque na luz da íris — processo transparente do início ao fim.',
    artistReply: null,
    repliedAt: null,
    isVerified: false,
    createdAt: '2026-06-19T13:40:00.000Z',
    author: AUTHORS.ana,
    target: REVIEW_FEATURED_ARTISTS.rafael,
    portfolio: PORTFOLIOS.realismo,
  },
  {
    id: 'ph-rev-8',
    authorId: AUTHORS.leticia.id,
    targetId: REVIEW_FEATURED_ARTISTS.marina.id,
    portfolioId: PORTFOLIOS.fineLine.id,
    rating: 5,
    content:
      'Flor delicate line no antebraço. Traço contínuo, sem vacilo, e aftercare enviado no mesmo dia com fotos de referência.',
    artistReply: null,
    repliedAt: null,
    isVerified: true,
    createdAt: '2026-06-03T10:22:00.000Z',
    author: AUTHORS.leticia,
    target: REVIEW_FEATURED_ARTISTS.marina,
    portfolio: PORTFOLIOS.fineLine,
  },
];
