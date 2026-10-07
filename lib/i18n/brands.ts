export const BRAND_NAME = 'TattooGo MK' as const;
export const BRAND_MARKETPLACE = 'TattooGo Marketplace' as const;

export const PROTECTED_BRANDS = [BRAND_NAME, BRAND_MARKETPLACE] as const;

export type ProtectedBrand = (typeof PROTECTED_BRANDS)[number];

const PROTECTED_BRAND_SET = new Set<string>(PROTECTED_BRANDS);

export function isProtectedBrand(value: unknown): value is ProtectedBrand {
  return typeof value === 'string' && PROTECTED_BRAND_SET.has(value);
}

export function protectBrand(value: string): string {
  if (value === 'brand.name' || isProtectedBrand(value)) return BRAND_NAME;
  if (value === 'brand.marketplace') return BRAND_MARKETPLACE;
  return value;
}
