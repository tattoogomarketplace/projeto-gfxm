import type { MessageKey } from '@/lib/i18n/types';

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
  location?: string | null;
};

export function resolvePortfolioLocation(input: {
  studioCity?: string | null;
  studioState?: string | null;
  artistCity?: string | null;
  artistState?: string | null;
}): string | null {
  const pick = (city?: string | null, state?: string | null): string | null => {
    const c = (city ?? '').trim();
    const uf = (state ?? '').trim();
    if (c && uf) return `${c}/${uf}`;
    return c || uf || null;
  };
  return pick(input.studioCity, input.studioState) ?? pick(input.artistCity, input.artistState);
}

export type PortfolioPublishInput = {
  imageUrl: string;
  style: string;
  bodyPart: string;
  sessionDuration: string;
  isHealed: boolean;
  notes?: string;
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

const STYLE_KEYS: Record<PortfolioStyle, MessageKey> = {
  'Fine Line': 'portfolio.style.fineLine',
  Realismo: 'portfolio.style.realismo',
  'Old School': 'portfolio.style.oldSchool',
  Blackwork: 'portfolio.style.blackwork',
  Minimalista: 'portfolio.style.minimalista',
  Oriental: 'portfolio.style.oriental',
  Geometrico: 'portfolio.style.geometrico',
  Aquarela: 'portfolio.style.aquarela',
  Lettering: 'portfolio.style.lettering',
  'Neo Traditional': 'portfolio.style.neoTradicional',
};

const BODY_PART_KEYS: Record<PortfolioBodyPart, MessageKey> = {
  Braco: 'portfolio.body.braco',
  Antebraco: 'portfolio.body.antebraco',
  Ombro: 'portfolio.body.ombro',
  Peito: 'portfolio.body.peito',
  Costas: 'portfolio.body.costas',
  Costela: 'portfolio.body.costela',
  Perna: 'portfolio.body.perna',
  Coxa: 'portfolio.body.coxa',
  Panturrilha: 'portfolio.body.panturrilha',
  Pulso: 'portfolio.body.pulso',
  Mao: 'portfolio.body.mao',
  Pescoco: 'portfolio.body.pescoco',
};

const DURATION_KEYS: Record<PortfolioSessionDuration, MessageKey> = {
  'Ate 1h': 'portfolio.duration.ate1h',
  '1-2h': 'portfolio.duration.h1to2',
  '2-4h': 'portfolio.duration.h2to4',
  '4-6h': 'portfolio.duration.h4to6',
  'Dia inteiro': 'portfolio.duration.fullDay',
  'Multiplas sessoes': 'portfolio.duration.multiSession',
};

export function portfolioStyleKey(value: string): MessageKey | null {
  return isPortfolioStyle(value) ? STYLE_KEYS[value] : null;
}

export function portfolioBodyKey(value: string): MessageKey | null {
  return isPortfolioBodyPart(value) ? BODY_PART_KEYS[value] : null;
}

export function portfolioDurationKey(value: string): MessageKey | null {
  return isPortfolioSessionDuration(value) ? DURATION_KEYS[value] : null;
}

export function portfolioHealingKey(isHealed: boolean): MessageKey {
  return isHealed ? 'portfolio.healing.healed' : 'portfolio.healing.fresh';
}

type TranslateFn = (key: MessageKey) => string;

export function portfolioLabelResolver(t: TranslateFn) {
  return {
    styleLabel(value: string): string {
      const key = portfolioStyleKey(value);
      return key ? t(key) : value;
    },
    bodyPartLabel(value: string): string {
      const key = portfolioBodyKey(value);
      return key ? t(key) : value;
    },
    sessionDurationLabel(value: string): string {
      const key = portfolioDurationKey(value);
      return key ? t(key) : value;
    },
    healingLabel(isHealed: boolean): string {
      return t(portfolioHealingKey(isHealed));
    },
  };
}

const CASUAL_NOISE =
  /\b(top|lindo|linda|show|brabo|braba|massa|irado|irada|fire|love|amei|demais|kk+|haha+|lol)\b/gi;

export function sanitizePortfolioNotes(value: string): string {
  const withoutLinks = value
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\bwww\.\S+/gi, '')
    .replace(/[#@][\p{L}\p{N}_]+/gu, '')
    .replace(CASUAL_NOISE, '')
    .replace(/[^\p{L}\p{N}\s.,;:()\-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!withoutLinks) return '';
  const clipped = withoutLinks.slice(0, 180).trim();
  return clipped.charAt(0).toUpperCase() + clipped.slice(1);
}

export function composeStudioCaption(input: {
  style: string;
  bodyPart: string;
  sessionDuration: string;
  isHealed: boolean;
  notes?: string;
}): string {
  const style = styleLabel(input.style);
  const bodyPart = bodyPartLabel(input.bodyPart);
  const duration = sessionDurationLabel(input.sessionDuration);
  const healing = input.isHealed
    ? 'registro cicatrizado após o processo de cura'
    : 'registro de sessão recente, ainda em processo de cicatrização';
  const notes = sanitizePortfolioNotes(input.notes ?? '');
  const lead = `${style} executado em ${bodyPart.toLowerCase()}, com duração de ${duration}.`;
  const close = `Peça catalogada como ${healing}, em padrão de studio.`;
  if (notes) {
    return `${lead} ${notes.replace(/[.]+$/, '')}. ${close}`;
  }
  return `${lead} ${close}`;
}
