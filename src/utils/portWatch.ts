/**
 * Shipping through chokepoints and port activity (gap analysis D11), from IMF PortWatch: daily
 * counts of ships and preliminary trade volume estimates from satellite ship signals (AIS),
 * published as public ArcGIS feature layers and updated weekly (Tuesdays).
 *
 *   Daily_Chokepoints_Data  28 chokepoints; fields portid, portname, date, year, month, day,
 *                           n_total (ships through that day), capacity (estimated volume)
 *   Daily_Ports_Data        2,065 ports; fields portid, portname, country, ISO3, date, year,
 *                           month, day, portcalls, import, export
 *
 * Layer fields and the chokepoint ids were read from the layers' own JSON on 2026-11-08; the
 * PortWatch terms page could not be read (DATA_LICENCES row `imf_portwatch` is not_verified).
 *
 * The app asks the layer to add up each month itself (outStatistics grouped by year and month), so
 * a reply is a few hundred rows, and shows each month as a daily average: the month's total divided
 * by the last day it covers, so the latest, unfinished month is comparable with full ones.
 *
 * Browser-safe, pure.
 */
import type { Series, SeriesMissing, SeriesPoint } from './seriesHistory';

const BASE = 'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services';
export const PORTWATCH_CHOKEPOINTS_LAYER = `${BASE}/Daily_Chokepoints_Data/FeatureServer/0`;
export const PORTWATCH_PORTS_LAYER = `${BASE}/Daily_Ports_Data/FeatureServer/0`;
export const PORTWATCH_SOURCE = 'IMF PortWatch (portwatch.imf.org), daily ship counts and preliminary trade volume estimates from AIS ship signals';
/** First year the app asks for (PortWatch's daily data start in 2019). */
export const PORTWATCH_FROM_YEAR = 2019;

/** The chokepoints shown as world series (PortWatch has 28; these carry most trade and news). */
export const PORTWATCH_CHOKEPOINTS: Array<{ portid: string; slug: string; name: string }> = [
  { portid: 'chokepoint1', slug: 'suez', name: 'Suez Canal' },
  { portid: 'chokepoint2', slug: 'panama', name: 'Panama Canal' },
  { portid: 'chokepoint3', slug: 'bosporus', name: 'Bosporus Strait' },
  { portid: 'chokepoint4', slug: 'bab_el_mandeb', name: 'Bab el-Mandeb Strait' },
  { portid: 'chokepoint5', slug: 'malacca', name: 'Malacca Strait' },
  { portid: 'chokepoint6', slug: 'hormuz', name: 'Strait of Hormuz' },
  { portid: 'chokepoint7', slug: 'cape_good_hope', name: 'Cape of Good Hope' },
  { portid: 'chokepoint11', slug: 'taiwan', name: 'Taiwan Strait' },
];

const stat = (type: string, field: string, out: string) => ({ statisticType: type, onStatisticField: field, outStatisticFieldName: out });

function query(layer: string, where: string, groupBy: string[], stats: object[]): string {
  const q = new URLSearchParams({
    where,
    outStatistics: JSON.stringify(stats),
    groupByFieldsForStatistics: groupBy.join(','),
    orderByFields: groupBy.join(','),
    returnGeometry: 'false',
    f: 'json',
  });
  return `${layer}/query?${q.toString()}`;
}

/** One query: monthly sums of ship transits and estimated volume for the chosen chokepoints. */
export function chokepointsUrl(fromYear = PORTWATCH_FROM_YEAR): string {
  const ids = PORTWATCH_CHOKEPOINTS.map((c) => `'${c.portid}'`).join(',');
  return query(PORTWATCH_CHOKEPOINTS_LAYER, `portid IN (${ids}) AND year >= ${fromYear}`, ['portid', 'year', 'month'], [
    stat('sum', 'n_total', 'ships'),
    stat('sum', 'capacity', 'volume'),
    stat('max', 'day', 'lastday'),
  ]);
}

/** One query: monthly sums over all of a country's ports (port calls, imports, exports). */
export function portsUrl(iso3: string, fromYear = PORTWATCH_FROM_YEAR): string {
  const code = String(iso3 || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  return query(PORTWATCH_PORTS_LAYER, `ISO3 = '${code}' AND year >= ${fromYear}`, ['year', 'month'], [
    stat('sum', 'portcalls', 'calls'),
    stat('sum', 'import', 'imports'),
    stat('sum', 'export', 'exports'),
    stat('max', 'day', 'lastday'),
  ]);
}

export interface PwMonth {
  /** YYYY-MM */
  month: string;
  /** Last day of the month the data cover (the month's length when complete). */
  lastDay: number;
  /** Sums over the month, by field name (ships, volume, calls, imports, exports). */
  sums: Record<string, number>;
}

const pick = (a: Record<string, unknown>, name: string): unknown => {
  const k = Object.keys(a).find((x) => x.toLowerCase() === name.toLowerCase());
  return k === undefined ? undefined : a[k];
};

/**
 * An outStatistics reply into months, keyed by `portid` when the reply groups by it (else ""). An
 * ArcGIS error reply ({error: ...}) or a reply without features gives an empty map.
 */
export function parsePortWatchStats(json: unknown, fields: string[]): Map<string, PwMonth[]> {
  const out = new Map<string, PwMonth[]>();
  const feats = (json as { features?: Array<{ attributes?: Record<string, unknown> }> })?.features;
  if (!Array.isArray(feats)) return out;
  for (const f of feats) {
    const a = f?.attributes;
    if (!a || typeof a !== 'object') continue;
    const y = Number(pick(a, 'year'));
    const m = Number(pick(a, 'month'));
    const lastDay = Number(pick(a, 'lastday'));
    if (!Number.isInteger(y) || y < 1990 || !Number.isInteger(m) || m < 1 || m > 12 || !Number.isFinite(lastDay) || lastDay < 1 || lastDay > 31) continue;
    const sums: Record<string, number> = {};
    for (const name of fields) {
      const raw = pick(a, name);
      const v = raw === null || raw === undefined || raw === '' ? Number.NaN : Number(raw);
      if (Number.isFinite(v) && v >= 0) sums[name] = v;
    }
    if (!Object.keys(sums).length) continue;
    const key = String(pick(a, 'portid') ?? '');
    const list = out.get(key) || [];
    list.push({ month: `${y}-${String(m).padStart(2, '0')}`, lastDay, sums });
    out.set(key, list);
  }
  for (const list of out.values()) list.sort((p, q) => (p.month < q.month ? -1 : 1));
  return out;
}

/** Daily averages of one field: the month's sum over the days it covers. */
export function dailyAverage(months: PwMonth[], field: string, dp = 1): SeriesPoint[] {
  return months.filter((m) => field in m.sums).map((m) => ({ date: m.month, value: Number((m.sums[field] / m.lastDay).toFixed(dp)) }));
}

const daysIn = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** "through 4 Nov" when the latest month is not complete; "" otherwise. */
export function partialNote(months: PwMonth[]): string {
  const last = months[months.length - 1];
  if (!last || last.lastDay >= daysIn(last.month)) return '';
  return ` The latest month (${last.month}) covers days 1 to ${last.lastDay} only.`;
}

export interface PortWatchChokepoints {
  fetchedAt: string;
  /** portid -> months, oldest first. */
  byId: Record<string, PwMonth[]>;
  reason?: string;
}

export interface PortWatchPorts {
  iso3: string;
  fetchedAt: string;
  months: PwMonth[];
  reason?: string;
}

const READ = 'Counts and volumes are estimates from ship position signals; PortWatch marks the trade volumes as preliminary.';

/** The chosen chokepoints as world series: ships through per day and estimated volume per day. */
export function chokepointWorldSeries(p: PortWatchChokepoints | null | undefined): Array<Series | SeriesMissing> {
  const out: Array<Series | SeriesMissing> = [];
  for (const c of PORTWATCH_CHOKEPOINTS) {
    const ships = { id: `portwatch_${c.slug}_ships`, label: `${c.name}: ships through per day` };
    const vol = { id: `portwatch_${c.slug}_volume`, label: `${c.name}: estimated trade volume per day` };
    const months = p?.byId[c.portid];
    if (!months?.length) {
      const reason = !p ? 'IMF PortWatch has not answered yet' : p.reason || `IMF PortWatch gave no data for ${c.name}`;
      out.push({ ...ships, reason }, { ...vol, reason });
      continue;
    }
    const note = partialNote(months);
    const source = `${PORTWATCH_SOURCE}, ${c.name} (${c.portid})`;
    const sp = dailyAverage(months, 'ships');
    const vp = dailyAverage(months, 'volume', 0);
    out.push(
      sp.length
        ? { ...ships, unit: 'ships/day', freq: 'monthly', source, pulledAt: p!.fetchedAt, points: sp, about: `Ships passing the ${c.name} each day, averaged over the month. ${READ}${note}` }
        : { ...ships, reason: `IMF PortWatch gave no ship counts for ${c.name}` },
      vp.length
        ? { ...vol, unit: 'tonnes/day (est.)', freq: 'monthly', source, pulledAt: p!.fetchedAt, points: vp, about: `Estimated cargo carried through the ${c.name} each day (PortWatch's capacity field), averaged over the month. ${READ}${note}` }
        : { ...vol, reason: `IMF PortWatch gave no volume estimates for ${c.name}` },
    );
  }
  return out;
}

/** A country's ports added up: port calls, imports and exports per day, or Missing with the reason. */
export function portActivitySeries(iso3: string, p: PortWatchPorts | null | undefined): Array<Series | SeriesMissing> {
  const defs = [
    { id: 'portwatch_port_calls', field: 'calls', label: 'Port calls per day (all ports)', unit: 'calls/day', dp: 1, what: 'Ships calling at the country\'s ports each day' },
    { id: 'portwatch_imports', field: 'imports', label: 'Seaborne imports per day (estimated)', unit: 'tonnes/day (est.)', dp: 0, what: 'Estimated cargo unloaded at the country\'s ports each day' },
    { id: 'portwatch_exports', field: 'exports', label: 'Seaborne exports per day (estimated)', unit: 'tonnes/day (est.)', dp: 0, what: 'Estimated cargo loaded at the country\'s ports each day' },
  ];
  const code = String(iso3 || '').toUpperCase();
  return defs.map((d) => {
    if (!p) return { id: d.id, label: d.label, reason: 'IMF PortWatch has not answered yet' };
    if (p.reason) return { id: d.id, label: d.label, reason: p.reason };
    const points = dailyAverage(p.months, d.field, d.dp);
    if (!points.length) return { id: d.id, label: d.label, reason: `IMF PortWatch lists no port activity for ${code} (a landlocked country has no ports)` };
    return { id: d.id, label: d.label, unit: d.unit, freq: 'monthly' as const, source: `${PORTWATCH_SOURCE}, ports in ${code}`, pulledAt: p.fetchedAt, points, about: `${d.what}, summed over every port PortWatch tracks there and averaged over the month. ${READ}${partialNote(p.months)}` };
  });
}
