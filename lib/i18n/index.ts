export { BRAND_MARKETPLACE, BRAND_NAME, PROTECTED_BRANDS, isProtectedBrand, protectBrand } from '@/lib/i18n/brands';
export type { ProtectedBrand } from '@/lib/i18n/brands';
export type { Locale, MessageDictionary, MessageKey, TranslateVars, UiDictionary, UiMessageKey } from '@/lib/i18n/types';
export {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LOCALES,
  LOCALE_ALIASES,
  LOCALE_HTML_LANG,
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
} from '@/lib/i18n/types';
export { UI_MESSAGES } from '@/lib/i18n/ui';
export { AR, DE, FR, HI, IT, JA, KO, NL, PL, PT_PT, RU, TR, ZH } from '@/lib/i18n/locales';
export { DICTIONARIES, EN, ES, MESSAGE_KEYS, PT_BR } from '@/lib/i18n/dictionary';
export {
  getDictionary,
  getLocale,
  getLocaleServerSnapshot,
  getLocaleSnapshot,
  isLocale,
  normalizeLocale,
  setLocale,
  subscribeLocale,
  t,
} from '@/lib/i18n/store';
