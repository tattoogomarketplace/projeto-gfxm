export type InspirationItem = {
  id: string;
  imageUrl: string;
  style: string;
  artistName: string;
  artistId: string | null;
  likes: number;
};

export const HOME_GALLERY_TEASER_LIMIT = 6;

export const PLACEHOLDER_INSPIRATIONS: InspirationItem[] = [
  {
    id: 'ph-i1',
    imageUrl: 'https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=800&q=80&auto=format&fit=crop',
    style: 'Realismo',
    artistName: 'Rafael Lima',
    artistId: null,
    likes: 428,
  },
  {
    id: 'ph-i2',
    imageUrl: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=800&q=80&auto=format&fit=crop',
    style: 'Fine Line',
    artistName: 'Marina Costa',
    artistId: null,
    likes: 312,
  },
  {
    id: 'ph-i3',
    imageUrl: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=800&q=80&auto=format&fit=crop',
    style: 'Blackwork',
    artistName: 'Bianca Souza',
    artistId: null,
    likes: 587,
  },
  {
    id: 'ph-i4',
    imageUrl: 'https://images.unsplash.com/photo-1542727365-19732a80dcfd?w=800&q=80&auto=format&fit=crop',
    style: 'Old School',
    artistName: 'Diego Martins',
    artistId: null,
    likes: 204,
  },
  {
    id: 'ph-i5',
    imageUrl: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=80&auto=format&fit=crop',
    style: 'Minimalista',
    artistName: 'Camila Rocha',
    artistId: null,
    likes: 356,
  },
  {
    id: 'ph-i6',
    imageUrl: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80&auto=format&fit=crop',
    style: 'Geometrico',
    artistName: 'Lucas Ferreira',
    artistId: null,
    likes: 271,
  },
  {
    id: 'ph-i7',
    imageUrl: 'https://images.unsplash.com/photo-1560707854-fb9a10eeaace?w=800&q=80&auto=format&fit=crop',
    style: 'Aquarela',
    artistName: 'Marina Costa',
    artistId: null,
    likes: 193,
  },
  {
    id: 'ph-i8',
    imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80&auto=format&fit=crop',
    style: 'Lettering',
    artistName: 'Diego Martins',
    artistId: null,
    likes: 462,
  },
  {
    id: 'ph-i9',
    imageUrl: 'https://images.unsplash.com/photo-1595475207225-428b62bda831?w=800&q=80&auto=format&fit=crop',
    style: 'Oriental',
    artistName: 'Bianca Souza',
    artistId: null,
    likes: 638,
  },
  {
    id: 'ph-i10',
    imageUrl: 'https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=800&q=80&auto=format&fit=crop',
    style: 'Realismo',
    artistName: 'Rafael Lima',
    artistId: null,
    likes: 349,
  },
];
