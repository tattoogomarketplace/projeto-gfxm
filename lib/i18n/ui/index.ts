import type { Locale, UiDictionary } from '@/lib/i18n/types';
import { UI_EN, UI_ES, UI_PT_BR, UI_PT_PT } from '@/lib/i18n/ui/core';
import { UI_DE, UI_FR, UI_IT } from '@/lib/i18n/ui/europe';
import { UI_JA, UI_KO, UI_ZH } from '@/lib/i18n/ui/asia';
import { UI_AR, UI_HI, UI_NL, UI_PL, UI_RU, UI_TR } from '@/lib/i18n/ui/misc';

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

export const UI_MESSAGES: Record<Locale, UiDictionary> = {
  'pt-BR': UI_PT_BR,
  'pt-PT': UI_PT_PT,
  en: UI_EN,
  es: UI_ES,
  fr: UI_FR,
  de: UI_DE,
  it: UI_IT,
  ja: UI_JA,
  zh: UI_ZH,
  ko: UI_KO,
  ar: UI_AR,
  ru: UI_RU,
  hi: UI_HI,
  nl: UI_NL,
  tr: UI_TR,
  pl: UI_PL,
};
