/**
 * Capital account openness (console integration item 13): the Chinn-Ito index (KAOPEN), which
 * measures how open a country's capital account is in law, from the IMF's yearly report on exchange
 * arrangements and restrictions (AREAER): multiple exchange rates, current account restrictions,
 * capital account restrictions and the surrender of export proceeds, combined as their first
 * principal component.
 *
 * Read from the authors' file (web.pdx.edu/~ito/Chinn-Ito_website.htm) saved in
 * data/local/chinn-ito/ as published (kaopen_<year>.xls), fetched by the daily download or
 * `npm run chinn-ito:pull`. Columns found by name: ccode (ISO alpha-3), year, kaopen (the index)
 * and ka_open (the index scaled from 0, least open, to 1, most open). Nothing is fetched here.
 *
 * Source to cite, as the authors ask: Chinn, Menzie D. and Hiro Ito (2006), "What Matters for
 * Financial Development? Capital Controls, Institutions, and Interactions", Journal of Development
 * Economics 81(1), 163-192. The file says "All rights reserved" and gives no licence: the app shows
 * the figures with that citation and never re-publishes the file.
 *
 * Description, not a tested signal. Browser-safe, pure.
 */
import type { Series, SeriesMissing } from './seriesHistory';

export const CHINN_ITO_PAGE = 'https://web.pdx.edu/~ito/Chinn-Ito_website.htm';
export const CHINN_ITO_SOURCE = 'Chinn-Ito financial openness index (KAOPEN), Chinn and Ito (2006)';
export const CHINN_ITO_CITATION =
  'Chinn, Menzie D. and Hiro Ito (2006), "What Matters for Financial Development? Capital Controls, Institutions, and Interactions", Journal of Development Economics 81(1), 163-192.';
export const CHINN_ITO_METHOD =
  'Chinn-Ito index (KAOPEN): the first principal component of four yes-or-no measures in the IMF\'s yearly report on exchange arrangements and restrictions (AREAER): more than one exchange rate, restrictions on current account payments, restrictions on capital account transactions, and a rule to surrender export earnings. It measures openness in law, not how much capital actually moves. Shown as published, both the raw index and the authors\' version scaled from 0 (least open) to 1 (most open), with where the country sits among all countries that year.';

export interface ChinnItoRow {
  year: number;
  kaopen: number | null;
  kaOpen: number | null;
}

export interface ChinnItoTable {
  /** ISO alpha-3 -> rows, oldest first. */
  countries: Record<string, ChinnItoRow[]>;
  firstYear: number;
  lastYear: number;
  /** The file it was read from, and when that file was saved. */
  file?: string;
  saved?: string;
}

/** Data-file links on the authors' page, newest edition first ("kaopen_2023.xls"). */
export function chinnItoLinks(html: string, base = CHINN_ITO_PAGE): string[] {
  const out = new Map<string, number>();
  for (const m of String(html || '').matchAll(/href\s*=\s*["']?([^"'\s>]*kaopen_(\d{4})\.xlsx?)["']?/gi)) {
    try {
      out.set(new URL(m[1]!, base).toString(), Number(m[2]));
    } catch {
      // not a URL
    }
  }
  return [...out.entries()].sort((a, b) => b[1] - a[1]).map(([u]) => u);
}

const num = (c: unknown): number | null => {
  const t = String(c ?? '').trim();
  if (!t || t === '.' || /^n\.?a\.?$/i.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** Rows of the file (header first) to a table; a reason when the layout is not recognised. */
export function parseChinnItoRows(rows: string[][]): ChinnItoTable | { reason: string } {
  const norm = (c: unknown) => String(c ?? '').trim().toLowerCase();
  const hi = rows.findIndex((r) => r.some((c) => norm(c) === 'ccode') && r.some((c) => norm(c) === 'year') && r.some((c) => norm(c) === 'kaopen' || norm(c) === 'ka_open'));
  if (hi < 0) return { reason: 'no header row with "ccode", "year" and "kaopen" columns (is this the Chinn-Ito kaopen file?)' };
  const head = rows[hi]!.map(norm);
  const ci = head.indexOf('ccode');
  const yi = head.indexOf('year');
  const ki = head.indexOf('kaopen');
  const ni = head.indexOf('ka_open');
  const countries: Record<string, ChinnItoRow[]> = {};
  let first = Infinity;
  let last = -Infinity;
  for (const r of rows.slice(hi + 1)) {
    const iso3 = String(r[ci] ?? '').trim().toUpperCase();
    const year = num(r[yi]);
    if (!/^[A-Z]{3}$/.test(iso3) || year === null || !Number.isInteger(year) || year < 1900 || year > 2200) continue;
    const kaopen = ki >= 0 ? num(r[ki]) : null;
    const kaOpen = ni >= 0 ? num(r[ni]) : null;
    if (kaopen === null && kaOpen === null) continue;
    (countries[iso3] ||= []).push({ year, kaopen, kaOpen });
    first = Math.min(first, year);
    last = Math.max(last, year);
  }
  const n = Object.keys(countries).length;
  if (!n) return { reason: 'the header was found but no country-year row has a value' };
  for (const list of Object.values(countries)) list.sort((a, b) => a.year - b.year);
  return { countries, firstYear: first, lastYear: last };
}

export interface ChinnItoReading {
  year: number;
  kaopen: number | null;
  kaOpen: number | null;
  /** ka_open five years earlier, when that year is on file. */
  change5y?: number;
  /** Share of countries with a ka_open that year that are less open than this one, %. */
  lessOpenPct: number | null;
  /** Countries with a ka_open that year. */
  countriesThatYear: number;
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/** The latest year on file for the country; a reason when it is not in the file. */
export function chinnItoReading(t: ChinnItoTable, iso3: string): ChinnItoReading | { missing: string } {
  const rows = t.countries[String(iso3 || '').toUpperCase()];
  if (!rows?.length) return { missing: `not in the Chinn-Ito file (${t.firstYear}-${t.lastYear})` };
  const last = rows[rows.length - 1]!;
  const before = rows.find((r) => r.year === last.year - 5);
  const peers = Object.values(t.countries)
    .map((list) => list.find((r) => r.year === last.year)?.kaOpen)
    .filter((v): v is number => typeof v === 'number');
  const lessOpenPct = last.kaOpen === null || !peers.length ? null : Math.round((100 * peers.filter((v) => v < last.kaOpen!).length) / peers.length);
  return {
    year: last.year,
    kaopen: last.kaopen === null ? null : round(last.kaopen, 2),
    kaOpen: last.kaOpen === null ? null : round(last.kaOpen, 2),
    ...(before && before.kaOpen !== null && last.kaOpen !== null ? { change5y: round(last.kaOpen - before.kaOpen, 2) } : {}),
    lessOpenPct,
    countriesThatYear: peers.length,
  };
}

const ABOUT_SCALED =
  'Chinn-Ito index scaled by its authors from 0 (least open capital account) to 1 (most open). Openness in law, from the IMF AREAER, not how much capital actually moves. Cite: ' + CHINN_ITO_CITATION;
const ABOUT_RAW =
  'Chinn-Ito index as published (KAOPEN): the first principal component of four AREAER measures; higher is more open. In 2023 it ran from about -1.9 (least open) to 2.3 (most open). Cite: ' + CHINN_ITO_CITATION;

/** The two yearly series for a country's History & data and the data API; Missing with the reason otherwise. */
export function chinnItoSeries(iso3: string, t: ChinnItoTable | null | undefined, missing?: string): Array<Series | SeriesMissing> {
  const defs = [
    { id: 'capital_openness', label: 'Capital account openness (Chinn-Ito, 0 to 1)', unit: 'index, 0 to 1', col: 'kaOpen' as const, about: ABOUT_SCALED },
    { id: 'capital_openness_raw', label: 'Capital account openness (Chinn-Ito KAOPEN)', unit: 'index', col: 'kaopen' as const, about: ABOUT_RAW },
  ];
  const rows = t?.countries[String(iso3 || '').toUpperCase()];
  return defs.map((d) => {
    if (!t) return { id: d.id, label: d.label, reason: missing || 'Chinn-Ito file not saved yet (the daily download fetches it, or npm run chinn-ito:pull)' };
    if (!rows) return { id: d.id, label: d.label, reason: `Not in the Chinn-Ito file (${t.firstYear}-${t.lastYear})` };
    const points = rows.filter((r) => r[d.col] !== null).map((r) => ({ date: String(r.year), value: r[d.col]! }));
    if (!points.length) return { id: d.id, label: d.label, reason: 'The Chinn-Ito file has no values for this country' };
    return { id: d.id, label: d.label, unit: d.unit, freq: 'annual' as const, source: `${CHINN_ITO_SOURCE}${t.file ? `, ${t.file}` : ''}`, ...(t.saved ? { pulledAt: t.saved } : {}), points, about: d.about };
  });
}
