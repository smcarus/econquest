/**
 * Historic weather at each country's capital (W1, Sam 2026-11-14: "free historic weather from
 * NASA/NOAA"; source picked on a card: NASA POWER at the capital).
 *
 * Source: NASA POWER (Prediction Of Worldwide Energy Resources), monthly point API, free, no key.
 * `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR&community=AG
 * &latitude=&longitude=&start=YYYY&end=YYYY&format=JSON` answers
 * { properties: { parameter: { T2M: { "198101": 26.1, ..., "198113": 27.0 }, PRECTOTCORR: {...} } },
 *   parameters: { T2M: { units: "C" }, PRECTOTCORR: { units: "mm/day" } }, header: { ... } }.
 * Month "13" is the year's average and is skipped; -999 marks a missing value. Rainfall comes as a
 * daily average for the month (mm/day) and is turned into the month's total (mm) with the number of
 * days in that month. Terms: no restriction stated; NASA asks to be cited with the service, version
 * and date of access (https://power.larc.nasa.gov/docs/referencing/), licence row nasa_power.
 *
 * A point is one grid cell (about 50 km across) at the capital, not an average over the country: the
 * series say so. The 1991-2020 normal for each calendar month is the average of that month over those
 * years in the same series, and needs 25 of the 30 years; with fewer, the anomaly reads Missing.
 *
 * Browser-safe, pure.
 */
import type { Series, SeriesMissing, SeriesPoint } from './seriesHistory';

export const POWER_SOURCE = 'NASA POWER (Prediction Of Worldwide Energy Resources), monthly, at the capital';
export const POWER_FROM_YEAR = 1981;
export const NORMAL_FROM = 1991;
export const NORMAL_TO = 2020;
/** Years of the 30-year normal that must be present for a calendar month. */
export const NORMAL_MIN_YEARS = 25;

export interface Capital {
  city: string;
  lat: number;
  lon: number;
}

/**
 * Capital cities (seat of government where it differs from the constitutional capital), latitude and
 * longitude in degrees to two decimals. Geography only: no figures about the weather or the economy.
 */
export const CAPITALS: Record<string, Capital> = {
  AFG: { city: 'Kabul', lat: 34.53, lon: 69.17 },
  ALB: { city: 'Tirana', lat: 41.33, lon: 19.82 },
  DZA: { city: 'Algiers', lat: 36.75, lon: 3.06 },
  AGO: { city: 'Luanda', lat: -8.84, lon: 13.23 },
  ARG: { city: 'Buenos Aires', lat: -34.6, lon: -58.38 },
  AUS: { city: 'Canberra', lat: -35.28, lon: 149.13 },
  AUT: { city: 'Vienna', lat: 48.21, lon: 16.37 },
  AZE: { city: 'Baku', lat: 40.41, lon: 49.87 },
  BGD: { city: 'Dhaka', lat: 23.81, lon: 90.41 },
  BLR: { city: 'Minsk', lat: 53.9, lon: 27.57 },
  BEL: { city: 'Brussels', lat: 50.85, lon: 4.35 },
  BOL: { city: 'La Paz (seat of government)', lat: -16.5, lon: -68.15 },
  BIH: { city: 'Sarajevo', lat: 43.86, lon: 18.41 },
  BWA: { city: 'Gaborone', lat: -24.65, lon: 25.91 },
  BRA: { city: 'Brasília', lat: -15.79, lon: -47.88 },
  BGR: { city: 'Sofia', lat: 42.7, lon: 23.32 },
  MMR: { city: 'Naypyidaw', lat: 19.76, lon: 96.13 },
  KHM: { city: 'Phnom Penh', lat: 11.56, lon: 104.92 },
  CMR: { city: 'Yaoundé', lat: 3.85, lon: 11.5 },
  CAN: { city: 'Ottawa', lat: 45.42, lon: -75.7 },
  CHL: { city: 'Santiago', lat: -33.45, lon: -70.67 },
  CHN: { city: 'Beijing', lat: 39.9, lon: 116.41 },
  COL: { city: 'Bogotá', lat: 4.71, lon: -74.07 },
  COG: { city: 'Brazzaville', lat: -4.26, lon: 15.24 },
  COD: { city: 'Kinshasa', lat: -4.32, lon: 15.31 },
  CRI: { city: 'San José', lat: 9.93, lon: -84.08 },
  CIV: { city: 'Yamoussoukro', lat: 6.83, lon: -5.29 },
  HRV: { city: 'Zagreb', lat: 45.81, lon: 15.98 },
  CUB: { city: 'Havana', lat: 23.11, lon: -82.37 },
  CYP: { city: 'Nicosia', lat: 35.17, lon: 33.36 },
  CZE: { city: 'Prague', lat: 50.08, lon: 14.44 },
  DNK: { city: 'Copenhagen', lat: 55.68, lon: 12.57 },
  DOM: { city: 'Santo Domingo', lat: 18.49, lon: -69.93 },
  ECU: { city: 'Quito', lat: -0.18, lon: -78.47 },
  EGY: { city: 'Cairo', lat: 30.04, lon: 31.24 },
  SLV: { city: 'San Salvador', lat: 13.69, lon: -89.22 },
  EST: { city: 'Tallinn', lat: 59.44, lon: 24.75 },
  ETH: { city: 'Addis Ababa', lat: 9.03, lon: 38.74 },
  FIN: { city: 'Helsinki', lat: 60.17, lon: 24.94 },
  FRA: { city: 'Paris', lat: 48.86, lon: 2.35 },
  GAB: { city: 'Libreville', lat: 0.42, lon: 9.47 },
  GEO: { city: 'Tbilisi', lat: 41.72, lon: 44.79 },
  DEU: { city: 'Berlin', lat: 52.52, lon: 13.41 },
  GHA: { city: 'Accra', lat: 5.6, lon: -0.19 },
  GRC: { city: 'Athens', lat: 37.98, lon: 23.73 },
  GRL: { city: 'Nuuk', lat: 64.18, lon: -51.72 },
  GTM: { city: 'Guatemala City', lat: 14.63, lon: -90.51 },
  GIN: { city: 'Conakry', lat: 9.64, lon: -13.58 },
  HND: { city: 'Tegucigalpa', lat: 14.07, lon: -87.19 },
  HUN: { city: 'Budapest', lat: 47.5, lon: 19.04 },
  ISL: { city: 'Reykjavík', lat: 64.15, lon: -21.94 },
  IND: { city: 'New Delhi', lat: 28.61, lon: 77.21 },
  IDN: { city: 'Jakarta', lat: -6.21, lon: 106.85 },
  IRN: { city: 'Tehran', lat: 35.69, lon: 51.39 },
  IRQ: { city: 'Baghdad', lat: 33.31, lon: 44.37 },
  IRL: { city: 'Dublin', lat: 53.35, lon: -6.26 },
  ISR: { city: 'Jerusalem (seat of government)', lat: 31.77, lon: 35.21 },
  ITA: { city: 'Rome', lat: 41.9, lon: 12.5 },
  JPN: { city: 'Tokyo', lat: 35.68, lon: 139.69 },
  JOR: { city: 'Amman', lat: 31.95, lon: 35.93 },
  KAZ: { city: 'Astana', lat: 51.17, lon: 71.45 },
  KEN: { city: 'Nairobi', lat: -1.29, lon: 36.82 },
  PRK: { city: 'Pyongyang', lat: 39.04, lon: 125.76 },
  KOR: { city: 'Seoul', lat: 37.57, lon: 126.98 },
  KWT: { city: 'Kuwait City', lat: 29.38, lon: 47.99 },
  LAO: { city: 'Vientiane', lat: 17.98, lon: 102.63 },
  LVA: { city: 'Riga', lat: 56.95, lon: 24.11 },
  LBN: { city: 'Beirut', lat: 33.89, lon: 35.5 },
  LBY: { city: 'Tripoli', lat: 32.89, lon: 13.19 },
  LTU: { city: 'Vilnius', lat: 54.69, lon: 25.28 },
  MDG: { city: 'Antananarivo', lat: -18.88, lon: 47.51 },
  MYS: { city: 'Kuala Lumpur', lat: 3.14, lon: 101.69 },
  MLI: { city: 'Bamako', lat: 12.64, lon: -8.0 },
  MEX: { city: 'Mexico City', lat: 19.43, lon: -99.13 },
  MNG: { city: 'Ulaanbaatar', lat: 47.89, lon: 106.91 },
  MAR: { city: 'Rabat', lat: 34.02, lon: -6.84 },
  MOZ: { city: 'Maputo', lat: -25.97, lon: 32.57 },
  NAM: { city: 'Windhoek', lat: -22.56, lon: 17.08 },
  NPL: { city: 'Kathmandu', lat: 27.72, lon: 85.32 },
  NLD: { city: 'Amsterdam', lat: 52.37, lon: 4.9 },
  NZL: { city: 'Wellington', lat: -41.29, lon: 174.78 },
  NIC: { city: 'Managua', lat: 12.11, lon: -86.24 },
  NER: { city: 'Niamey', lat: 13.51, lon: 2.11 },
  NGA: { city: 'Abuja', lat: 9.08, lon: 7.4 },
  NOR: { city: 'Oslo', lat: 59.91, lon: 10.75 },
  OMN: { city: 'Muscat', lat: 23.59, lon: 58.41 },
  PAK: { city: 'Islamabad', lat: 33.68, lon: 73.05 },
  PAN: { city: 'Panama City', lat: 8.98, lon: -79.52 },
  PNG: { city: 'Port Moresby', lat: -9.44, lon: 147.18 },
  PRY: { city: 'Asunción', lat: -25.26, lon: -57.58 },
  PER: { city: 'Lima', lat: -12.05, lon: -77.04 },
  PHL: { city: 'Manila', lat: 14.6, lon: 120.98 },
  POL: { city: 'Warsaw', lat: 52.23, lon: 21.01 },
  PRT: { city: 'Lisbon', lat: 38.72, lon: -9.14 },
  QAT: { city: 'Doha', lat: 25.29, lon: 51.53 },
  ROU: { city: 'Bucharest', lat: 44.43, lon: 26.1 },
  RUS: { city: 'Moscow', lat: 55.76, lon: 37.62 },
  SAU: { city: 'Riyadh', lat: 24.71, lon: 46.68 },
  SEN: { city: 'Dakar', lat: 14.72, lon: -17.47 },
  SRB: { city: 'Belgrade', lat: 44.79, lon: 20.45 },
  SVK: { city: 'Bratislava', lat: 48.15, lon: 17.11 },
  SVN: { city: 'Ljubljana', lat: 46.06, lon: 14.51 },
  SOM: { city: 'Mogadishu', lat: 2.05, lon: 45.32 },
  ZAF: { city: 'Pretoria (seat of government)', lat: -25.75, lon: 28.19 },
  SSD: { city: 'Juba', lat: 4.86, lon: 31.57 },
  ESP: { city: 'Madrid', lat: 40.42, lon: -3.7 },
  LKA: { city: 'Sri Jayawardenepura Kotte', lat: 6.89, lon: 79.92 },
  SDN: { city: 'Khartoum', lat: 15.5, lon: 32.56 },
  SWE: { city: 'Stockholm', lat: 59.33, lon: 18.07 },
  CHE: { city: 'Bern', lat: 46.95, lon: 7.45 },
  SYR: { city: 'Damascus', lat: 33.51, lon: 36.28 },
  TWN: { city: 'Taipei', lat: 25.03, lon: 121.57 },
  TZA: { city: 'Dodoma', lat: -6.16, lon: 35.75 },
  THA: { city: 'Bangkok', lat: 13.76, lon: 100.5 },
  TUN: { city: 'Tunis', lat: 36.81, lon: 10.18 },
  TUR: { city: 'Ankara', lat: 39.93, lon: 32.86 },
  TKM: { city: 'Ashgabat', lat: 37.96, lon: 58.33 },
  UGA: { city: 'Kampala', lat: 0.35, lon: 32.58 },
  UKR: { city: 'Kyiv', lat: 50.45, lon: 30.52 },
  ARE: { city: 'Abu Dhabi', lat: 24.45, lon: 54.38 },
  GBR: { city: 'London', lat: 51.51, lon: -0.13 },
  USA: { city: 'Washington, D.C.', lat: 38.91, lon: -77.04 },
  URY: { city: 'Montevideo', lat: -34.9, lon: -56.16 },
  UZB: { city: 'Tashkent', lat: 41.3, lon: 69.24 },
  VEN: { city: 'Caracas', lat: 10.48, lon: -66.9 },
  VNM: { city: 'Hanoi', lat: 21.03, lon: 105.85 },
  YEM: { city: "Sana'a", lat: 15.37, lon: 44.19 },
  ZMB: { city: 'Lusaka', lat: -15.39, lon: 28.32 },
  ZWE: { city: 'Harare', lat: -17.83, lon: 31.05 },
  SGP: { city: 'Singapore', lat: 1.29, lon: 103.85 },
  HKG: { city: 'Hong Kong', lat: 22.32, lon: 114.17 },
};

export function nasaPowerUrl(c: Capital, startYear: number, endYear: number): string {
  return `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR&community=AG&latitude=${c.lat}&longitude=${c.lon}&start=${startYear}&end=${endYear}&format=JSON`;
}
/** One year at Washington, D.C., for the Data health check. */
export const NASA_POWER_SAMPLE_YEAR = 2024;
export const NASA_POWER_SAMPLE_URL = nasaPowerUrl(CAPITALS.USA, NASA_POWER_SAMPLE_YEAR, NASA_POWER_SAMPLE_YEAR);

export interface WeatherPull {
  iso3: string;
  pulledAt: string;
  capital: Capital;
  /** Mean air temperature at 2 m, °C, by YYYY-MM. */
  temp: Record<string, number>;
  /** Rainfall (bias-corrected), month total in mm, by YYYY-MM. */
  rain: Record<string, number>;
  /** The POWER version named in the answer's header, when given (for the citation). */
  version?: string;
}

function daysIn(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Monthly values from one answer; null when it is not in the POWER layout. Month 13 and -999 are skipped. */
export function parseNasaPower(json: unknown): { temp: Record<string, number>; rain: Record<string, number>; version?: string } | null {
  const j = json as { properties?: { parameter?: Record<string, Record<string, unknown>> }; parameters?: Record<string, { units?: string }>; header?: { api?: { version?: string }; sources?: unknown } };
  const p = j?.properties?.parameter;
  if (!p || typeof p !== 'object' || (!p.T2M && !p.PRECTOTCORR)) return null;
  const read = (obj: Record<string, unknown> | undefined, perDay: boolean) => {
    const out: Record<string, number> = {};
    for (const [k, raw] of Object.entries(obj || {})) {
      const m = /^(\d{4})(\d{2})$/.exec(k);
      if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) continue;
      const v = Number(raw);
      if (!Number.isFinite(v) || v <= -999) continue;
      const ym = `${m[1]}-${m[2]}`;
      out[ym] = Math.round((perDay ? v * daysIn(ym) : v) * 100) / 100;
    }
    return out;
  };
  const rainUnit = String(j.parameters?.PRECTOTCORR?.units || 'mm/day').toLowerCase();
  const version = typeof j.header?.api?.version === 'string' ? j.header.api.version : undefined;
  return { temp: read(p.T2M, false), rain: read(p.PRECTOTCORR, /\/\s*day/.test(rainUnit)), ...(version ? { version } : {}) };
}

/** Average of each calendar month over the normal period; a month with too few years is left out. */
export function monthlyNormals(values: Record<string, number>, from = NORMAL_FROM, to = NORMAL_TO, minYears = NORMAL_MIN_YEARS): Record<string, number> {
  const sums: Record<string, { s: number; n: number }> = {};
  for (const [ym, v] of Object.entries(values)) {
    const y = Number(ym.slice(0, 4));
    if (y < from || y > to) continue;
    const mm = ym.slice(5, 7);
    const a = (sums[mm] ||= { s: 0, n: 0 });
    a.s += v;
    a.n += 1;
  }
  const out: Record<string, number> = {};
  for (const [mm, a] of Object.entries(sums)) if (a.n >= minYears) out[mm] = a.s / a.n;
  return out;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const sorted = (o: Record<string, number>) => Object.keys(o).sort();

export const WEATHER_ABOUT = {
  temp: 'Average air temperature two metres above the ground for the month, at one grid cell (about 50 km across) at the capital, from NASA satellite and weather-model data. A point, not an average over the whole country.',
  tempAnom: 'How much warmer (above 0) or colder (below 0) the month was than the same calendar month averaged over 1991-2020, at the same point. Months need 25 of those 30 years for an average.',
  rain: 'Total rainfall in the month at one grid cell at the capital, from NASA satellite and weather-model data corrected against rain gauges. Rain varies a lot over short distances, so a single point can differ from the country as a whole.',
  rainPct: 'Rainfall in the month as a % of the same calendar month averaged over 1991-2020, at the same point: 100 is a normal month, 50 half the usual rain, 200 twice. Months need 25 of those 30 years for an average.',
};

/** Temperature, its anomaly, rainfall and rainfall as % of normal at the capital. */
export function weatherSeries(iso3: string, pull: WeatherPull | null | undefined, missingReason?: string): Array<Series | SeriesMissing> {
  const capital = CAPITALS[iso3];
  const ids = {
    temp: { id: 'weather_temp', label: 'Temperature at the capital' },
    tempAnom: { id: 'weather_temp_anom', label: 'Temperature at the capital against 1991-2020' },
    rain: { id: 'weather_rain', label: 'Rainfall at the capital' },
    rainPct: { id: 'weather_rain_pct', label: 'Rainfall at the capital, % of 1991-2020' },
  };
  const all = (reason: string): SeriesMissing[] => Object.values(ids).map((x) => ({ ...x, reason }));
  if (!capital) return all('No capital city on file for this country, so NASA POWER is not asked');
  if (!pull) return all(missingReason || 'NASA POWER has not answered yet');
  const source = `${POWER_SOURCE}${pull.version ? `, ${pull.version}` : ''}; ${capital.city} ${capital.lat}, ${capital.lon}`;
  const base = { freq: 'monthly' as const, source, pulledAt: pull.pulledAt };
  const out: Array<Series | SeriesMissing> = [];
  const tNorm = monthlyNormals(pull.temp);
  const rNorm = monthlyNormals(pull.rain);
  const tPts: SeriesPoint[] = sorted(pull.temp).map((ym) => ({ date: ym, value: pull.temp[ym] }));
  const rPts: SeriesPoint[] = sorted(pull.rain).map((ym) => ({ date: ym, value: pull.rain[ym] }));
  const tAnom: SeriesPoint[] = sorted(pull.temp).filter((ym) => tNorm[ym.slice(5, 7)] !== undefined).map((ym) => ({ date: ym, value: r2(pull.temp[ym] - tNorm[ym.slice(5, 7)]) }));
  const rPct: SeriesPoint[] = sorted(pull.rain)
    .filter((ym) => (rNorm[ym.slice(5, 7)] ?? 0) > 0)
    .map((ym) => ({ date: ym, value: Math.round((pull.rain[ym] / rNorm[ym.slice(5, 7)]) * 1000) / 10 }));
  const noNormal = `Fewer than ${NORMAL_MIN_YEARS} of the ${NORMAL_TO - NORMAL_FROM + 1} years ${NORMAL_FROM}-${NORMAL_TO} in the NASA POWER series, so there is no average to compare with`;
  out.push(tPts.length ? { ...ids.temp, ...base, unit: '°C', points: tPts, about: WEATHER_ABOUT.temp } : { ...ids.temp, reason: 'NASA POWER gave no temperature for this point' });
  out.push(tAnom.length ? { ...ids.tempAnom, ...base, unit: '°C', points: tAnom, about: WEATHER_ABOUT.tempAnom } : { ...ids.tempAnom, reason: tPts.length ? noNormal : 'NASA POWER gave no temperature for this point' });
  out.push(rPts.length ? { ...ids.rain, ...base, unit: 'mm', points: rPts, about: WEATHER_ABOUT.rain } : { ...ids.rain, reason: 'NASA POWER gave no rainfall for this point' });
  out.push(rPct.length ? { ...ids.rainPct, ...base, unit: '% of normal', points: rPct, about: WEATHER_ABOUT.rainPct } : { ...ids.rainPct, reason: rPts.length ? noNormal : 'NASA POWER gave no rainfall for this point' });
  return out;
}
