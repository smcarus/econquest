/**
 * IMF monthly consumer prices (plan G3, data plan F3): the third choice for a country's monthly
 * inflation, after its own statistics office or central bank feed and Eurostat HICP, and before
 * the OECD copy on DBnomics (which stopped updating in June 2026).
 *
 * Source: the IMF data portal's free SDMX 3.0 API (api.imf.org, no key), dataset CPI (IMF.STA).
 * As with the IMF reserves (src/utils/imfReserves.ts), the dataset's codes cannot be checked from
 * the cloud, so nothing is hard-coded: the app reads the dataset's own structure, and in each
 * dimension picks the code whose IMF name fits (the country; monthly; "consumer price index";
 * "all items" or "total"; "year-over-year percent change"), leaving any other dimension open. It
 * then keeps the one returned series whose names say all items and year-over-year, monthly. Every
 * figure carries the IMF series key it came from. If the IMF names differ, Sam can set the series
 * key in .env (IMF_CPI_KEY, with {ISO3} for the country). `npm run check:imf` prints what matched.
 *
 * A month the IMF has not published is skipped, never filled in.
 */
import { getJson, IMF_AGENCY, IMF_SDMX_BASE, IMF_SDMX_HOST, normalizePeriod, parseImfData, type ImfFetch, type ImfSeries } from './imfReserves';
import type { NationalCpiSeries } from './nationalCpi';

export const IMF_CPI_FLOW = 'CPI';
export const IMF_CPI_SHORT = 'IMF CPI';
export const IMF_CPI_LONG = 'IMF Consumer Price Index (CPI dataset), all items, y/y';
export const IMF_CPI_ENV = 'IMF_CPI_KEY';
export { IMF_SDMX_HOST };

export function imfCpiStructureUrl(): string {
  return `${IMF_SDMX_BASE}/structure/dataflow/${IMF_AGENCY}/${IMF_CPI_FLOW}/+?references=descendants&detail=full`;
}
export function imfCpiDataUrl(key: string): string {
  return `${IMF_SDMX_BASE}/data/dataflow/${IMF_AGENCY}/${IMF_CPI_FLOW}/+/${key}?attributes=dsd&measures=all`;
}

export interface CpiCode {
  id: string;
  name: string;
}
export interface CpiDimension {
  id: string;
  codes: CpiCode[];
}
/** The CPI dataset's dimensions in key order (time left out), each with its codes and IMF names. */
export interface ImfCpiStructure {
  dims: CpiDimension[];
}

function nameOf(o: unknown): string {
  const x = o as { name?: unknown; names?: Record<string, string> };
  if (typeof x?.name === 'string') return x.name;
  if (x?.name && typeof x.name === 'object') return String((x.name as Record<string, string>).en ?? Object.values(x.name)[0] ?? '');
  if (x?.names && typeof x.names === 'object') return String(x.names.en ?? Object.values(x.names)[0] ?? '');
  return '';
}

/** Reads an SDMX-JSON structure message: every dimension with its codelist. Null for another shape. */
export function parseImfCpiStructure(json: unknown): ImfCpiStructure | null {
  const root = json as { data?: Record<string, unknown> } & Record<string, unknown>;
  const data = (root?.data ?? root) as Record<string, unknown>;
  const dsds = (data?.dataStructures ?? []) as Array<Record<string, unknown>>;
  if (!Array.isArray(dsds) || !dsds.length) return null;
  const comps = dsds[0].dataStructureComponents as { dimensionList?: { dimensions?: Array<Record<string, unknown>> } } | undefined;
  const defs = [...(comps?.dimensionList?.dimensions ?? [])].sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
  const lists = (data?.codelists ?? []) as Array<{ id?: string; codes?: unknown[] }>;
  const dims: CpiDimension[] = [];
  for (const d of defs) {
    const id = String(d.id ?? '');
    if (!id || id === 'TIME_PERIOD') continue;
    const urn = (d as { localRepresentation?: { enumeration?: string } }).localRepresentation?.enumeration ?? '';
    const clId = /Codelist=[^:]+:([^(]+)\(/.exec(urn)?.[1];
    const list = clId ? lists.find((l) => l.id === clId) : undefined;
    const codes = (list?.codes ?? []).map((c) => ({ id: String((c as { id?: unknown }).id ?? ''), name: nameOf(c) })).filter((c) => c.id);
    dims.push({ id, codes });
  }
  return dims.length ? { dims } : null;
}

const COUNTRY = /^(COUNTRY|REF_AREA|JURISDICTION|ECONOMY)$/;
const FREQ = /^(FREQUENCY|FREQ)$/;
const WANT: RegExp[] = [/^consumer price index\b|\(CPI\)/i, /^all items\b|^total\b/i, /year[- ]over[- ]year|year[- ]on[- ]year|corresponding period (of the )?previous year/i];
const AVOID = /harmoni[sz]ed|\bcore\b|excluding|contribution|weight|(?<!not |non-)seasonally adjusted|percent change from previous period|month[- ]over[- ]month/i;

/** One code per dimension where an IMF name fits; other dimensions stay open (*). */
export function imfCpiKey(s: ImfCpiStructure, iso3: string): { key: string; picked: string[] } {
  const picked: string[] = [];
  const key = s.dims
    .map((d) => {
      if (COUNTRY.test(d.id)) return iso3;
      if (FREQ.test(d.id)) return 'M';
      for (const re of WANT) {
        const hit = d.codes.filter((c) => re.test(c.name) && !AVOID.test(c.name)).sort((a, b) => a.name.length - b.name.length)[0];
        if (hit) {
          picked.push(`${d.id}=${hit.id} ("${hit.name}")`);
          return hit.id;
        }
      }
      return '*';
    })
    .join('.');
  return { key, picked };
}

const labelOf = (s: ImfSeries) =>
  Object.entries(s.dims)
    .map(([dim, d]) => `${dim} ${d.id} ${d.name}`)
    .join(' | ');

/** The one series that is monthly, all items and year-over-year; shortest label wins. */
export function pickImfCpiSeries(series: ImfSeries[]): ImfSeries | null {
  const ok = series.filter((s) => {
    if (!s.obs.some((o) => /^\d{4}-\d{2}$/.test(o.period))) return false;
    const l = labelOf(s);
    const f = Object.entries(s.dims).find(([id]) => FREQ.test(id))?.[1]?.id;
    if (f && f !== 'M') return false;
    if (AVOID.test(l)) return false;
    const yoy = WANT[2].test(l) || Object.values(s.dims).some((d) => /^YOY/i.test(d.id));
    const all = WANT[1].test(l) || Object.values(s.dims).some((d) => d.id === '_T');
    return yoy && all;
  });
  return ok.sort((a, b) => labelOf(a).length - labelOf(b).length)[0] ?? null;
}

/** A picked series as the app's national-CPI shape (months only, rounded to 2 decimals). */
export function imfCpiSeries(s: ImfSeries): NationalCpiSeries | null {
  const points = s.obs
    .map((o) => ({ period: normalizePeriod(o.period), value: Math.round(o.value * 100) / 100 }))
    .filter((p) => /^\d{4}-\d{2}$/.test(p.period) && Number.isFinite(p.value));
  return points.length ? { points, short: IMF_CPI_SHORT, long: `${IMF_CPI_LONG} (series ${s.key})` } : null;
}

export interface ImfCpiStep {
  iso3: string;
  ok: boolean;
  note: string;
}

/** One country: the .env key when set, else the matched codes. */
export async function pullImfCpi(
  opts: { fetchFn: ImfFetch; env?: Record<string, string | undefined>; timeoutMs?: number; structure?: ImfCpiStructure | null },
  iso3: string
): Promise<{ series: NationalCpiSeries | null; step: ImfCpiStep; structure: ImfCpiStructure | null }> {
  const t = opts.timeoutMs ?? 30000;
  let structure = opts.structure ?? null;
  const override = opts.env?.[IMF_CPI_ENV]?.trim();
  let key: string;
  let how: string;
  if (override) {
    key = override.replace(/\{ISO3\}/g, iso3);
    how = `series key from ${IMF_CPI_ENV}`;
  } else {
    if (!structure) {
      const r = await getJson(opts.fetchFn, imfCpiStructureUrl(), t);
      structure = r.json ? parseImfCpiStructure(r.json) : null;
      if (!structure) return { series: null, structure: null, step: { iso3, ok: false, note: r.error ? `IMF CPI structure: ${r.error}` : 'IMF CPI structure answered, but without dimensions the app could read.' } };
    }
    const k = imfCpiKey(structure, iso3);
    if (!k.picked.length) return { series: null, structure, step: { iso3, ok: false, note: `No IMF CPI code name matched "consumer price index", "all items" or "year-over-year". Set ${IMF_CPI_ENV} in .env (dimension order: ${structure.dims.map((d) => d.id).join('.')}).` } };
    key = k.key;
    how = `IMF CPI ${k.picked.join(', ')}`;
  }
  const r = await getJson(opts.fetchFn, imfCpiDataUrl(key), t);
  if (!r.json) return { series: null, structure, step: { iso3, ok: false, note: `${how}: ${r.error}` } };
  const all = parseImfData(r.json);
  const picked = pickImfCpiSeries(all);
  const series = picked ? imfCpiSeries(picked) : null;
  if (!series) return { series: null, structure, step: { iso3, ok: false, note: `${how}: ${all.length ? `${all.length} series came back, none monthly, all items and year-over-year` : 'no series for this country'}.` } };
  return { series, structure, step: { iso3, ok: true, note: `${how}; series ${picked!.key}, to ${series.points[series.points.length - 1].period}` } };
}

/** What the daily run saves. */
export interface ImfCpiPull {
  pulledAt: string;
  series: Record<string, NationalCpiSeries>;
}
