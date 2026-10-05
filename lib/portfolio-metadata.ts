export const PORTFOLIO_STYLES = [
  'Fine Line',
  'Realismo',
  'Old School',
  'Blackwork',
  'Minimalista',
  'Oriental',
  'Geometrico',
  'Aquarela',
  'Lettering',
  'Neo Traditional',
] as const;

export const PORTFOLIO_BODY_PARTS = [
  'Braco',
  'Antebraco',
  'Ombro',
  'Peito',
  'Costas',
  'Costela',
  'Perna',
  'Coxa',
  'Panturrilha',
  'Pulso',
  'Mao',
  'Pescoco',
] as const;

export const PORTFOLIO_SESSION_DURATIONS = [
  'Ate 1h',
  '1-2h',
  '2-4h',
  '4-6h',
  'Dia inteiro',
  'Multiplas sessoes',
] as const;

export type PortfolioStyle = (typeof PORTFOLIO_STYLES)[number];
export type PortfolioBodyPart = (typeof PORTFOLIO_BODY_PARTS)[number];
export type PortfolioSessionDuration = (typeof PORTFOLIO_SESSION_DURATIONS)[number];

export type PortfolioItemDto = {
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
};

export type PortfolioPublishInput = {
  imageUrl: string;
  style: string;
  bodyPart: string;
  sessionDuration: string;
  isHealed: boolean;
};

const STYLE_SET = new Set<string>(PORTFOLIO_STYLES);
const BODY_PART_SET = new Set<string>(PORTFOLIO_BODY_PARTS);
const DURATION_SET = new Set<string>(PORTFOLIO_SESSION_DURATIONS);

export function isPortfolioStyle(value: string): value is PortfolioStyle {
  return STYLE_SET.has(value);
}

export function isPortfolioBodyPart(value: string): value is PortfolioBodyPart {
  return BODY_PART_SET.has(value);
}

export function isPortfolioSessionDuration(
  value: string
): value is PortfolioSessionDuration {
  return DURATION_SET.has(value);
}

export function isHttpsImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function healingLabel(isHealed: boolean): 'Cicatrizada' | 'Recém-feita' {
  return isHealed ? 'Cicatrizada' : 'Recém-feita';
}

const STYLE_LABELS: Record<PortfolioStyle, string> = {
  'Fine Line': 'Fine Line',
  Realismo: 'Realismo',
  'Old School': 'Old School',
  Blackwork: 'Blackwork',
  Minimalista: 'Minimalista',
  Oriental: 'Oriental',
  Geometrico: 'Geométrico',
  Aquarela: 'Aquarela',
  Lettering: 'Lettering',
  'Neo Traditional': 'Neo Traditional',
};

const BODY_PART_LABELS: Record<PortfolioBodyPart, string> = {
  Braco: 'Braço',
  Antebraco: 'Antebraço',
  Ombro: 'Ombro',
  Peito: 'Peito',
  Costas: 'Costas',
  Costela: 'Costela',
  Perna: 'Perna',
  Coxa: 'Coxa',
  Panturrilha: 'Panturrilha',
  Pulso: 'Pulso',
  Mao: 'Mão',
  Pescoco: 'Pescoço',
};

const DURATION_LABELS: Record<PortfolioSessionDuration, string> = {
  'Ate 1h': 'Até 1h',
  '1-2h': '1-2h',
  '2-4h': '2-4h',
  '4-6h': '4-6h',
  'Dia inteiro': 'Dia inteiro',
  'Multiplas sessoes': 'Múltiplas sessões',
};

export function styleLabel(value: string): string {
  return isPortfolioStyle(value) ? STYLE_LABELS[value] : value;
}

export function bodyPartLabel(value: string): string {
  return isPortfolioBodyPart(value) ? BODY_PART_LABELS[value] : value;
}

export function sessionDurationLabel(value: string): string {
  return isPortfolioSessionDuration(value) ? DURATION_LABELS[value] : value;
}
