/**
 * What this means for you (plan step PY1): consumer price groups from the IMF CPI dataset, for
 * countries Eurostat does not cover. As with the IMF headline CPI (src/utils/imfCpi.ts) the
 * dataset's codes cannot be checked from the cloud, so nothing is hard-coded: in the dataset's own
 * structure the app looks for the dimension whose code names are the COICOP main groups ("Food and
 * non-alcoholic beverages", "Transport" and so on), picks one code per group by name, and asks for
 * the monthly year-over-year series of each. Weights are read when the dataset has a code whose name
 * says weight; otherwise they read Missing.
 *
 * Off until a check on Sam's Mac shows the matching is right: the app reads these groups only when
 * IMF_CPI_GROUPS=on is set in .env. `npm run check:imf` prints what matched.
 */
import { getJson, normalizePeriod, parseImfData, type ImfFetch, type ImfSeries } from './imfReserves';
import { imfCpiDataUrl, imfCpiStructureUrl, parseImfCpiStructure, type ImfCpiStructure } from './imfCpi';
import { ECOICOP, GROUP_MONTHS, GROUPS_METHOD, type PriceGroup, type PriceGroupsOutcome } from './priceGroups';
import type { MonthValue } from './inflationDrivers';

export const IMF_GROUPS_ENV = 'IMF_CPI_GROUPS';
export const imfGroupsOn = (env: Record<string, string | undefined>) => /^(on|1|true|yes)$/i.test(String(env[IMF_GROUPS_ENV] ?? '').trim());

const COUNTRY = /^(COUNTRY|REF_AREA|JURISDICTION|ECONOMY)$/;
const FREQ = /^(FREQUENCY|FREQ)$/;
const CPI = /^consumer price index\b|\(CPI\)/i;
const YOY = /year[- ]over[- ]year|year[- ]on[- ]year|corresponding period (of the )?previous year/i;
const WEIGHT = /\bweights?\b/i;
const AVOID = /harmoni[sz]ed|contribution|(?<!not |non-)seasonally adjusted|month[- ]over[- ]month|previous period/i;

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
/** The first two words of a COICOP group name that are not "and": enough to tell the groups apart. */
const keyWords = (s: string) =>
  norm(s)
    .split(' ')
    .filter((w) => w !== 'and')
    .slice(0, 2)
    .join(' ');

export interface ImfGroupMatch {
  /** Dimension the groups are in. */
  dim: string;
  /** COICOP division (CP01..CP12) -> IMF code and name. */
  codes: Record<string, { id: string; name: string }>;
}

/** The dimension and codes for the COICOP groups; null when no dimension has at least eight of them. */
export function matchImfGroups(s: ImfCpiStructure): ImfGroupMatch | null {
  let best: ImfGroupMatch | null = null;
  for (const d of s.dims) {
    if (COUNTRY.test(d.id) || FREQ.test(d.id)) continue;
    const codes: ImfGroupMatch['codes'] = {};
    for (const [cp, name] of Object.entries(ECOICOP)) {
      const want = keyWords(name);
      const hit = d.codes.filter((c) => keyWords(c.name) === want && !AVOID.test(c.name)).sort((a, b) => a.name.length - b.name.length)[0];
      if (hit) codes[cp] = { id: hit.id, name: hit.name };
    }
    if (Object.keys(codes).length >= 8 && (!best || Object.keys(codes).length > Object.keys(best.codes).length)) best = { dim: d.id, codes };
  }
  return best;
}

/** The data key: the country, monthly, the CPI index, the group codes joined with +, and the transformation picked by `kind`. */
export function imfGroupsKey(s: ImfCpiStructure, m: ImfGroupMatch, iso3: string, kind: 'yoy' | 'weight'): { key: string; ok: boolean } {
  let ok = false;
  const key = s.dims
    .map((d) => {
      if (COUNTRY.test(d.id)) return iso3;
      if (FREQ.test(d.id)) return kind === 'yoy' ? 'M' : '*';
      if (d.id === m.dim) return Object.values(m.codes).map((c) => c.id).join('+');
      const want = kind === 'yoy' ? YOY : WEIGHT;
      const t = d.codes.filter((c) => want.test(c.name) && !AVOID.test(c.name)).sort((a, b) => a.name.length - b.name.length)[0];
      if (t) {
        ok = true;
        return t.id;
      }
      const cpi = d.codes.filter((c) => CPI.test(c.name) && !AVOID.test(c.name) && !WEIGHT.test(c.name)).sort((a, b) => a.name.length - b.name.length)[0];
      return cpi ? cpi.id : '*';
    })
    .join('.');
  return { key, ok };
}

const monthsOf = (s: ImfSeries): MonthValue[] =>
  s.obs
    .map((o) => ({ period: normalizePeriod(o.period), value: Math.round(o.value * 100) / 100 }))
    .filter((p) => /^\d{4}-\d{2}$/.test(p.period) && Number.isFinite(p.value))
    .slice(-GROUP_MONTHS);

/** One monthly y/y series per group from the data reply (shortest label wins when several fit). */
export function imfGroupSeries(series: ImfSeries[], m: ImfGroupMatch): Record<string, ImfSeries> {
  const out: Record<string, ImfSeries> = {};
  for (const [cp, c] of Object.entries(m.codes)) {
    const fit = series
      .filter((s) => s.dims[m.dim]?.id === c.id && s.obs.some((o) => /^\d{4}-\d{2}$/.test(normalizePeriod(o.period))))
      .filter((s) => !Object.values(s.dims).some((d) => AVOID.test(d.name) || WEIGHT.test(d.name)))
      .sort((a, b) => a.key.length - b.key.length)[0];
    if (fit) out[cp] = fit;
  }
  return out;
}

/** The newest year with a weight for every group found, as % of the basket (the IMF's sum taken as the whole). */
export function imfGroupWeights(series: ImfSeries[], m: ImfGroupMatch, cps: string[], year: number): { year: string; pct: Record<string, number> } | null {
  const by: Record<string, Record<string, number>> = {};
  for (const [cp, c] of Object.entries(m.codes)) {
    const s = series.find((x) => x.dims[m.dim]?.id === c.id);
    for (const o of s?.obs || []) {
      const y = normalizePeriod(o.period).slice(0, 4);
      if (/^\d{4}$/.test(y) && Number.isFinite(o.value)) (by[cp] ||= {})[y] = o.value;
    }
  }
  const years = [...new Set(cps.flatMap((cp) => Object.keys(by[cp] || {})))].filter((y) => Number(y) <= year).sort().reverse();
  for (const y of years) {
    if (!cps.every((cp) => by[cp]?.[y] !== undefined)) continue;
    const total = cps.reduce((a, cp) => a + by[cp][y], 0);
    if (!(total > 0)) continue;
    return { year: y, pct: Object.fromEntries(cps.map((cp) => [cp, Math.round((by[cp][y] / total) * 10000) / 100])) };
  }
  return null;
}

export interface ImfGroupsPull {
  outcome: PriceGroupsOutcome;
  /** What matched, for `npm run check:imf`. */
  note: string;
  structure: ImfCpiStructure | null;
}

/** One country's groups, with the headline series given (the app's saved IMF CPI copy). */
export async function pullImfGroups(
  opts: { fetchFn: ImfFetch; timeoutMs?: number; structure?: ImfCpiStructure | null; headline: MonthValue[]; headlineLabel?: string },
  iso3: string
): Promise<ImfGroupsPull> {
  const t = opts.timeoutMs ?? 30000;
  let structure = opts.structure ?? null;
  if (!structure) {
    const r = await getJson(opts.fetchFn, imfCpiStructureUrl(), t);
    structure = r.json ? parseImfCpiStructure(r.json) : null;
    if (!structure) return { structure: null, note: `IMF CPI structure: ${r.error ?? 'no dimensions the app could read'}`, outcome: { ok: false, reason: 'The IMF consumer price dataset did not answer with a structure the app could read.' } };
  }
  const m = matchImfGroups(structure);
  if (!m) return { structure, note: 'No dimension of the IMF CPI dataset names at least eight COICOP groups.', outcome: { ok: false, reason: 'The IMF consumer price dataset has no consumer price groups the app could match by name.' } };
  const matched = Object.entries(m.codes).map(([cp, c]) => `${cp}=${c.id} ("${c.name}")`).join(', ');
  const yk = imfGroupsKey(structure, m, iso3, 'yoy');
  const d = await getJson(opts.fetchFn, imfCpiDataUrl(yk.key), t);
  const bySeries = d.json ? imfGroupSeries(parseImfData(d.json), m) : {};
  const cps = Object.keys(ECOICOP).filter((cp) => bySeries[cp]);
  if (!cps.length || !opts.headline.length) {
    return { structure, note: `${m.dim}: ${matched}; key ${yk.key}: ${d.error ?? 'no monthly year-over-year series per group'}`, outcome: { ok: false, reason: `The IMF consumer price dataset sent no monthly figures by group for ${iso3}.` } };
  }
  const missing: string[] = [];
  for (const cp of Object.keys(ECOICOP)) if (!bySeries[cp]) missing.push(`${ECOICOP[cp]}: the IMF sent no figures for this group`);
  const lastYear = Number(opts.headline[opts.headline.length - 1].period.slice(0, 4));
  const wk = imfGroupsKey(structure, m, iso3, 'weight');
  let w: { year: string; pct: Record<string, number> } | null = null;
  if (wk.ok) {
    const wr = await getJson(opts.fetchFn, imfCpiDataUrl(wk.key), t);
    if (wr.json) w = imfGroupWeights(parseImfData(wr.json), m, cps, lastYear);
  }
  if (!w) missing.push('Official weights: the IMF dataset sent no weights for these groups, so the split starts empty and is yours to enter');
  const groups: PriceGroup[] = cps.map((cp) => ({ id: cp, label: m.codes[cp].name, rates: monthsOf(bySeries[cp]), ...(w ? { weightPct: w.pct[cp] } : {}) }));
  return {
    structure,
    note: `${m.dim}: ${matched}; ${cps.length} groups with monthly figures (key ${yk.key}); weights ${w ? `for ${w.year} (key ${wk.key})` : 'none'}`,
    outcome: {
      ok: true,
      iso3,
      source: 'imf',
      classification: 'imf',
      headline: opts.headline.slice(-GROUP_MONTHS),
      groups,
      ...(w ? { weightsYear: w.year, weightsSource: `IMF CPI dataset weights, ${w.year}` } : {}),
      missing,
      sources: [`IMF Consumer Price Index (CPI dataset) by group, y/y (key ${yk.key})`, ...(opts.headlineLabel ? [opts.headlineLabel] : []), ...(w ? [`IMF CPI dataset weights, ${w.year}`] : [])],
      method: GROUPS_METHOD.imf,
    },
  };
}
