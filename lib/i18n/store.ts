import { DEFAULT_LOCALE, LOCALES, LOCALE_STORAGE_KEY, type Locale, type MessageKey, type TranslateVars } from '@/lib/i18n/types';
import { DICTIONARIES, PT_BR } from '@/lib/i18n/dictionary';

const listeners = new Set<() => void>();

let cachedLocale: Locale | null = null;
let cachedDictionary = DICTIONARIES[DEFAULT_LOCALE];
let storageBound = false;

const ALIASES: Record<string, Locale> = {
  pt: 'pt-BR',
  'pt-br': 'pt-BR',
  'pt_BR': 'pt-BR',
  'pt-BR': 'pt-BR',
  en: 'en',
  'en-us': 'en',
  'en-US': 'en',
  es: 'es',
  'es-es': 'es',
  'es-ES': 'es',
  'es-mx': 'es',
  'es-MX': 'es',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: unknown): Locale {
  if (typeof value !== 'string' || value.length === 0) return DEFAULT_LOCALE;
  const exact = ALIASES[value] ?? ALIASES[value.trim()];
  if (exact) return exact;
  const lower = value.trim().toLowerCase();
  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('en')) return 'en';
  if (lower.startsWith('es')) return 'es';
  return DEFAULT_LOCALE;
}

function interpolate(template: string, vars?: TranslateVars): string {
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

function applyLocale(locale: Locale) {
  cachedLocale = locale;
  cachedDictionary = DICTIONARIES[locale];
}

function notify() {
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key !== LOCALE_STORAGE_KEY) return;
  const next = normalizeLocale(event.newValue);
  if (next === cachedLocale) return;
  applyLocale(next);
  notify();
}

function bindStorage() {
  if (storageBound || typeof window === 'undefined') return;
  window.addEventListener('storage', onStorage);
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
  const next = readFromStorage();
  bindStorage();
  if (cachedLocale === next) return cachedLocale;
  applyLocale(next);
  return next;
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
  if (next === current) return current;
  applyLocale(next);
  writeToStorage(next);
  notify();
  return next;
}

export function t(key: MessageKey, vars?: TranslateVars, locale: Locale = getLocale()): string {
  const dict = locale === cachedLocale ? cachedDictionary : DICTIONARIES[locale];
  const template = dict[key] ?? PT_BR[key] ?? key;
  return interpolate(template, vars);
}

export function getDictionary(locale: Locale = getLocale()) {
  return locale === cachedLocale ? cachedDictionary : DICTIONARIES[locale];
}
