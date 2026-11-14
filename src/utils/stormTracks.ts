/**
 * Tropical cyclone tracks near a country (I8, Sam 2026-11-14), from IBTrACS v04r01, NOAA NCEI's
 * International Best Track Archive for Climate Stewardship: every tropical cyclone in every ocean
 * basin, with positions every 3 hours, merged from the regional warning centres (for the North
 * Atlantic and East Pacific these are the US National Hurricane Center's HURDAT2 tracks).
 *
 * The app reads the since-1980 file (the satellite era, when storms everywhere are seen) and keeps
 * main tracks only. Wind is the US agencies' 1-minute sustained wind in knots (USA_WIND), which the
 * Saffir-Simpson scale uses; where it is missing the WMO agency's wind is used as given (often a
 * 10-minute mean, which reads lower).
 *
 * For a country: a storm counts when its centre passes within `radiusKm` of the country's borders
 * (Natural Earth outlines from world-atlas) with tropical storm winds (34 knots) or more there. The
 * track is filled in every 25 km between the 3-hourly positions so that fast storms are not missed.
 * The strength counted is the highest wind within the radius. Results: storms by strength, each
 * year, the share of years with at least one storm of each strength (about 1 year in how many), and
 * the strongest storms.
 *
 * Limits stated in the panel: the centre's distance is not the reach of the winds (large storms
 * spread damaging wind and rain far wider, small ones less); wind at sea is not damage on land;
 * about 45 seasons is a short record for the rarest storms. Browser-safe, pure.
 */

export const STORM_FROM = 1980;
export const IBTRACS_BASE = 'https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/';
export const IBTRACS_URL = `${IBTRACS_BASE}ibtracs.since1980.list.v04r01.csv`;
/** The small file the connection check reads. */
export const IBTRACS_SAMPLE_URL = `${IBTRACS_BASE}ibtracs.last3years.list.v04r01.csv`;
export const STORM_SOURCES = 'IBTrACS v04r01, NOAA National Centers for Environmental Information (doi:10.25921/82ty-9e16); country outlines Natural Earth 1:50m via world-atlas';
export const STORM_NO_DATA = 'No storm tracks yet: download them from NOAA below, or save an IBTrACS CSV in data/local/ibtracs/';
export const STORM_RADII = [50, 100, 200] as const;
export const STORM_DEFAULT_RADIUS = 100;
/** Saffir-Simpson thresholds, knots (1-minute wind). */
export const KT_TS = 34;
export const KT_HURRICANE = 64;
export const KT_MAJOR = 96;
const STEP_KM = 25;
const R_EARTH = 6371;

export interface StormTrack {
  sid: string;
  season: number;
  name: string;
  basin: string;
  /** Flattened [lat, lon, wind (kt, -1 when missing)] every 3 hours. */
  t: number[];
}

export interface StormFile {
  /** Where the tracks came from (file name). */
  file: string;
  pulledAt: string;
  /** Last season in the file. */
  lastSeason: number;
  storms: StormTrack[];
  /** Points where only the WMO agency's wind was given. */
  wmoWindPoints: number;
}

/** Saffir-Simpson category from wind in knots: 0 tropical storm, 1-5, -1 below tropical storm. */
export function category(kt: number): number {
  if (kt >= 137) return 5;
  if (kt >= 113) return 4;
  if (kt >= KT_MAJOR) return 3;
  if (kt >= 83) return 2;
  if (kt >= KT_HURRICANE) return 1;
  if (kt >= KT_TS) return 0;
  return -1;
}

/** Parse the IBTrACS CSV (header line, then a units line). Lines can be fed one at a time. */
export function ibtracsParser(file: string): { line: (s: string) => void; done: (pulledAt: string) => StormFile | { reason: string } } {
  let col: Record<string, number> | null = null;
  const byId = new Map<string, StormTrack>();
  let wmo = 0;
  let last = 0;
  const need = ['SID', 'SEASON', 'BASIN', 'NAME', 'LAT', 'LON', 'WMO_WIND', 'TRACK_TYPE', 'USA_WIND'];
  return {
    line(s: string) {
      if (!s) return;
      const f = s.split(',');
      if (!col) {
        const h = Object.fromEntries(f.map((x, i) => [x.trim().toUpperCase(), i]));
        if (need.every((k) => k in h)) col = h;
        return;
      }
      const season = Number(f[col.SEASON]);
      if (!Number.isInteger(season) || season < STORM_FROM) return;
      if ((f[col.TRACK_TYPE] || '').trim().toLowerCase() !== 'main') return;
      const lat = Number(f[col.LAT]);
      const lon = Number(f[col.LON]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || f[col.LAT].trim() === '') return;
      const usa = f[col.USA_WIND]?.trim();
      const w = f[col.WMO_WIND]?.trim();
      let wind = -1;
      if (usa && Number.isFinite(Number(usa))) wind = Number(usa);
      else if (w && Number.isFinite(Number(w))) {
        wind = Number(w);
        wmo++;
      }
      const sid = f[col.SID].trim();
      let st = byId.get(sid);
      if (!st) {
        const name = f[col.NAME].trim();
        st = { sid, season, name: name && name !== 'NOT_NAMED' ? name : '', basin: f[col.BASIN].trim(), t: [] };
        byId.set(sid, st);
      }
      st.t.push(Math.round(lat * 100) / 100, Math.round(lon * 100) / 100, wind);
      if (season > last) last = season;
    },
    done(pulledAt: string) {
      if (!col) return { reason: 'the file does not have the IBTrACS columns the app reads (SID, SEASON, LAT, LON, USA_WIND and others)' };
      if (!byId.size) return { reason: `no main tracks from ${STORM_FROM} in the file` };
      return { file, pulledAt, lastSeason: last, storms: [...byId.values()], wmoWindPoints: wmo };
    },
  };
}

/** One country outline: polygons, each a list of rings of [lon, lat]. */
export type Outline = number[][][][];

interface Prepared {
  /** Edges [lon1, lat1, lon2, lat2] by 1-degree cell "lat,lon". */
  cells: Map<string, number[][]>;
  /** Each polygon's box and its edges by 1-degree latitude row, for the inside test. */
  polys: Array<{ minLon: number; maxLon: number; shift: boolean; rows: Map<number, number[][]> }>;
  minLat: number;
  maxLat: number;
}

function prepare(o: Outline): Prepared {
  const cells = new Map<string, number[][]>();
  const polys: Prepared['polys'] = [];
  let minLat = 90;
  let maxLat = -90;
  for (const poly of o) {
    const lons = poly.flat().map((p) => p[0]);
    // A polygon across the 180th meridian is handled in 0-360 longitudes for the inside test.
    const shift = Math.max(...lons) - Math.min(...lons) > 180;
    const sx = (x: number) => (shift && x < 0 ? x + 360 : x);
    const sl = lons.map(sx);
    const rows = new Map<number, number[][]>();
    polys.push({ minLon: Math.min(...sl), maxLon: Math.max(...sl), shift, rows });
    for (const r of poly) {
      for (let i = 1; i < r.length; i++) {
        const [x1, y1] = r[i - 1];
        const [x2, y2] = r[i];
        minLat = Math.min(minLat, y1, y2);
        maxLat = Math.max(maxLat, y1, y2);
        const lo1 = Math.floor(Math.min(y1, y2));
        const hi1 = Math.floor(Math.max(y1, y2));
        for (let la = lo1; la <= hi1; la++) {
          const row = rows.get(la) ?? [];
          row.push([sx(x1), y1, sx(x2), y2]);
          rows.set(la, row);
        }
        if (Math.abs(x1 - x2) > 180) continue; // cut at the 180th meridian: no distance edge
        const e = [x1, y1, x2, y2];
        for (let la = lo1; la <= hi1; la++)
          for (let lo = Math.floor(Math.min(x1, x2)); lo <= Math.floor(Math.max(x1, x2)); lo++) {
            const k = `${la},${lo}`;
            const c = cells.get(k) ?? [];
            c.push(e);
            cells.set(k, c);
          }
      }
    }
  }
  return { cells, polys, minLat, maxLat };
}

const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/** Distance in km from a point to the outline (0 inside), Infinity beyond maxKm. Local flat projection. */
export function distanceKm(o: Prepared, lat: number, lon: number, maxKm: number): number {
  const latPad = maxKm / 111;
  if (lat < o.minLat - latPad || lat > o.maxLat + latPad) return Infinity;
  // Inside: even-odd ray to the east over each polygon's edges in this latitude row.
  for (const p of o.polys) {
    const x0 = p.shift && lon < 0 ? lon + 360 : lon;
    if (x0 < p.minLon || x0 > p.maxLon) continue;
    let inside = false;
    for (const [x1, y1, x2, y2] of p.rows.get(Math.floor(lat)) ?? []) {
      if (y1 > lat !== y2 > lat && x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1) > x0) inside = !inside;
    }
    if (inside) return 0;
  }
  const kx = (Math.PI / 180) * R_EARTH * Math.max(Math.cos((lat * Math.PI) / 180), 0.01);
  const ky = (Math.PI / 180) * R_EARTH;
  const nLat = Math.ceil(latPad) ;
  const nLon = Math.min(180, Math.ceil(maxKm / kx));
  const la0 = Math.floor(lat);
  const lo0 = Math.floor(lon);
  let best = Infinity;
  const seen = new Set<number[]>();
  for (let dla = -nLat; dla <= nLat; dla++)
    for (let dlo = -nLon; dlo <= nLon; dlo++) {
      const lo = wrap(lo0 + dlo + 0.5) - 0.5;
      const c = o.cells.get(`${la0 + dla},${Math.round(lo)}`);
      if (!c) continue;
      for (const e of c) {
        if (seen.has(e)) continue;
        seen.add(e);
        const ax = wrap(e[0] - lon) * kx;
        const ay = (e[1] - lat) * ky;
        const bx = wrap(e[2] - lon) * kx;
        const by = (e[3] - lat) * ky;
        if (Math.abs(ax - bx) > 180 * kx) continue;
        const dx = bx - ax;
        const dy = by - ay;
        const len = dx * dx + dy * dy;
        const tt = len > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
        const d = Math.hypot(ax + tt * dx, ay + tt * dy);
        if (d < best) best = d;
      }
    }
  return best <= maxKm ? best : Infinity;
}

function gcKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((wrap(lon2 - lon1) * r) / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface StormNear {
  sid: string;
  name: string;
  season: number;
  basin: string;
  /** Highest wind within the radius, knots. */
  windKt: number;
  category: number;
  /** Closest approach of the centre to the borders, km (0 = crossed the country). */
  closestKm: number;
}

export interface StormYear {
  year: number;
  storms: number;
  hurricanes: number;
  major: number;
}

export interface StormView {
  radiusKm: number;
  from: number;
  to: number;
  seasons: number;
  storms: number;
  hurricanes: number;
  major: number;
  crossed: number;
  /** Share of seasons with at least one, % and about 1 season in how many (undefined when none). */
  anyPct: number;
  hurricanePct: number;
  majorPct: number;
  anyEvery?: number;
  hurricaneEvery?: number;
  majorEvery?: number;
  years: StormYear[];
  /** Up to 10, strongest first. */
  strongest: StormNear[];
  /** Every storm counted, newest first. */
  list: StormNear[];
}

/** Storms passing within radiusKm of the outline, seasons from STORM_FROM to `to`. */
export function stormsNear(tracks: StormTrack[], outline: Outline, radiusKm: number, to: number): StormView {
  const o = prepare(outline);
  const near: StormNear[] = [];
  for (const s of tracks) {
    if (s.season > to) continue;
    let best = -1;
    let closest = Infinity;
    const t = s.t;
    const visit = (lat: number, lon: number, w: number) => {
      if (w < KT_TS) return;
      const d = distanceKm(o, lat, lon, radiusKm);
      if (d <= radiusKm) {
        if (w > best) best = w;
        if (d < closest) closest = d;
      }
    };
    for (let i = 0; i < t.length; i += 3) {
      if (i === 0) {
        visit(t[0], t[1], t[2]);
        continue;
      }
      const [la0, lo0, w0, la1, lo1, w1] = [t[i - 3], t[i - 2], t[i - 1], t[i], t[i + 1], t[i + 2]];
      const steps = Math.min(40, Math.max(1, Math.ceil(gcKm(la0, lo0, la1, lo1) / STEP_KM)));
      for (let k = 1; k <= steps; k++) {
        const f = k / steps;
        const w = w0 < 0 || w1 < 0 ? (k === steps ? w1 : -1) : w0 + (w1 - w0) * f;
        visit(la0 + (la1 - la0) * f, lo0 + wrap(lo1 - lo0) * f, w);
      }
    }
    if (best >= KT_TS) near.push({ sid: s.sid, name: s.name, season: s.season, basin: s.basin, windKt: Math.round(best), category: category(best), closestKm: Math.round(closest) });
  }
  const seasons = to - STORM_FROM + 1;
  const years: StormYear[] = [];
  for (let y = STORM_FROM; y <= to; y++) {
    const l = near.filter((n) => n.season === y);
    years.push({ year: y, storms: l.length, hurricanes: l.filter((n) => n.windKt >= KT_HURRICANE).length, major: l.filter((n) => n.windKt >= KT_MAJOR).length });
  }
  const share = (k: keyof Omit<StormYear, 'year'>) => years.filter((y) => y[k] > 0).length;
  const pct = (k: number) => Math.round((k / seasons) * 1000) / 10;
  const every = (k: number) => (k > 0 ? Math.round((seasons / k) * 10) / 10 : undefined);
  const a = share('storms');
  const h = share('hurricanes');
  const m = share('major');
  return {
    radiusKm,
    from: STORM_FROM,
    to,
    seasons,
    storms: near.length,
    hurricanes: near.filter((n) => n.windKt >= KT_HURRICANE).length,
    major: near.filter((n) => n.windKt >= KT_MAJOR).length,
    crossed: near.filter((n) => n.closestKm === 0).length,
    anyPct: pct(a),
    hurricanePct: pct(h),
    majorPct: pct(m),
    ...(every(a) !== undefined ? { anyEvery: every(a) } : {}),
    ...(every(h) !== undefined ? { hurricaneEvery: every(h) } : {}),
    ...(every(m) !== undefined ? { majorEvery: every(m) } : {}),
    years,
    strongest: [...near].sort((x, y) => y.windKt - x.windKt || y.season - x.season).slice(0, 10),
    list: [...near].sort((x, y) => y.season - x.season || y.windKt - x.windKt),
  };
}

/** One English sentence for Explain. */
export function stormSentence(v: StormView, country: string): string {
  const s = `IBTrACS: ${v.storms} tropical storms or stronger passed within ${v.radiusKm} km of ${country} in the ${v.seasons} seasons ${v.from}-${v.to}, ${v.hurricanes} at hurricane strength (64 knots or more) and ${v.major} major (category 3 or more); ${v.crossed} crossed the country.`;
  if (!v.storms) return s;
  return `${s} At least one storm came in ${v.anyPct}% of seasons, a hurricane in ${v.hurricanePct}%${v.hurricaneEvery ? ` (about 1 season in ${v.hurricaneEvery})` : ''}, a major hurricane in ${v.majorPct}%${v.majorEvery ? ` (about 1 in ${v.majorEvery})` : ''}.`;
}
