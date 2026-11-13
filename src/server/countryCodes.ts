/**
 * Country codes in API addresses (console integration item 1). An outside system may name a
 * country by ISO 3166 alpha-2 ("BR") or alpha-3 ("BRA"); the app's routes and feeds use alpha-3.
 * This turns a known alpha-2 code into alpha-3 in the places an address names a country, before
 * the routes see it, so every existing address accepts both. Anything else is left as it is.
 */
import { iso3FromCode } from '../data/iso3166Alpha2';

/** Address shapes whose segment after the prefix is a country code. */
const COUNTRY_SEGMENT: RegExp[] = [
  /^(\/api\/series\/)([A-Za-z]{2})(\/[^?]*)?$/,
  /^(\/api\/export\/)([A-Za-z]{2})(\/[^?]*)$/,
  /^(\/api\/v1\/integration\/(?:desks|bundle)\/)([A-Za-z]{2})(\/[^?]*)?$/,
  /^(\/api\/v1\/countries\/)([A-Za-z]{2})(\/[^?]*)?$/,
];

/** Query fields that name one country or a comma-separated list. */
const COUNTRY_QUERY = ['iso3', 'countries'];

function swapList(v: string): string {
  return v
    .split(',')
    .map((c) => {
      const t = c.trim();
      return t.length === 2 ? iso3FromCode(t) ?? c : c;
    })
    .join(',');
}

/** The path with a two-letter country code turned into the app's three-letter code. */
export function normaliseCountryPath(pathname: string): string {
  for (const re of COUNTRY_SEGMENT) {
    const m = re.exec(pathname);
    if (!m) continue;
    const iso3 = iso3FromCode(m[2]!);
    return iso3 ? `${m[1]}${iso3}${m[3] ?? ''}` : pathname;
  }
  return pathname;
}

/**
 * Same for a parsed query (Express's req.query): two-letter codes in iso3= and
 * countries= become three-letter codes. Returns null when nothing changed.
 */
export function normaliseCountryQuery(query: Record<string, unknown>): Record<string, unknown> | null {
  let changed = false;
  const out: Record<string, unknown> = { ...query };
  for (const k of COUNTRY_QUERY) {
    const v = query[k];
    if (typeof v !== 'string' || !v) continue;
    const next = swapList(v);
    if (next !== v) {
      out[k] = next;
      changed = true;
    }
  }
  return changed ? out : null;
}

/** Both at once on a full address ("/api/series/BR?x=1"), for tests and for req.url. */
export function normaliseCountryUrl(url: string): string {
  const q = url.indexOf('?');
  const pathname = q < 0 ? url : url.slice(0, q);
  const search = q < 0 ? '' : url.slice(q + 1);
  const nextPath = normaliseCountryPath(pathname);
  if (!search) return nextPath;
  const params = new URLSearchParams(search);
  let changed = false;
  for (const k of COUNTRY_QUERY) {
    const v = params.get(k);
    if (!v) continue;
    const next = swapList(v);
    if (next !== v) {
      params.set(k, next);
      changed = true;
    }
  }
  return `${nextPath}?${changed ? params.toString() : search}`;
}
