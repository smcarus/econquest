/**
 * Exchange rate regime (Group B, PB1): the Ilzetzki, Reinhart and Rogoff (IRR) classification of
 * each country's exchange rate arrangement by month, which says how the currency is run in fact,
 * not only what the central bank announces: pegged, crawling, managed, floating, or freely falling.
 *
 * Read from the authors' monthly workbook (ERA_Classification_Monthly_1940-2025.xlsx, or an earlier
 * edition) that the user downloads from www.ilzetzki.com/irr-data and saves in data/local/irr/.
 * The authors ask to be cited and state no licence, so the app ships nothing from the file and never
 * re-publishes it. Nothing is fetched.
 *
 * The file's layout is found, not assumed: a header row of country names (or a code column), and a
 * column of months (an Excel date, "1946M01", "1946-01", "Jan 1946"), with countries across or down.
 * Values are the fine codes 1 to 15; the coarse codes 1 to 6 follow the authors' grouping (fine 1-4
 * = 1, 5-8 = 2, 9-12 = 3, 13 = 4, 14 = 5, 15 = 6). A file that holds only coarse codes (none above 6)
 * is read as coarse.
 *
 * Cite: Ilzetzki, Reinhart and Rogoff (2019), "Exchange Arrangements Entering the 21st Century:
 * Which Anchor Will Hold?", Quarterly Journal of Economics 134(2), 599-646; and (2021),
 * "Rethinking Exchange Rate Regimes", Handbook of International Economics, vol. 5.
 *
 * Description, not a tested signal. Browser-safe, pure.
 */
import type { Series, SeriesMissing } from './seriesHistory';

export const IRR_PAGE = 'https://www.ilzetzki.com/irr-data';
export const IRR_SOURCE = 'Ilzetzki, Reinhart and Rogoff exchange rate arrangement classification';
export const IRR_CITATION =
  'Ilzetzki, Ethan, Carmen M. Reinhart and Kenneth S. Rogoff (2019), "Exchange Arrangements Entering the 21st Century: Which Anchor Will Hold?", Quarterly Journal of Economics 134(2), 599-646; and (2021), "Rethinking Exchange Rate Regimes", Handbook of International Economics, vol. 5.';

/** Fine codes 1 to 15, as the authors name them. */
export const FINE_NAME: Record<number, string> = {
  1: 'No separate legal tender or currency union',
  2: 'Pre-announced peg or currency board',
  3: 'Pre-announced horizontal band of +/-2% or narrower',
  4: 'De facto peg',
  5: 'Pre-announced crawling peg; de facto moving band of +/-1% or narrower',
  6: 'Pre-announced crawling band of +/-2% or narrower, or de facto horizontal band of +/-2% or narrower',
  7: 'De facto crawling peg',
  8: 'De facto crawling band of +/-2% or narrower',
  9: 'Pre-announced crawling band wider than +/-2%',
  10: 'De facto crawling band of +/-5% or narrower',
  11: 'Moving band of +/-2% or narrower (both ways over time)',
  12: 'De facto moving band of +/-5%, or managed floating',
  13: 'Freely floating',
  14: 'Freely falling',
  15: 'Dual market with no parallel market data',
};

/** Coarse codes 1 to 6. */
export const COARSE_NAME: Record<number, string> = {
  1: 'Peg (no own currency, currency board, peg or narrow band)',
  2: 'Crawling peg or narrow crawling band',
  3: 'Managed floating or wide band',
  4: 'Freely floating',
  5: 'Freely falling',
  6: 'Dual market with no parallel market data',
};

export const coarseOf = (fine: number): number => (fine <= 4 ? 1 : fine <= 8 ? 2 : fine <= 12 ? 3 : fine === 13 ? 4 : fine === 14 ? 5 : 6);

export interface FxRegimeTable {
  /** ISO alpha-3 -> month (YYYY-MM) -> code. */
  countries: Record<string, Record<string, number>>;
  /** True when the file holds fine codes (1-15); false when only coarse codes (1-6). */
  fine: boolean;
  firstMonth: string;
  lastMonth: string;
  /** Column or row names that did not match a country. */
  unmatched: string[];
  file?: string;
  saved?: string;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** A month cell to YYYY-MM, or null. */
export function monthOf(cell: unknown): string | null {
  const t = String(cell ?? '').trim();
  if (!t) return null;
  const pad = (y: number, m: number) => (y >= 1900 && y <= 2200 && m >= 1 && m <= 12 ? `${y}-${String(m).padStart(2, '0')}` : null);
  let m = /^(\d{4})\s*[Mm.\-/ ]\s*(\d{1,2})(?:[-/]\d{1,2})?(?:[ T].*)?$/.exec(t);
  if (m) return pad(Number(m[1]), Number(m[2]));
  m = /^(\d{1,2})[-/](\d{4})$/.exec(t);
  if (m) return pad(Number(m[2]), Number(m[1]));
  m = /^([A-Za-z]{3})[a-z]*[\s\-.']*(\d{2}|\d{4})$/.exec(t);
  if (m && MONTHS[m[1].toLowerCase()]) {
    const y = Number(m[2]);
    return pad(m[2].length === 2 ? (y >= 40 ? 1900 + y : 2000 + y) : y, MONTHS[m[1].toLowerCase()]);
  }
  // An Excel date serial (days since 1899-12-30), as a date column reads without formatting.
  if (/^\d{5}(\.\d+)?$/.test(t)) {
    const n = Number(t);
    if (n > 14000 && n < 110000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000);
      return pad(d.getUTCFullYear(), d.getUTCMonth() + 1);
    }
  }
  return null;
}

const codeOf = (cell: unknown): number | null => {
  const t = String(cell ?? '').trim();
  if (!/^\d+(\.0+)?$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= 15 ? n : null;
};

/** Country cell to ISO3: a three-letter code that is a known code, or a name in the index. */
function countryOf(cell: unknown, names: Record<string, string>, codes: Set<string>, key: (s: string) => string): string | null {
  const t = String(cell ?? '').trim();
  if (!t) return null;
  if (/^[A-Z]{3}$/.test(t) && codes.has(t)) return t;
  return names[key(t)] ?? null;
}

/**
 * Rows of one worksheet to the table. Tries countries across (header row of names, months down the
 * first column that has them) and countries down (months across a header row). A reason when
 * neither layout is found.
 */
export function parseFxRegimeRows(rows: string[][], names: Record<string, string>, key: (s: string) => string): FxRegimeTable | { reason: string } {
  const codes = new Set(Object.values(names));
  const tryAcross = (m: string[][]): FxRegimeTable | null => {
    // Header: the first row in the top 15 where at least 10 cells name a country.
    let hi = -1;
    for (let i = 0; i < Math.min(m.length, 15); i++) if ((m[i] || []).filter((c) => countryOf(c, names, codes, key)).length >= 10) { hi = i; break; }
    if (hi < 0) return null;
    const head = m[hi]!;
    const body = m.slice(hi + 1);
    // Month column: the first column where most body cells read as months.
    const width = Math.max(...body.slice(0, 50).map((r) => r.length), 0);
    let mc = -1;
    for (let c = 0; c < Math.min(width, 5); c++) {
      const sample = body.slice(0, 60).filter((r) => String(r[c] ?? '').trim());
      if (sample.length >= 3 && sample.filter((r) => monthOf(r[c])).length / sample.length > 0.8) { mc = c; break; }
    }
    if (mc < 0) return null;
    const cols = head.map((c, i) => ({ i, iso3: i === mc ? null : countryOf(c, names, codes, key), name: String(c ?? '').trim() }));
    const countries: FxRegimeTable['countries'] = {};
    for (const r of body) {
      const month = monthOf(r[mc]);
      if (!month) continue;
      for (const col of cols) {
        if (!col.iso3) continue;
        const v = codeOf(r[col.i]);
        if (v !== null) (countries[col.iso3] ||= {})[month] = v;
      }
    }
    const unmatched = cols.filter((c) => c.i !== mc && !c.iso3 && c.name && !/^(date|month|year|time|country|code)$/i.test(c.name)).map((c) => c.name);
    return finish(countries, unmatched);
  };
  const finish = (countries: FxRegimeTable['countries'], unmatched: string[]): FxRegimeTable | null => {
    const months = Object.values(countries).flatMap((c) => Object.keys(c));
    if (!months.length) return null;
    months.sort();
    const max = Math.max(...Object.values(countries).flatMap((c) => Object.values(c)));
    return { countries, fine: max > 6, firstMonth: months[0]!, lastMonth: months[months.length - 1]!, unmatched: [...new Set(unmatched)] };
  };
  const across = tryAcross(rows);
  if (across) return across;
  // Countries down the side: transpose and try again.
  const width = Math.max(...rows.map((r) => r.length), 0);
  const t: string[][] = Array.from({ length: width }, (_, c) => rows.map((r) => String(r[c] ?? '')));
  const down = tryAcross(t);
  if (down) return down;
  return { reason: 'no sheet with a row of country names and a column of months (is this the IRR exchange rate classification file?)' };
}

export interface FxRegimeReading {
  month: string;
  fine?: number;
  fineName?: string;
  coarse: number;
  coarseName: string;
  /** First month of the current spell with the same code (fine when the file has it). */
  since: string;
  /** Coarse code five years before the latest month, when on file. */
  coarse5y?: number;
}

/** The latest month for a country, with how long it has held, or Missing with the reason. */
export function fxRegimeReading(t: FxRegimeTable, iso3: string): FxRegimeReading | { missing: string } {
  const c = t.countries[String(iso3 || '').toUpperCase()];
  if (!c) return { missing: `not in the IRR file you saved (${t.firstMonth} to ${t.lastMonth})` };
  const months = Object.keys(c).sort();
  const month = months[months.length - 1]!;
  const code = c[month]!;
  const same = (m: string) => c[m] === code;
  let k = months.length - 1;
  while (k > 0 && same(months[k - 1]!)) k--;
  const coarse = t.fine ? coarseOf(code) : code;
  const back = `${Number(month.slice(0, 4)) - 5}${month.slice(4)}`;
  const b = c[back];
  return {
    month,
    ...(t.fine ? { fine: code, fineName: FINE_NAME[code] } : {}),
    coarse,
    coarseName: COARSE_NAME[coarse] ?? String(coarse),
    since: months[k]!,
    ...(b !== undefined ? { coarse5y: t.fine ? coarseOf(b) : b } : {}),
  };
}

const monthWords = (m: string) => {
  const [y, mm] = m.split('-');
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(mm) - 1]} ${y}`;
};

/** "Managed floating or wide band (IRR coarse 3; fine 12, de facto moving band ..., Mar 2025), since Jun 2016". */
export function fxRegimeValue(r: FxRegimeReading): string {
  const fine = r.fine !== undefined ? `; fine ${r.fine}, ${r.fineName}` : '';
  return `${r.coarseName} (IRR coarse ${r.coarse}${fine}, ${monthWords(r.month)}), since ${monthWords(r.since)}`;
}

export const FX_REGIME_METHOD =
  'Ilzetzki, Reinhart and Rogoff classify each currency by how it behaves in fact, using market and parallel exchange rates, not only what is announced. Fine codes 1 to 15 run from no own currency (1) through pegs, crawling pegs and bands to managed floating (12), freely floating (13), freely falling (14, a currency with 12-month inflation of 40% or more, or a crisis collapse) and dual markets with no parallel data (15). Coarse codes group them: 1 peg, 2 crawling peg or narrow band, 3 managed floating or wide band, 4 freely floating, 5 freely falling, 6 dual market. Shown as published, by month.';

export const FX_REGIME_SETUP_HELP = `Download the monthly "Exchange rate regime classification" workbook from ${IRR_PAGE} (for example ERA_Classification_Monthly_1940-2025.xlsx) and put it in data/local/irr/. The authors state no licence, so the app ships nothing from it and reads only your copy.`;

const ABOUT_COARSE =
  'Ilzetzki, Reinhart and Rogoff coarse code, by month: 1 peg, 2 crawling peg or narrow band, 3 managed floating or wide band, 4 freely floating, 5 freely falling, 6 dual market with no parallel market data. How the currency behaved in fact, not only what was announced. Cite: ' + IRR_CITATION;
const ABOUT_FINE =
  'Ilzetzki, Reinhart and Rogoff fine code, by month, 1 (no own currency) to 15: 1-4 pegs, 5-8 crawling pegs and narrow bands, 9-12 wider bands and managed floating, 13 freely floating, 14 freely falling, 15 dual market with no parallel data. Cite: ' + IRR_CITATION;

/** Monthly coarse and fine code series for History & data and the data API; Missing with the reason otherwise. */
export function fxRegimeSeries(iso3: string, t: FxRegimeTable | null | undefined, missing?: string): Array<Series | SeriesMissing> {
  const defs = [
    { id: 'fx_regime_coarse', label: 'Exchange rate regime (IRR coarse, 1 peg to 6)', unit: 'code, 1 to 6', fine: false, about: ABOUT_COARSE },
    { id: 'fx_regime_fine', label: 'Exchange rate regime (IRR fine, 1 to 15)', unit: 'code, 1 to 15', fine: true, about: ABOUT_FINE },
  ];
  const c = t?.countries[String(iso3 || '').toUpperCase()];
  return defs.map((d) => {
    if (!t) return { id: d.id, label: d.label, reason: missing || 'IRR exchange rate classification file not saved in data/local/irr/' };
    if (d.fine && !t.fine) return { id: d.id, label: d.label, reason: 'The IRR file you saved holds only coarse codes' };
    if (!c) return { id: d.id, label: d.label, reason: `Not in the IRR file you saved (${t.firstMonth} to ${t.lastMonth})` };
    const points = Object.keys(c)
      .sort()
      .map((m) => ({ date: m, value: d.fine || !t.fine ? c[m]! : coarseOf(c[m]!) }));
    return { id: d.id, label: d.label, unit: d.unit, freq: 'monthly' as const, source: `${IRR_SOURCE}${t.file ? `, ${t.file}` : ''}`, ...(t.saved ? { pulledAt: t.saved } : {}), points, about: d.about };
  });
}
