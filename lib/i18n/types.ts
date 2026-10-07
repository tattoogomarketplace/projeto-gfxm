export const LOCALES = ['pt-BR', 'en', 'es'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'pt-BR';

export const LOCALE_STORAGE_KEY = 'tattoogo-locale';

export const LOCALE_LABELS: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  en: 'English',
  es: 'Español',
};

export const LOCALE_HTML_LANG: Record<Locale, string> = {
  'pt-BR': 'pt-BR',
  en: 'en',
  es: 'es',
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
