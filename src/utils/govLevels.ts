/**
 * Revenue and spending by level of government (data batch G42, step 1): how much of the state's
 * money is raised and spent by central government, state or regional governments, local
 * governments and social security funds, each as % of GDP.
 *
 * - Eurostat gov_10a_main (no key), EU members: sectors S1311 central, S1312 state, S1313 local,
 *   S1314 social security funds and S13 general government; total revenue (TR) and total
 *   expenditure (TE), % of GDP (PC_GDP). Used first where it has the year.
 * - IMF Government Finance Statistics, main aggregates and balances, read through DBnomics (no key):
 *   IMF/GFSMAB/A.{ISO2}.{sector}.{unit}.{item}, where item is G1__Z (revenue) or G2M__Z
 *   (expenditure) and unit is the % of GDP unit. DBnomics lists Brazil's central government series
 *   as A.BR.S1311.XDC.G1__Z (domestic currency); the % of GDP unit code is not confirmed, so when
 *   none of the series asked for come back the app reads the dataset's own list of codes and labels
 *   (DBNOMICS_GFSMAB_URL) and picks the unit labelled as a percent of GDP and the item labelled
 *   Expenditure. IMF_GFS_UNIT in .env sets the unit by hand. `npm run check:data` row
 *   imf_gov_levels prints the codes it found.
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

/** The unit and item codes of the GFSMAB series the app asks for. */
export interface GfsCodes {
  unit: string;
  revenue: string;
  spending: string;
}
export const GFS_UNIT_ENV = 'IMF_GFS_UNIT';
export const GFS_DEFAULT: GfsCodes = { unit: 'XDC_R_B1GQ', revenue: 'G1__Z', spending: 'G2M__Z' };
/** DBnomics' description of the GFSMAB dataset: every dimension with its codes and labels. */
export const DBNOMICS_GFSMAB_URL = 'https://api.db.nomics.world/v22/datasets/IMF/GFSMAB';

export const imfLevelSeriesId = (iso2: string, level: GovLevel, m: LevelMeasure, codes: GfsCodes = GFS_DEFAULT) => `IMF/GFSMAB/A.${iso2}.${LEVEL_SECTOR[level]}.${codes.unit}.${codes[m]}`;
export function imfLevelIds(iso2s: string[], codes: GfsCodes = GFS_DEFAULT): string[] {
  return iso2s.flatMap((iso2) => LEVELS.flatMap((l) => (['revenue', 'spending'] as LevelMeasure[]).map((m) => imfLevelSeriesId(iso2, l, m, codes))));
}

/** Codes and labels of each dimension in a DBnomics dataset reply (labels given as an object or as [code, label] pairs). */
export function datasetDimensions(reply: unknown): Record<string, Record<string, string>> {
  const doc = (reply as { datasets?: { docs?: unknown[] } })?.datasets?.docs?.[0] ?? (reply as { dataset?: unknown })?.dataset;
  const raw = (doc as { dimensions_values_labels?: Record<string, unknown> } | undefined)?.dimensions_values_labels;
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, Record<string, string>> = {};
  for (const [dim, v] of Object.entries(raw)) {
    const pairs: Array<[string, string]> = Array.isArray(v)
      ? v.filter((x) => Array.isArray(x) && x.length >= 2).map((x) => [String(x[0]), String(x[1])])
      : v && typeof v === 'object'
        ? Object.entries(v as Record<string, unknown>).map(([k, l]) => [k, String(l)])
        : [];
    if (pairs.length) out[dim] = Object.fromEntries(pairs);
  }
  return out;
}

const PCT_GDP = /(percent|per cent|%)[^,;]*\bGDP\b/i;

/**
 * From the GFSMAB dataset description: the unit labelled as a percent of GDP, and the revenue and
 * expenditure items (G1__Z and G2M__Z, or the items labelled Revenue and Expenditure). Also every
 * unit code with its label, for the connection check. A code it cannot find stays absent.
 */
export function pickGfsCodes(reply: unknown): { codes: Partial<GfsCodes>; units: string[] } {
  const dims = datasetDimensions(reply);
  const entries = Object.values(dims);
  const unitDim = entries.find((d) => Object.keys(d).includes('XDC')) || entries.find((d) => Object.values(d).some((l) => PCT_GDP.test(l)));
  const itemDim = entries.find((d) => Object.keys(d).some((k) => /^G1(__Z)?$/.test(k)));
  const codes: Partial<GfsCodes> = {};
  const unit = unitDim && Object.entries(unitDim).find(([, l]) => PCT_GDP.test(l) && !/change/i.test(l));
  if (unit) codes.unit = unit[0];
  const item = (code: RegExp, label: RegExp) => itemDim && (Object.keys(itemDim).find((k) => code.test(k)) || Object.entries(itemDim).find(([, l]) => label.test(l.trim()))?.[0]);
  const rev = item(/^G1(__Z)?$/, /^(total )?revenue$/i);
  const spend = item(/^G2M(__Z)?$/, /^(total )?expenditure$/i);
  if (rev) codes.revenue = rev;
  if (spend) codes.spending = spend;
  const units = unitDim ? Object.entries(unitDim).map(([k, l]) => `${k} (${l})`) : [];
  return { codes, units };
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

/** Up to `n` "code (name)" pairs from a DBnomics series list, totals first. */
export function gfsCodeSample(reply: unknown, n = 6): string[] {
  const docs = (reply as { series?: { docs?: Array<{ series_code?: unknown; series_name?: unknown }> } })?.series?.docs;
  if (!Array.isArray(docs)) return [];
  // Totals first (revenue, expense, expenditure), then other revenue and expense lines.
  const rank = (d: { code: string; name: string }) => (/\.G(1|2|2M)(__Z)?$/.test(d.code) || /expenditure/i.test(d.name) ? 0 : /revenue|expense/i.test(d.name) ? 1 : 2);
  return docs
    .map((d) => ({ code: String(d?.series_code || ''), name: String(d?.series_name || '') }))
    .filter((d) => d.code)
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, n)
    .map((d) => (d.name ? `${d.code} (${d.name})` : d.code));
}

/** DBnomics series reply -> latest figures per country (a share under 0.001% of GDP is a scale error and dropped). */
export function parseDbnomicsLevels(reply: unknown, iso2ToIso3: Record<string, string>, codes: GfsCodes = GFS_DEFAULT): Record<string, GovLevelsReading> {
  const docs = (reply as { series?: { docs?: unknown[] } })?.series?.docs;
  if (!Array.isArray(docs)) return {};
  const cells: Cells = {};
  for (const doc of docs as Array<{ series_code?: unknown; period?: unknown[]; value?: unknown[] }>) {
    const x = /^A\.([A-Z0-9]{2})\.(S13\d{0,2})\.([A-Z0-9_]+)\.([A-Z0-9_]+)$/.exec(String(doc?.series_code || ''));
    const iso3 = x && iso2ToIso3[x[1]];
    const level = x && SECTOR_LEVEL[x[2]];
    const m: LevelMeasure | undefined = x?.[4] === codes.revenue ? 'revenue' : x?.[4] === codes.spending ? 'spending' : undefined;
    // Only the % of GDP unit: a domestic-currency series would be read as a share otherwise.
    if (!x || !iso3 || !level || !m || x[3] !== codes.unit || !Array.isArray(doc.period) || !Array.isArray(doc.value)) continue;
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
