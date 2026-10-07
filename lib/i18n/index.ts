export type { Locale, MessageDictionary, MessageKey, TranslateVars } from '@/lib/i18n/types';
export {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LOCALES,
  LOCALE_ALIASES,
  LOCALE_HTML_LANG,
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
} from '@/lib/i18n/types';
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
