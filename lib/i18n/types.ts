export const LOCALES = [
  'pt-BR',
  'pt-PT',
  'en',
  'es',
  'fr',
  'de',
  'it',
  'ja',
  'zh',
  'ko',
  'ar',
  'ru',
  'hi',
  'nl',
  'tr',
  'pl',
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'pt-BR';

export const FALLBACK_LOCALE: Locale = 'en';

export const LOCALE_STORAGE_KEY = 'tattoogo-locale';

export const LOCALE_LABELS: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  'pt-PT': 'Português (Portugal)',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
  ar: 'العربية',
  ru: 'Русский',
  hi: 'हिन्दी',
  nl: 'Nederlands',
  tr: 'Türkçe',
  pl: 'Polski',
};

export const LOCALE_HTML_LANG: Record<Locale, string> = {
  'pt-BR': 'pt-BR',
  'pt-PT': 'pt-PT',
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  ja: 'ja',
  zh: 'zh-CN',
  ko: 'ko',
  ar: 'ar',
  ru: 'ru',
  hi: 'hi',
  nl: 'nl',
  tr: 'tr',
  pl: 'pl',
};

export const LOCALE_ALIASES: Record<string, Locale> = {
  pt: 'pt-BR',
  'pt-br': 'pt-BR',
  pt_br: 'pt-BR',
  'pt-BR': 'pt-BR',
  'pt-pt': 'pt-PT',
  'pt-PT': 'pt-PT',
  en: 'en',
  'en-us': 'en',
  'en-US': 'en',
  'en-gb': 'en',
  'en-GB': 'en',
  'en-au': 'en',
  'en-AU': 'en',
  es: 'es',
  'es-es': 'es',
  'es-ES': 'es',
  'es-mx': 'es',
  'es-MX': 'es',
  'es-ar': 'es',
  'es-AR': 'es',
  'es-419': 'es',
  fr: 'fr',
  'fr-fr': 'fr',
  'fr-FR': 'fr',
  'fr-ca': 'fr',
  'fr-CA': 'fr',
  'fr-be': 'fr',
  'fr-BE': 'fr',
  de: 'de',
  'de-de': 'de',
  'de-DE': 'de',
  'de-at': 'de',
  'de-AT': 'de',
  'de-ch': 'de',
  'de-CH': 'de',
  it: 'it',
  'it-it': 'it',
  'it-IT': 'it',
  ja: 'ja',
  'ja-jp': 'ja',
  'ja-JP': 'ja',
  zh: 'zh',
  'zh-cn': 'zh',
  'zh-CN': 'zh',
  'zh-hans': 'zh',
  'zh-Hans': 'zh',
  'zh-tw': 'zh',
  'zh-TW': 'zh',
  'zh-hant': 'zh',
  'zh-Hant': 'zh',
  'zh-hk': 'zh',
  'zh-HK': 'zh',
  cmn: 'zh',
  ko: 'ko',
  'ko-kr': 'ko',
  'ko-KR': 'ko',
  ar: 'ar',
  'ar-sa': 'ar',
  'ar-SA': 'ar',
  'ar-eg': 'ar',
  'ar-EG': 'ar',
  ru: 'ru',
  'ru-ru': 'ru',
  'ru-RU': 'ru',
  hi: 'hi',
  'hi-in': 'hi',
  'hi-IN': 'hi',
  nl: 'nl',
  'nl-nl': 'nl',
  'nl-NL': 'nl',
  'nl-be': 'nl',
  'nl-BE': 'nl',
  tr: 'tr',
  'tr-tr': 'tr',
  'tr-TR': 'tr',
  pl: 'pl',
  'pl-pl': 'pl',
  'pl-PL': 'pl',
};

export type MessageKey =
  | 'nav.home'
  | 'nav.schedule'
  | 'nav.book'
  | 'nav.chat'
  | 'nav.profile'
  | 'nav.settings'
  | 'nav.gallery'
  | 'settings.title'
  | 'settings.hub'
  | 'settings.backToProfile'
  | 'settings.subtitleArtist'
  | 'settings.subtitleClient'
  | 'settings.appearance'
  | 'settings.appearanceSubtitle'
  | 'settings.schedule'
  | 'settings.scheduleSubtitle'
  | 'settings.notifications'
  | 'settings.notificationsSubtitle'
  | 'settings.security'
  | 'settings.securitySubtitle'
  | 'settings.privacy'
  | 'settings.privacySubtitle'
  | 'settings.language'
  | 'settings.languageActive'
  | 'settings.languagePt'
  | 'settings.languageEn'
  | 'settings.languageEs'
  | 'settings.terms'
  | 'settings.termsSubtitle'
  | 'settings.manageAccount'
  | 'settings.manageAccountSubtitle'
  | 'settings.sessionProtection'
  | 'settings.sessionProtectionSubtitle'
  | 'common.save'
  | 'common.cancel'
  | 'common.confirm'
  | 'common.close'
  | 'common.back'
  | 'common.continue'
  | 'common.loading'
  | 'common.retry'
  | 'common.search'
  | 'common.send'
  | 'common.error'
  | 'common.success'
  | 'common.offline'
  | 'common.online'
  | 'common.done'
  | 'common.edit'
  | 'common.delete'
  | 'common.open'
  | 'chat.title'
  | 'chat.conversations'
  | 'chat.empty'
  | 'chat.emptyHint'
  | 'chat.selectArtist'
  | 'chat.selectArtistHint'
  | 'chat.newQuote'
  | 'chat.book'
  | 'profile.title'
  | 'profile.settingsAndActivity'
  | 'auth.signIn'
  | 'auth.signOut'
  | 'auth.register';

export type MessageDictionary = Record<MessageKey, string>;

export type TranslateVars = Record<string, string | number>;
