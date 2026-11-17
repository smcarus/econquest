/**
 * Languages (Sam, 2026-11-08: Spanish first, then French; both use the formal "you": usted, vous.
 * 2026-11-12, roadmap U2: Brazilian Portuguese with the polite "você"; Arabic and Swahili follow). The app's own words are kept in keyed
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

export type Lang = 'en' | 'es' | 'fr' | 'pt';
/** Languages other than English, each its own download. */
export type OtherLang = Exclude<Lang, 'en'>;
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
  { code: 'fr', name: 'Français', short: 'FR', reviewed: false },
  { code: 'pt', name: 'Português', short: 'PT', reviewed: false },
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
  void ensureLang(lang);
}

/**
 * A message file: English for every key, other languages for as many keys as are done. The
 * English lives with the screen; the Spanish is kept in src/i18n/es/ and the French in
 * src/i18n/fr/, each loaded only when someone picks that language, so English users download none
 * of it and a French reader downloads no Spanish.
 */
export interface Catalog<K extends string = string> {
  /** Area name, for the completeness test and for matching the Spanish file. */
  area: string;
  en: Record<K, string>;
  es: Partial<Record<K, string>>;
  fr: Partial<Record<K, string>>;
  pt: Partial<Record<K, string>>;
}

/** The Spanish or French for one message file: every key of its English. */
export type Messages<C> = C extends Catalog<infer K> ? Record<K, string> : never;

/** Every message file defined so far, so a language loaded later reaches them all. */
const registry = new Map<string, Catalog>();
const loaded: Partial<Record<Lang, Record<string, Record<string, string>>>> = {};
/** Whole sentences that are built in English elsewhere (Missing reasons), keyed by their English. */
const loadedText: Partial<Record<Lang, { exact: Record<string, string>; patterns: Array<[RegExp, string, string[]]>; parts: Array<[string, string]> }>> = {};

/** Placeholders that may hold commas and semicolons: a source's name, a list, a detail clause. */
const WIDE = new Set(['source', 'list', 'detail']);

/** "{n} of {total} figures" as a whole-text pattern; each {name} matches what the app put there (no comma). */
function textPattern(en: string): [RegExp, string[]] {
  const names: string[] = [];
  const src = en
    .split(/(\{\w+\})/)
    .map((part) => {
      const m = /^\{(\w+)\}$/.exec(part);
      if (m) {
        names.push(m[1]!);
        // Never across a comma or semicolon, so a pattern cannot swallow the next clause of a longer
        // sentence; only {source} (a source's own name), {list} and {detail} may hold commas, and
        // {num}, {num2} hold one number, thousands commas included.
        return WIDE.has(m[1]!) ? '(.+?)' : m[1]!.startsWith('num') ? '([-+]?[\\d.,]+)' : '([^,;]+?)';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  return [new RegExp(`^${src}$`, 's'), names];
}
let version = 0;

/** Defines a message file with its keys taken from the English list. */
export function defineMessages<K extends string>(area: string, en: Record<K, string>, es: Partial<Record<K, string>> = {}): Catalog<K> {
  const catalog: Catalog<K> = {
    area,
    en,
    es: { ...es, ...(loaded.es?.[area] as Partial<Record<K, string>> | undefined) },
    fr: { ...(loaded.fr?.[area] as Partial<Record<K, string>> | undefined) },
    pt: { ...(loaded.pt?.[area] as Partial<Record<K, string>> | undefined) },
  };
  registry.set(area, catalog as Catalog);
  return catalog;
}

/** Puts a loaded language's words into every message file, now and as later files are defined. */
export function attachLanguage(lang: OtherLang, dicts: Record<string, Record<string, string>>, text: Record<string, string> = {}): void {
  loaded[lang] = dicts;
  const exact: Record<string, string> = {};
  const patterns: Array<[RegExp, string, string[]]> = [];
  for (const [en, tr] of Object.entries(text)) {
    if (/\{\w+\}/.test(en)) {
      const [re, names] = textPattern(en);
      patterns.push([re, tr, names]);
    } else exact[en] = tr;
  }
  // Longest first, so a sentence is swapped before any shorter sentence inside it.
  patterns.sort((a, b) => b[0].source.length - a[0].source.length);
  const parts = Object.entries(exact).filter(([en]) => en.length > 20).sort((a, b) => b[0].length - a[0].length);
  loadedText[lang] = { exact, patterns, parts };
  for (const [area, catalog] of registry) Object.assign(catalog[lang], dicts[area]);
  version += 1;
}

/** Changes each time a language's words arrive, so screens draw again. */
export function langVersion(): number {
  return version;
}

/** Loads the words for a language if they are not here yet (English is always here). */
export async function ensureLang(lang: Lang): Promise<void> {
  if (lang === 'en' || loaded[lang]) return;
  try {
    // One import per language, so each is its own download (Vite splits on each import()).
    if (lang === 'es') {
      const { ES, ES_TEXT } = await import('./es/index');
      attachLanguage('es', ES, ES_TEXT);
    } else if (lang === 'fr') {
      const { FR, FR_TEXT } = await import('./fr/index');
      attachLanguage('fr', FR, FR_TEXT);
    } else {
      const { PT, PT_TEXT } = await import('./pt/index');
      attachLanguage('pt', PT, PT_TEXT);
    }
  } catch {
    return; // Could not load (offline build gap): the app stays in English.
  }
  try {
    window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: lang }));
  } catch {
    // No window (tests).
  }
}

/** The text for a key in a language, with {name} placeholders filled; English when not translated. */
export function translate<K extends string>(catalog: Catalog<K>, lang: Lang, key: K, vars?: Record<string, string | number>): string {
  const text = (lang === 'en' ? undefined : catalog[lang][key]) ?? catalog.en[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/**
 * A sentence the app builds in English because it also goes into notes and the council's prompts
 * (the reasons a figure is Missing, the brief panels' figure names), shown in the chosen language. An
 * exact match is swapped whole; a key with {name} in it is a whole-text pattern; a joined text ("Turkey: ... Egypt: ...") has each known sentence swapped in place; anything
 * not in the list stays English.
 */
export function translateText(text: string, lang: Lang): string {
  if (lang === 'en' || !text) return text;
  const t = loadedText[lang];
  if (!t) return text;
  const exact = t.exact[text];
  if (exact !== undefined) return exact;
  for (const [re, tr, names] of t.patterns) {
    const m = re.exec(text);
    // Each filled-in part is itself translated when it is known text (a figure's name, a reason).
    if (m) {
      return tr.replace(/\{(\w+)\}/g, (whole, name: string) => {
        if (!names.includes(name)) return whole;
        const part = m[names.indexOf(name) + 1] ?? whole;
        if (part === text) return part;
        const whole2 = translateText(part, lang);
        // A list joined with "; " is translated item by item when it is not known as a whole.
        return whole2 === part && part.includes('; ') ? part.split('; ').map((p) => translateText(p, lang)).join('; ') : whole2;
      });
    }
  }
  // A list joined with "; " that is not known as a whole is translated item by item.
  if (text.includes('; ')) {
    const items = text.split('; ');
    const done = items.map((p) => translateText(p, lang));
    if (done.some((d, i) => d !== items[i])) return done.join('; ');
  }
  let out = text;
  for (const [en, tr] of t.parts) if (out.includes(en)) out = out.split(en).join(tr);
  return out;
}

/** The {name} placeholders in a message, sorted, for checking translations keep them all. */
export function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();
}
