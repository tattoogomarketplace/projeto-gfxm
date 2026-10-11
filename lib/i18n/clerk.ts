import {
  arSA,
  deDE,
  enUS,
  esES,
  frFR,
  hiIN,
  itIT,
  jaJP,
  koKR,
  nlNL,
  plPL,
  ptBR,
  ptPT,
  ruRU,
  trTR,
  zhCN,
} from '@clerk/localizations';
import type { Locale } from '@/lib/i18n/types';

type ClerkLocalization = typeof ptBR;

export const CLERK_LOCALIZATIONS: Record<Locale, ClerkLocalization> = {
  'pt-BR': ptBR,
  'pt-PT': ptPT,
  en: enUS,
  es: esES,
  fr: frFR,
  de: deDE,
  it: itIT,
  ja: jaJP,
  zh: zhCN,
  ko: koKR,
  ar: arSA,
  ru: ruRU,
  hi: hiIN,
  nl: nlNL,
  tr: trTR,
  pl: plPL,
};
