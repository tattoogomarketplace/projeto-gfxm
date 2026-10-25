export type FlashNoteOffer = {
  caption: string;
  originalPrice: number | null;
  discountPercent: number | null;
  salePrice: number | null;
};

export type FlashNoteOfferInput = {
  price: number;
  discountPercentage: number | null;
};

const MAX_PRICE = 999999.99;

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    const parsed = Number(value.toNumber());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function normalizeFlashNotePrice(value: unknown): number | null {
  const parsed = asFiniteNumber(value);
  if (parsed == null || parsed <= 0 || parsed > MAX_PRICE) return null;
  return Number(parsed.toFixed(2));
}

export function normalizeFlashNoteDiscount(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = asFiniteNumber(value);
  if (parsed == null) return null;
  if (!Number.isInteger(parsed) || parsed < 0 || parsed >= 100) return null;
  return parsed === 0 ? null : parsed;
}

export function parseTypedMoneyInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/[^\d.,]/g, '');
  if (!trimmed) return null;
  const normalized =
    trimmed.includes(',') && trimmed.includes('.')
      ? trimmed.replace(/\./g, '').replace(',', '.')
      : trimmed.replace(',', '.');
  return normalizeFlashNotePrice(normalized);
}

export function resolveFlashNoteSalePrice(
  price: unknown,
  discountPercentage: unknown
): { originalPrice: number; discountPercent: number | null; salePrice: number } | null {
  const originalPrice = normalizeFlashNotePrice(price);
  if (originalPrice == null) return null;
  const discountPercent = normalizeFlashNoteDiscount(discountPercentage);
  const salePrice =
    discountPercent != null
      ? Number((originalPrice * (1 - discountPercent / 100)).toFixed(2))
      : originalPrice;
  if (!(salePrice > 0)) return null;
  return { originalPrice, discountPercent, salePrice };
}

export function buildFlashNoteOffer(params: {
  content: string;
  price: unknown;
  discountPercentage: unknown;
}): FlashNoteOffer {
  const pricing = resolveFlashNoteSalePrice(params.price, params.discountPercentage);
  return {
    caption: params.content.trim(),
    originalPrice: pricing?.originalPrice ?? null,
    discountPercent: pricing?.discountPercent ?? null,
    salePrice: pricing?.salePrice ?? null,
  };
}

export function formatFlashNotePrice(value: number, locale = 'pt-BR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value);
}
