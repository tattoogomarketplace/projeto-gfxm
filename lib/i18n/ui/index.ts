import type { Locale, UiDictionary } from '@/lib/i18n/types';
import { UI_EN, UI_ES, UI_PT_BR, UI_PT_PT } from '@/lib/i18n/ui/core';
import { UI_DE, UI_FR, UI_IT } from '@/lib/i18n/ui/europe';
import { UI_JA, UI_KO, UI_ZH } from '@/lib/i18n/ui/asia';
import { UI_AR, UI_HI, UI_NL, UI_PL, UI_RU, UI_TR } from '@/lib/i18n/ui/misc';
import { SCREEN_MESSAGES } from '@/lib/i18n/ui/screens';
import { LOCALIZED_MESSAGES } from '@/lib/i18n/ui/localized';

export {
  UI_EN,
  UI_ES,
  UI_PT_BR,
  UI_PT_PT,
  UI_DE,
  UI_FR,
  UI_IT,
  UI_JA,
  UI_KO,
  UI_ZH,
  UI_AR,
  UI_HI,
  UI_NL,
  UI_PL,
  UI_RU,
  UI_TR,
};

export { SCREEN_MESSAGES };

export const UI_MESSAGES: Record<Locale, UiDictionary> = {
  'pt-BR': { ...UI_PT_BR, ...SCREEN_MESSAGES['pt-BR'], ...LOCALIZED_MESSAGES['pt-BR'] },
  'pt-PT': { ...UI_PT_PT, ...SCREEN_MESSAGES['pt-PT'], ...LOCALIZED_MESSAGES['pt-PT'] },
  en: { ...UI_EN, ...SCREEN_MESSAGES.en, ...LOCALIZED_MESSAGES.en },
  es: { ...UI_ES, ...SCREEN_MESSAGES.es, ...LOCALIZED_MESSAGES.es },
  fr: { ...UI_FR, ...SCREEN_MESSAGES.fr, ...LOCALIZED_MESSAGES.fr },
  de: { ...UI_DE, ...SCREEN_MESSAGES.de, ...LOCALIZED_MESSAGES.de },
  it: { ...UI_IT, ...SCREEN_MESSAGES.it, ...LOCALIZED_MESSAGES.it },
  ja: { ...UI_JA, ...SCREEN_MESSAGES.ja, ...LOCALIZED_MESSAGES.ja },
  zh: { ...UI_ZH, ...SCREEN_MESSAGES.zh, ...LOCALIZED_MESSAGES.zh },
  ko: { ...UI_KO, ...SCREEN_MESSAGES.ko, ...LOCALIZED_MESSAGES.ko },
  ar: { ...UI_AR, ...SCREEN_MESSAGES.ar, ...LOCALIZED_MESSAGES.ar },
  ru: { ...UI_RU, ...SCREEN_MESSAGES.ru, ...LOCALIZED_MESSAGES.ru },
  hi: { ...UI_HI, ...SCREEN_MESSAGES.hi, ...LOCALIZED_MESSAGES.hi },
  nl: { ...UI_NL, ...SCREEN_MESSAGES.nl, ...LOCALIZED_MESSAGES.nl },
  tr: { ...UI_TR, ...SCREEN_MESSAGES.tr, ...LOCALIZED_MESSAGES.tr },
  pl: { ...UI_PL, ...SCREEN_MESSAGES.pl, ...LOCALIZED_MESSAGES.pl },
};
