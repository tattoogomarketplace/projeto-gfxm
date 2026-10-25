export type FlashNoteOffer = {
  caption: string;
  originalPrice: number | null;
  discountPercent: number | null;
  salePrice: number | null;
};

const DISCOUNT_RE = /(?:^|\s)[-–]?\s*(\d{1,2})\s*%(?:\s*off)?(?=\s|$)/i;
const PRICE_RE =
  /(?:r\$|rs\$?)\s*(\d{1,6}(?:[.,]\d{1,2})?)|(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:reais|brl)\b/i;

function parseMoney(raw: string): number | null {
  const normalized = raw.replace(/\./g, '').replace(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function parseFlashNoteOffer(content: string): FlashNoteOffer {
  const raw = content.trim();
  let caption = raw;
  let originalPrice: number | null = null;
  let discountPercent: number | null = null;

  const discountMatch = raw.match(DISCOUNT_RE);
  if (discountMatch) {
    const parsed = Number(discountMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0 && parsed < 100) {
      discountPercent = parsed;
      caption = caption.replace(discountMatch[0], ' ');
    }
  }

  const priceMatch = raw.match(PRICE_RE);
  const priceToken = priceMatch?.[1] || priceMatch?.[2];
  if (priceToken) {
    originalPrice = parseMoney(priceToken);
    if (originalPrice != null && priceMatch?.[0]) {
      caption = caption.replace(priceMatch[0], ' ');
    }
  }

  caption = caption.replace(/\s{2,}/g, ' ').replace(/^[-–|,.;:]+|[-–|,.;:]+$/g, '').trim();

  const salePrice =
    originalPrice != null && discountPercent != null
      ? Number((originalPrice * (1 - discountPercent / 100)).toFixed(2))
      : null;

  return {
    caption,
    originalPrice,
    discountPercent,
    salePrice,
  };
}

export function resolveFlashNoteSalePrice(content: string): {
  originalPrice: number;
  discountPercent: number | null;
  salePrice: number;
} | null {
  const offer = parseFlashNoteOffer(content);
  if (offer.originalPrice == null) return null;
  const salePrice = offer.salePrice != null ? offer.salePrice : offer.originalPrice;
  if (!(salePrice > 0)) return null;
  return {
    originalPrice: offer.originalPrice,
    discountPercent: offer.discountPercent,
    salePrice,
  };
}

export function formatFlashNotePrice(value: number, locale = 'pt-BR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value);
}
