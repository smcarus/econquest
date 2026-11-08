/**
 * Languages (Sam, 2026-11-08: Spanish first, then French). The app's own words are kept in keyed
 * message files (src/i18n/messages/), one file per area, so a new screen adds its own file
 * instead of editing a shared list. English is the source; a word missing in another language
 * falls back to English rather than showing a key.
 *
 * Figures, source names, series names and anything a feed or the AI model wrote are never
 * translated here: they show as the source gave them.
 *
 * The choice is kept per browser in localStorage (a viewer convenience); the app works in English
 * if storage is blocked. Browser-safe; no React import here so the rules can be tested.
 */

export type Lang = 'en' | 'es';
export const DEFAULT_LANG: Lang = 'en';
export const LANG_KEY = 'econquest.lang.v1';
export const LANG_EVENT = 'econquest:lang';

export interface LangInfo {
  code: Lang;
  /** The language's name in itself. */
  name: string;
  /** Short label for the header button. */
  short: string;
  /** False until a native speaker has checked the wording; the app says so beside the switch. */
  reviewed: boolean;
}

export const LANGS: readonly LangInfo[] = [
  { code: 'en', name: 'English', short: 'EN', reviewed: true },
  { code: 'es', name: 'Español', short: 'ES', reviewed: false },
];

export function parseLang(v: unknown): Lang {
  return LANGS.some((l) => l.code === v) ? (v as Lang) : DEFAULT_LANG;
}

export function langInfo(lang: Lang): LangInfo {
  return LANGS.find((l) => l.code === lang) ?? LANGS[0]!;
}

/** The next language when the header button is pressed. */
export function nextLang(lang: Lang): Lang {
  const i = LANGS.findIndex((l) => l.code === lang);
  return LANGS[(i + 1) % LANGS.length]!.code;
}

export function readLang(): Lang {
  try {
    const raw = window.localStorage.getItem(LANG_KEY);
    return raw === null ? DEFAULT_LANG : parseLang(raw);
  } catch {
    return DEFAULT_LANG;
  }
}

export function writeLang(lang: Lang): void {
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Storage blocked: the language still changes for this page view.
  }
  try {
    document.documentElement.lang = lang;
  } catch {
    // No document (tests).
  }
  window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: lang }));
}

/** A message file: English for every key, other languages for as many keys as are done. */
export interface Catalog<K extends string = string> {
  /** Area name, for the completeness test. */
  area: string;
  en: Record<K, string>;
  es: Partial<Record<K, string>>;
}

/** Defines a message file with its keys taken from the English list. */
export function defineMessages<K extends string>(area: string, en: Record<K, string>, es: Partial<Record<K, string>>): Catalog<K> {
  return { area, en, es };
}

/** The text for a key in a language, with {name} placeholders filled; English when not translated. */
export function translate<K extends string>(catalog: Catalog<K>, lang: Lang, key: K, vars?: Record<string, string | number>): string {
  const text = (lang === 'en' ? undefined : catalog[lang][key]) ?? catalog.en[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** The {name} placeholders in a message, sorted, for checking translations keep them all. */
export function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();
}
