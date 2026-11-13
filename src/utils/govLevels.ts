/**
 * Revenue and spending by level of government (data batch G42, step 1): how much of the state's
 * money is raised and spent by central government, state or regional governments, local
 * governments and social security funds, each as % of GDP.
 *
 * - Eurostat gov_10a_main (no key), EU members: sectors S1311 central, S1312 state, S1313 local,
 *   S1314 social security funds and S13 general government; total revenue (TR) and total
 *   expenditure (TE), % of GDP (PC_GDP). Used first where it has the year.
 * - IMF Government Finance Statistics, main aggregates and balances, read through DBnomics (no key):
 *   IMF/GFSMAB/A.{ISO2}.{sector}.XDC_R_B1GQ.{G1 revenue | G2M expenditure}, the same key layout as
 *   the COFOG table the app already reads (src/utils/govSpending.ts). The GFSMAB codes cannot be
 *   checked from this project's cloud session; `npm run check:data` row imf_gov_levels confirms
 *   them and reports how many catalogue countries publish state or local figures, which decides
 *   whether the per-state screen (step 2) is built.
 *
 * The figures for each level are unconsolidated: money one level passes to another (grants to
 * states, for example) is counted at both, so the levels add up to more than general government.
 * The share of sub-national government is worked out from the sum of the levels and labelled so.
 * Only published values; a level neither table has stays absent. Browser-safe.
 */

export type GovLevel = 'central' | 'state' | 'local' | 'social' | 'general';
export const LEVEL_SECTOR: Record<GovLevel, string> = { central: 'S1311', state: 'S1312', local: 'S1313', social: 'S1314', general: 'S13' };
export const LEVELS: GovLevel[] = ['central', 'state', 'local', 'social', 'general'];
export const LEVEL_WORD: Record<GovLevel, string> = { central: 'central', state: 'state', local: 'local', social: 'social security', general: 'general government' };

export type LevelMeasure = 'revenue' | 'spending';
export type LevelTable = 'eurostat' | 'imf';
export const LEVEL_TABLE_LABEL: Record<LevelTable, string> = {
  eurostat: 'Eurostat government finance statistics by sub-sector (gov_10a_main)',
  imf: 'IMF Government Finance Statistics, main aggregates by sub-sector (GFSMAB, via DBnomics)',
};

export interface LevelFigures {
  year: string;
  table: LevelTable;
  /** % of GDP by level; a level the table does not publish for that year is absent. */
  pct: Partial<Record<GovLevel, number>>;
}

export interface GovLevelsReading {
  revenue?: LevelFigures;
  spending?: LevelFigures;
}

export interface GovLevelsPull {
  pulledAt: string;
  countries: Record<string, GovLevelsReading>;
}

// --- Eurostat ---

export function eurostatLevelsUrl(geos: string[], sinceYear: number): string {
  const q = [
    ...geos.map((g) => `geo=${g}`),
    ...LEVELS.map((l) => `sector=${LEVEL_SECTOR[l]}`),
    'na_item=TR',
    'na_item=TE',
    'unit=PC_GDP',
    `sinceTimePeriod=${sinceYear}`,
    'format=JSON',
  ];
  return `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_main?${q.join('&')}`;
}

type Cells = Record<string, Record<LevelMeasure, Record<string, Partial<Record<GovLevel, number>>>>>;

const SECTOR_LEVEL: Record<string, GovLevel> = Object.fromEntries(LEVELS.map((l) => [LEVEL_SECTOR[l], l]));

function add(cells: Cells, iso3: string, m: LevelMeasure, year: string, level: GovLevel, v: number) {
  const c = (cells[iso3] ||= { revenue: {}, spending: {} });
  (c[m][year] ||= {})[level] = Number(v.toFixed(2));
}

/** For each measure, the newest year with central government and at least one other level. */
function latest(cells: Cells, table: LevelTable): Record<string, GovLevelsReading> {
  const out: Record<string, GovLevelsReading> = {};
  for (const [iso3, c] of Object.entries(cells)) {
    for (const m of ['revenue', 'spending'] as LevelMeasure[]) {
      const year = Object.keys(c[m])
        .sort()
        .reverse()
        .find((y) => c[m][y].central !== undefined && Object.keys(c[m][y]).length >= 2);
      if (year) (out[iso3] ||= {})[m] = { year, table, pct: c[m][year] };
    }
  }
  return out;
}

/** Eurostat JSON-stat reply -> latest figures per country. */
export function parseEurostatLevels(reply: unknown, geoToIso3: Record<string, string>): Record<string, GovLevelsReading> {
  const j = reply as { id?: string[]; size?: number[]; value?: Record<string, number>; dimension?: Record<string, { category?: { index?: Record<string, number> } }> };
  if (!Array.isArray(j?.id) || !Array.isArray(j.size) || !j.value || !j.dimension) return {};
  const ids = j.id;
  const size = j.size;
  const index = ids.map((id) => {
    const byPos: string[] = [];
    for (const [k, v] of Object.entries(j.dimension![id]?.category?.index || {})) byPos[v] = k;
    return byPos;
  });
  const at = (name: string) => ids.indexOf(name);
  const [gi, si, ni, ti] = [at('geo'), at('sector'), at('na_item'), at('time')];
  if ([gi, si, ni, ti].some((x) => x < 0)) return {};
  const cells: Cells = {};
  for (const [flat, v] of Object.entries(j.value)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    let rest = Number(flat);
    const pos: number[] = new Array(ids.length);
    for (let d = ids.length - 1; d >= 0; d--) {
      pos[d] = rest % size[d];
      rest = Math.floor(rest / size[d]);
    }
    const iso3 = geoToIso3[index[gi][pos[gi]]];
    const level = SECTOR_LEVEL[index[si][pos[si]]];
    const item = index[ni][pos[ni]];
    const m: LevelMeasure | undefined = item === 'TR' ? 'revenue' : item === 'TE' ? 'spending' : undefined;
    const year = index[ti][pos[ti]];
    if (iso3 && level && m && /^\d{4}$/.test(year)) add(cells, iso3, m, year, level, v);
  }
  return latest(cells, 'eurostat');
}

// --- IMF GFS through DBnomics ---

const IMF_ITEM: Record<LevelMeasure, string> = { revenue: 'G1', spending: 'G2M' };
export const imfLevelSeriesId = (iso2: string, level: GovLevel, m: LevelMeasure) => `IMF/GFSMAB/A.${iso2}.${LEVEL_SECTOR[level]}.XDC_R_B1GQ.${IMF_ITEM[m]}`;
export function imfLevelIds(iso2s: string[]): string[] {
  return iso2s.flatMap((iso2) => LEVELS.flatMap((l) => (['revenue', 'spending'] as LevelMeasure[]).map((m) => imfLevelSeriesId(iso2, l, m))));
}
export function dbnomicsLevelsUrl(ids: string[]): string {
  return `https://api.db.nomics.world/v22/series?series_ids=${ids.map(encodeURIComponent).join(',')}&observations=1&limit=${ids.length}`;
}

/**
 * Every GFSMAB series DBnomics holds for one country and level, without figures: used when none of
 * the series the app asks for came back, to show which codes the dataset really uses.
 */
export function dbnomicsGfsListUrl(iso2: string, level: GovLevel = 'central'): string {
  const dims = encodeURIComponent(JSON.stringify({ REF_AREA: [iso2], REF_SECTOR: [LEVEL_SECTOR[level]] }));
  return `https://api.db.nomics.world/v22/series/IMF/GFSMAB?dimensions=${dims}&observations=0&limit=200`;
}

/** Up to `n` "code (name)" pairs from a DBnomics series list, revenue and expenditure first. */
export function gfsCodeSample(reply: unknown, n = 6): string[] {
  const docs = (reply as { series?: { docs?: Array<{ series_code?: unknown; series_name?: unknown }> } })?.series?.docs;
  if (!Array.isArray(docs)) return [];
  const rank = (name: string) => (/revenue|expenditure|expense/i.test(name) ? 0 : 1);
  return docs
    .map((d) => ({ code: String(d?.series_code || ''), name: String(d?.series_name || '') }))
    .filter((d) => d.code)
    .sort((a, b) => rank(a.name) - rank(b.name))
    .slice(0, n)
    .map((d) => (d.name ? `${d.code} (${d.name})` : d.code));
}

/** DBnomics series reply -> latest figures per country (a share under 0.001% of GDP is a scale error and dropped). */
export function parseDbnomicsLevels(reply: unknown, iso2ToIso3: Record<string, string>): Record<string, GovLevelsReading> {
  const docs = (reply as { series?: { docs?: unknown[] } })?.series?.docs;
  if (!Array.isArray(docs)) return {};
  const cells: Cells = {};
  for (const doc of docs as Array<{ series_code?: unknown; period?: unknown[]; value?: unknown[] }>) {
    const x = /^A\.([A-Z0-9]{2})\.(S13\d{0,2})\.XDC_R_B1GQ\.(G1|G2M)$/.exec(String(doc?.series_code || ''));
    const iso3 = x && iso2ToIso3[x[1]];
    const level = x && SECTOR_LEVEL[x[2]];
    if (!x || !iso3 || !level || !Array.isArray(doc.period) || !Array.isArray(doc.value)) continue;
    const m: LevelMeasure = x[3] === 'G1' ? 'revenue' : 'spending';
    doc.period.forEach((p, k) => {
      const v = doc.value![k];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0.001 && /^\d{4}$/.test(String(p))) add(cells, iso3, m, String(p), level, v);
    });
  }
  return latest(cells, 'imf');
}

/** Per measure, the newer of the two tables; Eurostat on a tie (the IMF copies it for the EU). */
export function mergeLevels(eurostat: Record<string, GovLevelsReading>, imf: Record<string, GovLevelsReading>): Record<string, GovLevelsReading> {
  const out: Record<string, GovLevelsReading> = {};
  for (const iso3 of new Set([...Object.keys(eurostat), ...Object.keys(imf)])) {
    for (const m of ['revenue', 'spending'] as LevelMeasure[]) {
      const a = eurostat[iso3]?.[m];
      const b = imf[iso3]?.[m];
      const pick = !b || (a && a.year >= b.year) ? a : b;
      if (pick) (out[iso3] ||= {})[m] = pick;
    }
  }
  return out;
}

// --- Words ---

/** Share of state and local government in the sum of the levels published (unconsolidated), %. */
export function subNationalShare(f: LevelFigures): number | undefined {
  const parts: GovLevel[] = ['central', 'state', 'local', 'social'];
  const sum = parts.reduce((t, l) => t + (f.pct[l] ?? 0), 0);
  if (f.pct.state === undefined && f.pct.local === undefined) return undefined;
  return sum > 0 ? Number(((((f.pct.state ?? 0) + (f.pct.local ?? 0)) / sum) * 100).toFixed(0)) : undefined;
}

/** "central 18.0%, state 9.5%, local 4.1%, social security 7.2% of GDP (2023); state and local 31% of the levels' total". */
export function levelsValue(f: LevelFigures): string {
  const parts = (['central', 'state', 'local', 'social'] as GovLevel[]).filter((l) => f.pct[l] !== undefined).map((l) => `${LEVEL_WORD[l]} ${f.pct[l]!.toFixed(1)}%`);
  const share = subNationalShare(f);
  return `${parts.join(', ')} of GDP (${f.year})${share !== undefined ? `; state and local ${share}% of the levels' total` : ''}`;
}

export const LEVEL_LABEL: Record<LevelMeasure, string> = { spending: 'Spending by level of government', revenue: 'Revenue by level of government' };

export const LEVELS_NOTE = 'each level counted before transfers between levels are netted out';
export const GOV_LEVELS_SETUP_HELP =
  'Revenue and spending by level of government come from Eurostat (EU members) and the IMF Government Finance Statistics (read through DBnomics), which the daily run downloads (npm run go -- daily, or Menu > Offline data > Download all country data). They have not been downloaded yet, or the download did not answer.';
export const GOV_LEVELS_NOT_COVERED_HELP =
  'Neither Eurostat nor the IMF Government Finance Statistics publish figures by level of government for this country, or none with central government and another level for the same year. The app shows Missing rather than an estimate.';
export const GOV_LEVELS_CENTRAL_ONLY_HELP =
  'The figures published for this country cover central government and social security only, with no state or local government figures, so the share of spending or revenue below central government cannot be shown. Many countries publish only central government figures to the IMF. The app shows Missing rather than an estimate.';
