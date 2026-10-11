import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_ALIASES,
  LOCALE_HTML_LANG,
  LOCALE_STORAGE_KEY,
  type Locale,
  type MessageKey,
  type TranslateVars,
} from '@/lib/i18n/types';
import { DICTIONARIES, EN, PT_BR } from '@/lib/i18n/dictionary';
import { isProtectedBrand } from '@/lib/i18n/brands';

const listeners = new Set<() => void>();
const LOCALE_CHANGE_EVENT = 'tattoogo-locale-change';

let cachedLocale: Locale | null = null;
let cachedDictionary = DICTIONARIES[DEFAULT_LOCALE];
let storageBound = false;

const NORMALIZED_ALIASES = new Map<string, Locale>();
for (const [alias, locale] of Object.entries(LOCALE_ALIASES)) {
  NORMALIZED_ALIASES.set(alias.toLowerCase().replace('_', '-'), locale);
}

function primarySubtag(value: string): string {
  return value.trim().toLowerCase().replace('_', '-').split('-')[0];
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: unknown): Locale {
  if (typeof value !== 'string') return DEFAULT_LOCALE;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_LOCALE;
  if (isLocale(trimmed)) return trimmed;
  const lowered = trimmed.toLowerCase().replace('_', '-');
  const alias = NORMALIZED_ALIASES.get(lowered);
  if (alias) return alias;
  const primary = primarySubtag(trimmed);
  if (isLocale(primary)) return primary;
  const primaryAlias = NORMALIZED_ALIASES.get(primary);
  if (primaryAlias) return primaryAlias;
  return DEFAULT_LOCALE;
}

function interpolate(template: string, vars?: TranslateVars): string {
  if (isProtectedBrand(template)) return template;
  if (!vars) return template;
  let out = template;
  for (const key in vars) {
    out = out.replaceAll(`{${key}}`, String(vars[key]));
  }
  return out;
}

function readFromStorage(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

function writeToStorage(locale: Locale) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    return;
  }
}

function applyDocumentLang(locale: Locale) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  const lang = LOCALE_HTML_LANG[locale] ?? locale;
  html.lang = lang;
  html.setAttribute('lang', lang);
  html.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

function applyLocale(locale: Locale) {
  cachedLocale = locale;
  cachedDictionary = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  applyDocumentLang(locale);
}

function notify() {
  listeners.forEach((listener) => listener());
}

function broadcast(locale: Locale) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: locale }));
}

function onStorage(event: StorageEvent) {
  if (event.key !== LOCALE_STORAGE_KEY) return;
  const next = normalizeLocale(event.newValue);
  if (next === cachedLocale) return;
  applyLocale(next);
  notify();
}

function onLocaleChange(event: Event) {
  const next = normalizeLocale((event as CustomEvent).detail ?? cachedLocale);
  if (next === cachedLocale) return;
  applyLocale(next);
  notify();
}

function bindStorage() {
  if (storageBound || typeof window === 'undefined') return;
  window.addEventListener('storage', onStorage);
  window.addEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
  storageBound = true;
}

export function getLocale(): Locale {
  if (cachedLocale) return cachedLocale;
  const next = readFromStorage();
  applyLocale(next);
  bindStorage();
  return next;
}

export function getLocaleSnapshot(): Locale {
  bindStorage();
  return cachedLocale ?? getLocale();
}

export function getLocaleServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

export function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  bindStorage();
  return () => {
    listeners.delete(listener);
  };
}

export function setLocale(nextValue: unknown): Locale {
  const next = normalizeLocale(nextValue);
  const current = getLocale();
  applyLocale(next);
  writeToStorage(next);
  if (next !== current) {
    notify();
    broadcast(next);
  } else {
    notify();
  }
  return next;
}

export function t(key: MessageKey, vars?: TranslateVars, locale: Locale = getLocale()): string {
  const dictionary = locale === cachedLocale ? cachedDictionary : DICTIONARIES[locale];
  const template = dictionary[key] ?? EN[key] ?? PT_BR[key] ?? key;
  if (isProtectedBrand(template)) return template;
  return interpolate(template, vars);
}

export function getDictionary(locale: Locale = getLocale()) {
  return locale === cachedLocale ? cachedDictionary : DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}
