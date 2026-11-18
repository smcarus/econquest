/**
 * One monthly series per country from an IMF dataset on the free SDMX 3.0 API (api.imf.org, no
 * key), found by the IMF's own code names: the same way the IMF monthly consumer prices are found
 * (src/utils/imfCpi.ts), for datasets whose codes cannot be checked from the cloud.
 *
 * A spec names the dataset, the code names wanted in each dimension (first match wins, other
 * dimensions stay open), names to avoid, and a last test on each returned series' full label. The
 * app reads the dataset's structure once, builds the key, asks for the country's series and keeps
 * the one that passes, shortest label first. Every figure carries the IMF series key it came from.
 * If the IMF names differ, the series key can be set in .env (the spec's `env`, with {ISO3} for the
 * country); `npm run check:data` says what matched.
 *
 * The live IMF data replies can carry dimension codes without their names, so a series' label
 * takes the names from the structure where the reply leaves them out. A series asked for by a key
 * with a code in every dimension (matched names or the .env key) and returned under that key is
 * the one asked for, so only its frequency and months are tested, not its label.
 *
 * A month the IMF has not published is skipped, never filled in.
 */
import { getJson, IMF_AGENCY, IMF_SDMX_BASE, normalizePeriod, parseImfData, type ImfFetch, type ImfSeries } from './imfReserves';
import { imfCpiCodeCounts, parseImfCpiStructure, type ImfCpiStructure } from './imfCpi';

export interface ImfMonthlySpec {
  /** Dataset id at IMF.STA, for example ER or MFS_IR. */
  flow: string;
  /** Short source label, for example "IMF ER". */
  short: string;
  /** Long source label; the series key is added after it. */
  long: string;
  /** .env variable that sets the series key directly ({ISO3} for the country). */
  env: string;
  /** Code names wanted, tried in order in each dimension other than country and frequency. */
  want: RegExp[];
  /** Code names never picked, and labels never kept. */
  avoid: RegExp;
  /** The last test on a returned series' full label (every dimension's id and name). */
  accept: (label: string) => boolean;
  /** Decimal places kept. */
  decimals: number;
}

export interface ImfMonthlySeries {
  /** Months, oldest first. */
  points: Array<{ period: string; value: number }>;
  /** The IMF series key. */
  key: string;
  short: string;
  long: string;
}

export interface ImfMonthlyPull {
  pulledAt: string;
  /** Keyed by ISO-3 country code. */
  series: Record<string, ImfMonthlySeries>;
}

export interface ImfMonthlyStep {
  iso3: string;
  ok: boolean;
  note: string;
}

export const imfStructureUrl = (flow: string) => `${IMF_SDMX_BASE}/structure/dataflow/${IMF_AGENCY}/${flow}/+?references=descendants&detail=full`;
export const imfDataUrl = (flow: string, key: string) => `${IMF_SDMX_BASE}/data/dataflow/${IMF_AGENCY}/${flow}/+/${key}?attributes=dsd&measures=all`;

const COUNTRY = /^(COUNTRY|REF_AREA|JURISDICTION|ECONOMY)$/;
const FREQ = /^(FREQUENCY|FREQ)$/;

/** One code per dimension where a wanted name fits; other dimensions stay open (*). */
export function imfMonthlyKey(spec: ImfMonthlySpec, s: ImfCpiStructure, iso3: string): { key: string; picked: string[] } {
  const picked: string[] = [];
  const key = s.dims
    .map((d) => {
      if (COUNTRY.test(d.id)) return iso3;
      if (FREQ.test(d.id)) return 'M';
      for (const re of spec.want) {
        const hit = d.codes.filter((c) => re.test(c.name) && !spec.avoid.test(c.name)).sort((a, b) => a.name.length - b.name.length)[0];
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

export const imfSeriesLabel = (s: ImfSeries) =>
  Object.entries(s.dims)
    .map(([dim, d]) => `${dim} ${d.id} ${d.name}`)
    .join(' | ');

/** A period as YYYY-MM when it is a month ("2026-M10", "2026M10", "2026-10", "2026-10-01"). */
export function imfMonth(p: string): string {
  const n = normalizePeriod(p);
  const d = /^(\d{4}-\d{2})-\d{2}$/.exec(n);
  return d ? d[1] : n;
}

/** Fills dimension names the data reply left out from the structure's codelists. */
export function withStructureNames(series: ImfSeries[], structure: ImfCpiStructure | null): ImfSeries[] {
  if (!structure) return series;
  return series.map((s) => {
    const dims: ImfSeries['dims'] = {};
    for (const [id, c] of Object.entries(s.dims)) {
      const name = c.name && c.name !== c.id ? c.name : structure.dims.find((d) => d.id === id)?.codes.find((x) => x.id === c.id)?.name;
      dims[id] = { id: c.id, name: name || c.name };
    }
    return { ...s, dims };
  });
}

/** Why a series is not taken, or '' when it is. `exact`: the key named a code in every dimension. */
export function imfMonthlyRejection(spec: ImfMonthlySpec, s: ImfSeries, exact = false): string {
  if (!s.obs.some((o) => /^\d{4}-\d{2}$/.test(imfMonth(o.period)))) return `no monthly figures (periods such as ${s.obs.slice(-1).map((o) => o.period).join('') || 'none'})`;
  const f = Object.entries(s.dims).find(([id]) => FREQ.test(id))?.[1]?.id;
  if (f && f !== 'M') return `frequency ${f}, not monthly`;
  if (exact) return '';
  const l = imfSeriesLabel(s);
  if (spec.avoid.test(l)) return `label left out (${l})`;
  if (!spec.accept(l)) return `label does not fit (${l})`;
  return '';
}

/** The one monthly series that passes the spec; shortest label wins. */
export function pickImfMonthly(spec: ImfMonthlySpec, series: ImfSeries[], exact = false): ImfSeries | null {
  const ok = series.filter((s) => !imfMonthlyRejection(spec, s, exact));
  return ok.sort((a, b) => imfSeriesLabel(a).length - imfSeriesLabel(b).length)[0] ?? null;
}

/** A picked series in the app's shape (months only, positive or any finite value as given). */
export function imfMonthlySeries(spec: ImfMonthlySpec, s: ImfSeries): ImfMonthlySeries | null {
  const f = 10 ** spec.decimals;
  const points = s.obs
    .map((o) => ({ period: imfMonth(o.period), value: Math.round(o.value * f) / f }))
    .filter((p) => /^\d{4}-\d{2}$/.test(p.period) && Number.isFinite(p.value))
    .sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0));
  return points.length ? { points, key: s.key, short: spec.short, long: `${spec.long} (series ${s.key})` } : null;
}

/** One country: the .env key when set, else the matched codes. */
export async function pullImfMonthly(
  spec: ImfMonthlySpec,
  opts: { fetchFn: ImfFetch; env?: Record<string, string | undefined>; timeoutMs?: number; structure?: ImfCpiStructure | null },
  iso3: string
): Promise<{ series: ImfMonthlySeries | null; step: ImfMonthlyStep; structure: ImfCpiStructure | null }> {
  const t = opts.timeoutMs ?? 30000;
  let structure = opts.structure ?? null;
  const override = opts.env?.[spec.env]?.trim();
  let key: string;
  let how: string;
  if (override) {
    key = override.replace(/\{ISO3\}/g, iso3);
    how = `series key from ${spec.env}`;
  } else {
    if (!structure) {
      const r = await getJson(opts.fetchFn, imfStructureUrl(spec.flow), t);
      structure = r.json ? parseImfCpiStructure(r.json) : null;
      if (!structure) return { series: null, structure: null, step: { iso3, ok: false, note: r.error ? `${spec.short} structure: ${r.error}` : `${spec.short} structure answered, but without dimensions the app could read.` } };
    }
    const k = imfMonthlyKey(spec, structure, iso3);
    key = k.key;
    how = k.picked.length ? `${spec.short} ${k.picked.join(', ')}` : `${spec.short}, every monthly series of the country (no code name matched in the structure; codes read: ${imfCpiCodeCounts(structure)})`;
  }
  const r = await getJson(opts.fetchFn, imfDataUrl(spec.flow, key), t);
  if (!r.json) return { series: null, structure, step: { iso3, ok: false, note: `${how}: ${r.error}` } };
  const all = withStructureNames(parseImfData(r.json), structure);
  // A key with a code in every dimension: the series with exactly that key is the one asked for.
  const asked = key.split('.').includes('*') ? [] : all.filter((x) => x.key === key);
  const exact = asked.length > 0;
  const picked = exact ? pickImfMonthly(spec, asked, true) : pickImfMonthly(spec, all);
  const series = picked ? imfMonthlySeries(spec, picked) : null;
  if (!series) {
    const hint = override ? '' : ` Set ${spec.env} in .env (dimension order: ${(structure?.dims ?? []).map((d) => d.id).join('.')}).`;
    const why = all.length ? `${all.length} series came back, none that fits (${imfMonthlyRejection(spec, exact ? asked[0] : all[0], exact) || 'no figures'})` : 'no series for this country';
    return { series: null, structure, step: { iso3, ok: false, note: `${how}: ${why}.${hint}` } };
  }
  return { series, structure, step: { iso3, ok: true, note: `${how}; series ${picked!.key}, to ${series.points[series.points.length - 1].period}` } };
}

/** Reads a saved pull, or null for another shape. */
export function readImfMonthlyPull(json: unknown): ImfMonthlyPull | null {
  const x = json as ImfMonthlyPull;
  if (!x || typeof x.pulledAt !== 'string' || !x.series || typeof x.series !== 'object') return null;
  return x;
}
