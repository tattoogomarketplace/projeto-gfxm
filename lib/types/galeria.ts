export type GaleriaArtist = {
  id: string;
  name: string;
  avatarUrl: string | null;
  initial: string;
  cidade: string | null;
  estado: string | null;
  studio: { id: string; name: string } | null;
};

export type GaleriaItem = {
  id: string;
  tatuadorId: string;
  imageUrl: string;
  style: string;
  bodyPart: string;
  sessionDuration: string;
  isHealed: boolean;
  createdAt: string;
  likesCount: number;
  descricao: string | null;
  artist: GaleriaArtist;
};

export type GaleriaHealingFilter = 'all' | 'fresh' | 'healed';

export type GaleriaQuery = {
  style?: string;
  bodyPart?: string;
  healed?: GaleriaHealingFilter;
};
