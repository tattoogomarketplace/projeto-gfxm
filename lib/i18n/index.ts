export type { Locale, MessageDictionary, MessageKey, TranslateVars } from '@/lib/i18n/types';
export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_HTML_LANG,
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
} from '@/lib/i18n/types';
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
