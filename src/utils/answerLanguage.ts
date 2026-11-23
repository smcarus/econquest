/**
 * Council answers in the language you picked (platform comparison gap CG11).
 *
 * The page sends its language on each request in the X-Answer-Language header. The server keeps it
 * for that request only, and every model step adds one line to its instruction asking for the
 * reader-facing text in that language. English adds nothing, so English answers, prompts and the
 * recorded council replay are unchanged.
 *
 * What stays in English on purpose: JSON field names, values from a fixed list (stances, ratings,
 * agent ids), numbers, units, country codes and series names, so the app's checks read the answer
 * the same way in every language. The app's own screens are translated separately (src/i18n).
 * Browser-safe, pure.
 */
import type { Lang } from '../i18n/lang';

export const ANSWER_LANG_HEADER = 'x-answer-language';

const NAMES: Record<Exclude<Lang, 'en'>, { name: string; address: string }> = {
  es: { name: 'Spanish', address: 'address the reader as "usted"' },
  fr: { name: 'French', address: 'address the reader as "vous"' },
  pt: { name: 'Brazilian Portuguese', address: 'address the reader as "você"' },
};

/** The header value to a language; anything else (or nothing) is English. */
export function parseAnswerLang(raw: unknown): Lang {
  const v = String(Array.isArray(raw) ? raw[0] : raw ?? '').trim().toLowerCase().slice(0, 2);
  return v === 'es' || v === 'fr' || v === 'pt' ? v : 'en';
}

/** The line added to a model step's instruction; empty for English. */
export function languageInstruction(lang: Lang): string {
  if (lang === 'en') return '';
  const n = NAMES[lang];
  return `LANGUAGE: Write every sentence meant for the reader in ${n.name} and ${n.address}, in the same plain, direct style. Keep JSON field names, values chosen from a fixed list (stances, ratings, labels, agent ids), numbers, units, dates, country codes, series names and source names exactly as given, in English.`;
}

export function withAnswerLanguage(systemInstruction: string, lang: Lang): string {
  const line = languageInstruction(lang);
  return line ? `${systemInstruction}\n\n${line}` : systemInstruction;
}

let source: () => Lang | undefined = () => undefined;
/** The server hands in where the language of the request being handled is kept (AsyncLocalStorage). */
export function setAnswerLanguageSource(fn: () => Lang | undefined): void {
  source = fn;
}
/** The language of the request being handled; English outside a request. */
export const answerLanguageNow = (): Lang => source() ?? 'en';

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * Wraps the page's fetch so each request to this app's /api/ carries the language picked on the
 * page. English sends no header. Other sites are never sent it.
 */
export function answerLanguageFetch(base: FetchLike, lang: () => Lang, origin: string): FetchLike {
  return (input, init) => {
    const l = lang();
    if (l === 'en') return base(input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    let path = '';
    try {
      const u = new URL(url, origin);
      if (u.origin !== origin) return base(input, init);
      path = u.pathname;
    } catch {
      return base(input, init);
    }
    if (!path.startsWith('/api/')) return base(input, init);
    const headers = new Headers(init?.headers ?? (typeof input === 'object' && 'headers' in input ? input.headers : undefined));
    if (!headers.has(ANSWER_LANG_HEADER)) headers.set(ANSWER_LANG_HEADER, l);
    return base(input, { ...init, headers });
  };
}
