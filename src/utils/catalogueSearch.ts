/**
 * Search the free data catalogues (platform comparison gap CG6): one box that looks through
 * DBnomics (about 90 providers, searched on their server), the IMF DataMapper indicators, the World
 * Bank's World Development Indicators and Eurostat's table of contents (lists downloaded once a day
 * by the server and searched here). Each result is a catalogue entry with its code, its provider's
 * page and the licence note; nothing is downloaded until the user opens the link.
 *
 * Browser-safe, pure: parsers for each catalogue's reply and the word match used for the lists.
 */

export type CatalogueSource = 'dbnomics' | 'imf' | 'worldbank' | 'eurostat';

export interface CatalogueEntry {
  source: CatalogueSource;
  code: string;
  title: string;
  /** Provider or dataset group, when the catalogue gives one. */
  group?: string;
  /** Number of series, when the catalogue gives it (DBnomics). */
  series?: number;
  url: string;
}

export const CATALOGUE_LABEL: Record<CatalogueSource, string> = {
  dbnomics: 'DBnomics',
  imf: 'IMF DataMapper',
  worldbank: 'World Bank WDI',
  eurostat: 'Eurostat',
};

/** Licence notes, as recorded in docs/DATA_LICENCES.md. */
export const CATALOGUE_LICENCE: Record<CatalogueSource, string> = {
  dbnomics: "DBnomics republishes each provider's data under that provider's terms: check the provider before you republish.",
  imf: 'IMF terms of use: free for personal and research use; check the terms before you republish.',
  worldbank: 'World Bank: CC BY 4.0 (credit the World Bank).',
  eurostat: 'Eurostat: free reuse with credit to the source (Commission Decision 2011/833/EU).',
};

export const CATALOGUE_URLS = {
  dbnomics: (q: string, limit: number) => `https://api.db.nomics.world/v22/search?q=${encodeURIComponent(q)}&limit=${limit}`,
  imf: 'https://www.imf.org/external/datamapper/api/v1/indicators',
  worldbank: 'https://api.worldbank.org/v2/indicator?format=json&per_page=5000&source=2',
  eurostat: 'https://ec.europa.eu/eurostat/api/dissemination/catalogue/toc/txt?lang=en',
};

export function parseDbnomicsSearch(j: any): CatalogueEntry[] {
  const docs: any[] = j?.results?.docs || [];
  return docs
    .filter((d) => d && typeof d.provider_code === 'string' && typeof d.code === 'string')
    .map((d) => ({
      source: 'dbnomics' as const,
      code: `${d.provider_code}/${d.code}`,
      title: String(d.name || d.code),
      group: String(d.provider_name || d.provider_code),
      ...(Number.isFinite(d.nb_series) ? { series: Number(d.nb_series) } : {}),
      url: `https://db.nomics.world/${encodeURIComponent(d.provider_code)}/${encodeURIComponent(d.code)}`,
    }));
}

export function parseImfIndicators(j: any): CatalogueEntry[] {
  const ind = j?.indicators && typeof j.indicators === 'object' ? j.indicators : {};
  return Object.entries(ind)
    .filter(([code, v]: [string, any]) => code && v && typeof v.label === 'string' && v.label.trim())
    .map(([code, v]: [string, any]) => ({ source: 'imf' as const, code, title: String(v.label).trim(), ...(v.dataset ? { group: String(v.dataset) } : {}), url: `https://www.imf.org/external/datamapper/${encodeURIComponent(code)}` }));
}

export function parseWbIndicators(j: any): CatalogueEntry[] {
  const rows: any[] = Array.isArray(j) && Array.isArray(j[1]) ? j[1] : [];
  return rows
    .filter((r) => r && typeof r.id === 'string' && typeof r.name === 'string')
    .map((r) => ({ source: 'worldbank' as const, code: r.id, title: r.name.trim(), ...(r.source?.value ? { group: String(r.source.value) } : {}), url: `https://data.worldbank.org/indicator/${encodeURIComponent(r.id)}` }));
}

/** Eurostat's table of contents (tab-separated, quoted): datasets and tables only, folders left out. */
export function parseEurostatToc(text: string): CatalogueEntry[] {
  const out: CatalogueEntry[] = [];
  const lines = text.split(/\r?\n/);
  const unq = (v: string) => v.trim().replace(/^"|"$/g, '').trim();
  const head = (lines[0] || '').split('\t').map((h) => unq(h).toLowerCase());
  const iTitle = Math.max(0, head.indexOf('title'));
  const iCode = head.indexOf('code') >= 0 ? head.indexOf('code') : 1;
  const iType = head.indexOf('type') >= 0 ? head.indexOf('type') : 2;
  const seen = new Set<string>();
  for (const line of lines.slice(1)) {
    const f = line.split('\t');
    if (f.length <= Math.max(iCode, iType)) continue;
    const type = unq(f[iType]).toLowerCase();
    const code = unq(f[iCode]);
    if ((type !== 'dataset' && type !== 'table') || !code || seen.has(code)) continue;
    seen.add(code);
    out.push({ source: 'eurostat', code, title: unq(f[iTitle]), url: `https://ec.europa.eu/eurostat/databrowser/view/${encodeURIComponent(code)}/default/table` });
  }
  return out;
}

/** Lower-case words of two letters or more; a code-like query (with _ . or digits) is kept whole too. */
export function queryWords(q: string): string[] {
  return [...new Set(q.toLowerCase().split(/[^a-z0-9_.]+/).filter((w) => w.length >= 2))];
}

/**
 * Entries whose title or code holds every word of the query, best first: an exact code match, then
 * more words found at the start of title words, then shorter titles.
 */
export function matchEntries(entries: CatalogueEntry[], q: string, limit = 25): CatalogueEntry[] {
  const words = queryWords(q);
  if (!words.length) return [];
  const whole = q.trim().toLowerCase();
  const scored: Array<{ e: CatalogueEntry; s: number }> = [];
  for (const e of entries) {
    const title = e.title.toLowerCase();
    const code = e.code.toLowerCase();
    if (!words.every((w) => title.includes(w) || code.includes(w))) continue;
    let s = code === whole ? 1000 : 0;
    for (const w of words) if (new RegExp(`(^|[^a-z0-9])${w.replace(/[.]/g, '\\.')}`).test(title)) s += 10;
    s -= title.length / 100;
    scored.push({ e, s });
  }
  return scored
    .sort((a, b) => b.s - a.s || a.e.title.localeCompare(b.e.title))
    .slice(0, limit)
    .map((x) => x.e);
}
